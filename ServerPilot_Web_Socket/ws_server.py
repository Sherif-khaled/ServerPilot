# ws_server_hardening.py
import os
import time
import asyncio
import json
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncssh
import jwt  # PyJWT

# ---------- CONFIG ----------
def _get_env_secret(name: str) -> Optional[str]:
    """Return secret value from env or from a file path specified via NAME_FILE.

    This enables using Docker/K8s secrets without exposing them in the image layers.
    """
    file_path = os.environ.get(f"{name}_FILE")
    if file_path:
        try:
            with open(file_path, "r") as f:
                return f.read().strip()
        except Exception as e:
            raise RuntimeError(f"Failed to read secret from {name}_FILE={file_path}: {e}")
    return os.environ.get(name)

JWT_SECRET = _get_env_secret("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be provided via environment or a mounted secret file (JWT_SECRET_FILE).")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
# Comma-separated list like: https://app.example.com,https://admin.example.com or * to allow all
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
JWT_ISSUER = os.environ.get("JWT_ISSUER")
JWT_AUDIENCE = os.environ.get("JWT_AUDIENCE")
MAX_REQS_PER_MINUTE = int(os.environ.get("MAX_REQS_PER_MINUTE", "30"))
MAX_CONCURRENT_CONNECTIONS_PER_SERVER = int(os.environ.get("MAX_CONCURRENT_CONNECTIONS_PER_SERVER", "3"))
WEBSOCKET_PING_INTERVAL = int(os.environ.get("WEBSOCKET_PING_INTERVAL", "20"))  # seconds

# ---------- LOGGING ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ws_ssh_proxy")

def mask_secret(value: Optional[str]) -> str:
    if not value:
        return "<none>"
    if len(value) <= 6:
        return "*" * len(value)
    return value[:3] + "***" + value[-3:]

# ---------- FASTAPI APP ----------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

auth_scheme = HTTPBearer(auto_error=False)

# ---------- MOCK SECURE STORE ----------
# Replace this with real vault/db lookup. DO NOT keep secrets in code.
# The structure:
# server_store = {
#   server_id: {
#       "host": "1.2.3.4",
#       "port": 22,
#       "username": "user",
#       "auth_method": "key" or "password",
#       "private_key": "-----BEGIN ...",   # if key
#       "password": "...",                 # if password (discouraged)
#       "allowed_clients": ["client_a", "client_b_jwt_subs"]  # optional authorization
#   }
# }
server_store: Dict[int, Dict[str, Any]] = {
    1: {
        "host": "192.0.2.10",
        "port": 22,
        "username": "deploy",
        "auth_method": "key",
        "private_key": os.environ.get("SAMPLE_PRIVATE_KEY", None),  # for demo only
        "allowed_clients": ["admin@example.com"]  # matched against JWT "sub" claim
    },
    # Add entries or replace with Vault/DB retrieval
}

# Track concurrent connections per server_id
connections_count: Dict[int, int] = {}
# Simple rate limiter per IP
rate_limits: Dict[str, list] = {}  # ip -> [timestamps]


# ---------- UTIL ----------
def check_rate_limit(client_ip: str):
    now = time.time()
    window = 60
    timestamps = rate_limits.setdefault(client_ip, [])
    # Remove old entries
    while timestamps and timestamps[0] <= now - window:
        timestamps.pop(0)
    if len(timestamps) >= MAX_REQS_PER_MINUTE:
        return False
    timestamps.append(now)
    return True

def get_client_ip(websocket: WebSocket) -> str:
    # Trusted proxy headers may be needed in production
    client = websocket.client
    if client:
        return f"{client.host}:{client.port}"
    return "unknown"

def get_server_entry(server_id: int) -> Dict[str, Any]:
    entry = server_store.get(server_id)
    if not entry:
        raise KeyError("server_id not found")
    return entry

async def verify_jwt(credentials: Optional[HTTPAuthorizationCredentials]) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization")
    token = credentials.credentials
    try:
        decode_kwargs = {
            "key": JWT_SECRET,
            "algorithms": [JWT_ALGORITHM],
            "options": {"require": ["exp"]},
        }
        if JWT_AUDIENCE:
            decode_kwargs["audience"] = JWT_AUDIENCE
        if JWT_ISSUER:
            decode_kwargs["issuer"] = JWT_ISSUER
        payload = jwt.decode(token, **decode_kwargs)
        # Minimal checks — extend with exp, aud, iss validation
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def origin_allowed(websocket: WebSocket) -> bool:
    origin = websocket.headers.get("origin")
    if not origin:
        # If no Origin header, be conservative: allow only if '*' configured
        return "*" in ALLOWED_ORIGINS
    if "*" in ALLOWED_ORIGINS:
        return True
    try:
        # Compare full origin string
        return origin in ALLOWED_ORIGINS
    except Exception:
        return False


# ---------- SSH HELPER ----------
class SSHSession:
    def __init__(self, conn: asyncssh.SSHClientConnection, process: asyncssh.SSHClientProcess):
        self.conn = conn
        self.process = process
        self.read_task: Optional[asyncio.Task] = None
        self.alive = True

    async def send(self, data: str):
        if not self.alive:
            raise RuntimeError("session closed")
        # Do not log full content here
        snippet = data.strip().replace("\n","\\n")
        logger.debug(f"SSH send snippet: {snippet[:200]}")
        self.process.stdin.write(data)

    async def receive_loop(self, output_queue: asyncio.Queue):
        try:
            while self.alive:
                data = await self.process.stdout.read(1024)
                if not data:
                    # EOF: remote closed the session
                    logger.info("SSH remote closed stream (EOF)")
                    break
                await output_queue.put(data)
        except asyncio.CancelledError:
            logger.info("SSH receive loop cancelled")
            raise
        except Exception as e:
            logger.exception("Error in SSH receive loop: %s", e)
        finally:
            self.alive = False

    async def close(self):
        self.alive = False
        try:
            if not self.process.stdin.at_eof():
                try:
                    self.process.stdin.write("\x04")  # send EOF (Ctrl-D)
                except Exception:
                    pass
            self.process.close()
        except Exception:
            pass
        try:
            self.conn.close()
            await self.conn.wait_closed()
        except Exception:
            pass


# ---------- WEBSOCKET ENDPOINT ----------
@app.websocket("/ws/servers/{server_id}/ssh")
async def websocket_ssh(
    websocket: WebSocket,
    server_id: int,
):
    # NOTE: Authenticate BEFORE accepting the WebSocket
    client_ip = get_client_ip(websocket)
    logger.info("New websocket connection request: server_id=%s from %s", server_id, client_ip)

    # Validate Origin
    if not origin_allowed(websocket):
        logger.warning("Closing WS before accept due to disallowed Origin: %s", websocket.headers.get("origin"))
        try:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        except Exception:
            pass
        return

    # Rate limit by IP
    if not check_rate_limit(client_ip):
        logger.warning("Closing WS before accept: rate limit exceeded for %s", client_ip)
        try:
            await websocket.close(code=status.WS_1013_TRY_AGAIN_LATER)
        except Exception:
            pass
        return

    # Validate JWT
    try:
        # Build HTTPAuthorizationCredentials manually from header or query param
        # Prefer subprotocol for token: client should send like ['jwt', '<token>']
        token: Optional[str] = None
        subproto_header = websocket.headers.get("sec-websocket-protocol")
        if subproto_header:
            # header format is comma-separated values
            parts = [p.strip() for p in subproto_header.split(",") if p.strip()]
            # Expecting something like ['jwt', '<token>']
            if len(parts) >= 2 and parts[0].lower() == "jwt":
                token = parts[1]
        # Fallbacks: Authorization header, then query string
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()
        if not token:
            token = websocket.query_params.get("token")

        credentials: Optional[HTTPAuthorizationCredentials] = None
        if token:
            credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        payload = await verify_jwt(credentials)
    except HTTPException as e:
        # Close without accepting to avoid establishing session for unauthenticated clients
        logger.warning("Closing WS before accept due to auth error: %s", e.detail)
        try:
            # Some clients expect a close frame; send policy violation code
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        except Exception:
            pass
        return

    jwt_sub = payload.get("sub", "unknown")
    logger.info("Authenticated JWT sub=%s for client=%s", mask_secret(str(jwt_sub)), client_ip)

    # Try to load server entry, but don't hard-fail yet; client may provide explicit connection params
    server_entry: Optional[Dict[str, Any]] = None
    try:
        server_entry = get_server_entry(server_id)
    except KeyError:
        logger.warning("server_id not found in store, will wait up to 10s for client-provided params: %s", server_id)

    # Accept after successful authentication (and CORS/origin checks if applicable)
    # If client offered 'jwt' subprotocol, select it
    accept_subprotocol = None
    subproto_header = websocket.headers.get("sec-websocket-protocol")
    if subproto_header:
        parts = [p.strip() for p in subproto_header.split(",") if p.strip()]
        if parts and parts[0].lower() == "jwt":
            accept_subprotocol = "jwt"
    await websocket.accept(subprotocol=accept_subprotocol)

    # Authorization: check allowed_clients if present (only applicable when server entry exists)
    if server_entry is not None:
        allowed = server_entry.get("allowed_clients")
        if allowed and jwt_sub not in allowed:
            logger.warning("Client %s not authorized for server %s", jwt_sub, server_id)
            await websocket.send_json({"type": "error", "message": "not authorized for this server"})
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    # Limit concurrent connections per server_id
    cnt = connections_count.get(server_id, 0)
    if cnt >= MAX_CONCURRENT_CONNECTIONS_PER_SERVER:
        logger.warning("Too many concurrent connections to server_id %s", server_id)
        await websocket.send_json({"type": "error", "message": "too many concurrent connections to this server"})
        await websocket.close(code=status.WS_1013_TRY_AGAIN_LATER)
        return
    connections_count[server_id] = cnt + 1

    # Prepare SSH auth (allow override from client initial message)
    host: Optional[str] = None
    port: int = 22
    username: Optional[str] = None
    auth_method: str = "key"
    password: Optional[str] = None

    if server_entry is not None:
        host = server_entry.get("host")
        port = server_entry.get("port", 22)
        username = server_entry.get("username")
        auth_method = server_entry.get("auth_method", "key")

    # Optionally receive initial parameters from client (non-blocking with short timeout)
    # Expected JSON: { "host": "...", "port": 22, "username": "...", "password": "..." }
    try:
        init_text = await asyncio.wait_for(websocket.receive_text(), timeout=10)
        try:
            init_obj = json.loads(init_text)
            if isinstance(init_obj, dict) and ("host" in init_obj and "username" in init_obj) and ("password" in init_obj or "private_key" in init_obj):
                host = init_obj.get("host", host)
                port = int(init_obj.get("port", port))
                username = init_obj.get("username", username)
                if "password" in init_obj:
                    password = init_obj.get("password")
                    auth_method = "password"
                elif "private_key" in init_obj:
                    # Not recommended to send keys over WS; keep for completeness
                    server_entry = {**(server_entry or {}), "private_key": init_obj.get("private_key"), "auth_method": "key"}
                    auth_method = "key"
        except json.JSONDecodeError:
            # Not an init control message; push into terminal after connection established
            pass
    except asyncio.TimeoutError:
        # No init message provided; proceed with server_store config
        logger.info("No client init parameters received within 10s; proceeding with server_store configuration")

    if not host or not username:
        logger.warning("Closing WS after accept: missing connection parameters (host or username)")
        await websocket.send_json({"type": "error", "message": "missing connection parameters"})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    logger.info("Attempting SSH connect to %s:%s as %s (auth_method=%s)", host, port, username, auth_method)

    ssh_session: Optional[SSHSession] = None
    # Bounded queue to prevent unbounded memory growth under slow clients
    output_queue: asyncio.Queue = asyncio.Queue(maxsize=200)

    try:
        # Build connection kwargs
        conn_kwargs = dict(host=host, port=port, username=username, known_hosts=None, client_keys=None, password=None)
        if auth_method == "key":
            private_key = server_entry.get("private_key")
            if not private_key:
                raise RuntimeError("private key missing for key auth")
            # AsyncSSH expects a path or loaded key object. Use asyncssh.import_private_key
            key_obj = asyncssh.import_private_key(private_key)
            conn_kwargs["client_keys"] = [key_obj]
        elif auth_method == "password":
            # discouraged; if used, should be kept encrypted in the store
            conn_kwargs["password"] = password or (server_entry.get("password") if server_entry else None)
        else:
            raise RuntimeError("unsupported auth_method")

        # Establish SSH connection
        conn = await asyncssh.connect(**conn_kwargs)
        # Create an interactive shell (pty)
        process = await conn.create_process(term_type="xterm")
        ssh_session = SSHSession(conn, process)

        # Start SSH receive loop
        recv_task = asyncio.create_task(ssh_session.receive_loop(output_queue))

        # Start websocket writer task: forwards SSH -> websocket
        async def writer():
            try:
                while True:
                    data = await output_queue.get()
                    if data is None:
                        break
                    # Send in small chunks to avoid huge JSON messages
                    await websocket.send_json({"type": "output", "output": data})
            except asyncio.CancelledError:
                logger.debug("writer task cancelled")
                raise
            except Exception as e:
                logger.exception("writer task error: %s", e)

        writer_task = asyncio.create_task(writer())

        # Start ping task to ensure client alive
        async def ping_loop():
            try:
                while True:
                    await asyncio.sleep(WEBSOCKET_PING_INTERVAL)
                    await websocket.send_json({"type": "ping"})
            except asyncio.CancelledError:
                raise
            except Exception:
                # If ping fails, this will trigger higher-level cleanup
                logger.info("Ping to client failed or client not responsive")
                try:
                    await websocket.close()
                except Exception:
                    pass

        ping_task = asyncio.create_task(ping_loop())

        # Main receive loop: websocket -> ssh
        while True:
            try:
                text = await asyncio.wait_for(websocket.receive_text(), timeout=WEBSOCKET_PING_INTERVAL * 3)
            except asyncio.TimeoutError:
                # make sure server side still healthy but do not close immediately
                logger.debug("Websocket receive timed out; continuing loop to keep connection")
                continue
            except WebSocketDisconnect:
                logger.info("Client disconnected")
                break

            # allow only short control messages in JSON format or raw input for shell
            try:
                # try parse JSON control messages
                obj = json.loads(text)
                msg_type = obj.get("type")
                if msg_type == "cmd":
                    payload = obj.get("payload", "")
                    # Basic length check
                    if len(payload) > 10000:
                        await websocket.send_json({"type": "error", "message": "command too long"})
                        continue
                    await ssh_session.send(payload)
                elif msg_type == "keepalive":
                    await websocket.send_json({"type": "status", "message": "alive"})
                else:
                    # unknown control, ignore
                    logger.debug("Unknown msg_type from client: %s", str(msg_type)[:100])
            except json.JSONDecodeError:
                # treat as raw input to shell
                await ssh_session.send(text)

    except Exception as e:
        logger.exception("Unhandled error during websocket-ssh session: %s", e)
        # Avoid leaking internal errors to client, send sanitized message
        try:
            await websocket.send_json({"type": "error", "message": "internal server error"})
        except Exception:
            pass
    finally:
        # Cancel tasks & cleanup
        try:
            if 'recv_task' in locals() and not recv_task.done():
                recv_task.cancel()
        except Exception:
            pass
        try:
            if 'writer_task' in locals() and not writer_task.done():
                writer_task.cancel()
        except Exception:
            pass
        try:
            if 'ping_task' in locals() and not ping_task.done():
                ping_task.cancel()
        except Exception:
            pass
        if ssh_session:
            await ssh_session.close()
        # update connection count
        connections_count[server_id] = max(0, connections_count.get(server_id, 1) - 1)
        logger.info("Closed websocket-ssh session for server_id=%s from %s", server_id, client_ip)
