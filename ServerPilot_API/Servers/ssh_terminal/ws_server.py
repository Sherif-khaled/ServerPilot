from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import paramiko
import json
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SSHManager:
    def __init__(self):
        self.ssh = paramiko.SSHClient()
        self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.channel = None
        self.connected = False
        logger.info("SSHManager initialized")

    async def connect(self, host, port, username, password):
        logger.info(f"Attempting to connect to {host}:{port} as {username}")
        try:
            await asyncio.to_thread(
                self.ssh.connect,
                hostname=host,
                port=port,
                username=username,
                password=password,
                timeout=10,
                banner_timeout=20
            )
            self.channel = await asyncio.to_thread(self.ssh.invoke_shell)
            await asyncio.to_thread(self.channel.setblocking, 0)
            self.connected = True
            logger.info("SSH connection successful")
            return True
        except paramiko.AuthenticationException:
            logger.error("Authentication failed")
            return False
        except paramiko.SSHException as e:
            logger.error(f"SSH connection failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during connect: {e}")
            return False

    async def send(self, data):
        if self.channel:
            logger.info(f"Sending data to SSH: {data.strip()}")
            await asyncio.to_thread(self.channel.send, data)

    async def receive(self):
        logger.info("Starting to receive SSH data")
        if self.channel:
            while True:
                if self.channel.recv_ready():
                    data = await asyncio.to_thread(self.channel.recv, 1024)
                    logger.info(f"Received data from SSH: {data.decode('utf-8', 'ignore').strip()}")
                    yield data.decode('utf-8', 'ignore')
                await asyncio.sleep(0.1)

    def close(self):
        logger.info("Closing SSH connection")
        if self.channel:
            self.channel.close()
        self.ssh.close()
        logger.info("SSH connection closed")

# --- MOCK SSHManager for testing ---
class MockSSHManager:
    def __init__(self):
        self.connected = False
        logger.info("MockSSHManager initialized")
    async def connect(self, host, port, username, password):
        logger.info(f"Mock connect to {host}:{port} as {username}")
        self.connected = True
        return True
    async def send(self, data):
        logger.info(f"Mock send: {data.strip()}")
        return None
    async def receive(self):
        logger.info("Mock receive yields 'hello world'")
        yield 'hello world'
    def close(self):
        logger.info("Mock SSH connection closed")

# Factory to select the correct SSHManager
if os.environ.get("MOCK_SSH_MANAGER") == "1":
    SSHManager = MockSSHManager
    logger.info("Using MockSSHManager for all SSH operations.")


@app.websocket("/ws/servers/{server_id}/ssh")
async def websocket_endpoint(websocket: WebSocket, server_id: int):
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for server_id: {server_id}")
    ssh = SSHManager()
    
    try:
        # Wait for connection details with timeout
        try:
            logger.info("Waiting for connection details from client")
            data = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
            config = json.loads(data)
            logger.info(f"Received connection config: {config}")
        except asyncio.TimeoutError:
            logger.warning("Connection setup timeout")
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': 'Connection setup timeout'
            }))
            return
            
        # Validate config
        required = ['host', 'username', 'password']
        if not all(key in config for key in required):
            logger.warning("Missing required connection parameters")
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': 'Missing required connection parameters'
            }))
            return
            
        # Connect to SSH
        logger.info("Connecting to SSH...")
        connected = await ssh.connect(
            host=config['host'],
            port=config.get('port', 22),
            username=config['username'],
            password=config['password']
        )
        
        if not connected:
            logger.error("SSH connection failed")
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': 'SSH connection failed. Check credentials and server availability.'
            }))
            return
        
        logger.info("SSH connection successful. Starting bidirectional communication.")
        # Start bidirectional communication
        asyncio.create_task(handle_ssh_output(websocket, ssh))
        logger.info("Created task for handle_ssh_output")
        
        while True:
            try:
                logger.info("Waiting for data from client...")
                data = await asyncio.wait_for(websocket.receive_text(), timeout=300.0)
                logger.info(f"Received data from client: {data.strip()}")
                await ssh.send(data)
            except asyncio.TimeoutError:
                logger.info("Client keep-alive timeout.")
                await websocket.send_text(json.dumps({
                    'type': 'status',
                    'message': 'Connection kept alive'
                }))
                continue
                
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        if not websocket.client_state == 'DISCONNECTED':
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    finally:
        logger.info("Closing resources in finally block")
        ssh.close()

async def handle_ssh_output(websocket: WebSocket, ssh: SSHManager):
    logger.info("handle_ssh_output task started")
    try:
        async for output in ssh.receive():
            logger.info(f"Forwarding SSH output to client: {output.strip()}")
            await websocket.send_text(json.dumps({
                'type': 'output',
                'output': output
            }))
        logger.info("handle_ssh_output task finished loop")
    except Exception as e:
        logger.error(f"Error in handle_ssh_output: {e}", exc_info=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
