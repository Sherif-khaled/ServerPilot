# SSH WebSocket Server (ws_server.py)

This service exposes a FastAPI WebSocket endpoint that authenticates clients with JWT and proxies an interactive SSH session to a target server. It lives in:

- `ServerPilot_API/Servers/ssh_terminal/ws_server.py`

It is containerized with the `Dockerfile` in the same directory and can be run locally with the provided `docker-compose.yml` at the repository root.

## Endpoint

- URL: `/ws/servers/{server_id}/ssh`
- Protocol: WebSocket
- Subprotocol (recommended): `jwt`
- Auth: Bearer JWT (via WebSocket subprotocol or Authorization header or `?token=` query param)

The server authenticates your JWT using `JWT_SECRET` (HMAC) and `JWT_ALGORITHM` (default `HS256`). After authentication, it establishes an SSH session based on a server entry or on initial client-provided parameters.

## Environment Variables

- `JWT_SECRET` or `JWT_SECRET_FILE` (required)
  - Provide the signing key used by your JWT issuer. Prefer `JWT_SECRET_FILE` to keep secrets out of env/process list.
- `JWT_ALGORITHM` (optional, default `HS256`)
  - Must match your issuer. Common options are `HS256`, `HS384`, `HS512`.
- `ALLOWED_ORIGINS` (optional, default `*`)
  - Comma-separated list of allowed Origins for browsers. Use explicit domains in production.
- `MAX_REQS_PER_MINUTE` (optional, default `30`)
  - Simple IP-based rate limit for connection attempts.
- `MAX_CONCURRENT_CONNECTIONS_PER_SERVER` (optional, default `3`)
  - Limits concurrent WS connections to a single `server_id`.
- `WEBSOCKET_PING_INTERVAL` (optional, default `20` seconds)
  - Server-initiated ping to keep connections alive and detect stalled clients.

## Secrets Handling

Do NOT bake secrets into the Docker image. The app supports the `*_FILE` pattern:

- Mount a file containing the secret and set `JWT_SECRET_FILE` to its path.

Example with Docker Compose (see `docker-compose.yml` at repo root):

```yaml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret

services:
  ws-ssh:
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
    secrets:
      - jwt_secret
```

Generate a strong secret:

```bash
mkdir -p secrets
openssl rand -base64 48 > secrets/jwt_secret
chmod 600 secrets/jwt_secret
```

## Building and Running with Docker Compose

At the repository root:

```bash
# 1) Create a strong JWT secret
mkdir -p secrets
openssl rand -base64 48 > secrets/jwt_secret

# 2) Build and start
docker compose up --build
```

The service listens on `localhost:5000` by default (mapped from the container).

> Note: Provide your own JWTs signed with the same secret/algorithm. The service will refuse to start if it cannot read the JWT secret.

## WebSocket Authentication Methods

The server tries the following (in order):

1. WebSocket subprotocol header: `Sec-WebSocket-Protocol: jwt, <token>`
2. `Authorization: Bearer <token>` header
3. `?token=<token>` query parameter

On success, `ws_server.py` verifies the token via PyJWT and proceeds to accept the WebSocket.

## Selecting the SSH Target

- Built-in demo store (`server_store`) includes a placeholder entry for `server_id = 1`.
- You can provide connection parameters in the first 10 seconds after connect as a JSON message:

```json
{
  "type": "cmd",
  "payload": "echo hello && whoami\n"
}
```

Or for initial SSH parameters (host/username/password or private_key) you can send an initial JSON message like:

```json
{
  "host": "203.0.113.10",
  "port": 22,
  "username": "deploy",
  "password": "your-password"  // or "private_key": "-----BEGIN ..."
}
```

Note: Sending private keys over WebSocket is discouraged. Prefer retrieving keys from a secure store server-side.

## Client Examples

### JavaScript (browser)

```js
// Assume you have a JWT from your auth backend
const token = "<your.jwt.here>";
const url = "ws://localhost:5000/ws/servers/1/ssh";

// Use subprotocol to pass JWT in a way compatible with browsers
const ws = new WebSocket(url, ["jwt", token]);

ws.onopen = () => {
  console.log("connected");
  // Send a command
  ws.send(JSON.stringify({ type: "cmd", payload: "echo hello\\n" }));
};

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.type === "output") {
    console.log("SSH:", msg.output);
  }
};

ws.onclose = () => console.log("closed");
```

### Python (websockets)

```python
import asyncio
import websockets
import json

async def main():
    token = "<your.jwt.here>"
    uri = "ws://localhost:5000/ws/servers/1/ssh"
    async with websockets.connect(uri, subprotocols=["jwt", token]) as ws:
        await ws.send(json.dumps({"type": "cmd", "payload": "echo hello\\n"}))
        while True:
            msg = await ws.recv()
            print("recv:", msg)

asyncio.run(main())
```

## Generating a JWT for Testing

Using Python and PyJWT:

```python
import jwt, time
secret = open("secrets/jwt_secret").read().strip()
now = int(time.time())
payload = {
  "sub": "admin@example.com",
  "iat": now,
  "exp": now + 3600,
}
print(jwt.encode(payload, secret, algorithm="HS256"))
```

Ensure `JWT_ALGORITHM` in the container matches the algorithm you use to sign the token.

## CORS / Origins

`ALLOWED_ORIGINS` controls which browser origins may connect cross-origin. Set explicit domains in production, for example:

```
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

## Notes on Hardening

- Enforce strict origins instead of `*` in production.
- Avoid password-based SSH; prefer keys sourced from a secure server-side store.
- Track/limit connections and rate limits via the provided environment variables.
- Terminate TLS at a reverse proxy (Traefik/Nginx) and forward to the container.
