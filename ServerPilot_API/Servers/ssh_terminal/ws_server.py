from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import paramiko
import json

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

    async def connect(self, host, port, username, password):
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
            return True
        except paramiko.AuthenticationException:
            print("Authentication failed")
            return False
        except paramiko.SSHException as e:
            print(f"SSH connection failed: {e}")
            return False
        except Exception as e:
            print(f"Unexpected error: {e}")
            return False

    async def send(self, data):
        if self.channel:
            await asyncio.to_thread(self.channel.send, data)

    async def receive(self):
        if self.channel:
            while True:
                if self.channel.recv_ready():
                    data = await asyncio.to_thread(self.channel.recv, 1024)
                    yield data.decode('utf-8')
                await asyncio.sleep(0.1)

    def close(self):
        if self.channel:
            self.channel.close()
        self.ssh.close()

@app.websocket("/ws/servers/{server_id}/ssh")
async def websocket_endpoint(websocket: WebSocket, server_id: int):
    await websocket.accept()
    ssh = SSHManager()
    
    try:
        # Wait for connection details with timeout
        try:
            data = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
            config = json.loads(data)
        except asyncio.TimeoutError:
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': 'Connection setup timeout'
            }))
            return
            
        # Validate config
        required = ['host', 'username', 'password']
        if not all(key in config for key in required):
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': 'Missing required connection parameters'
            }))
            return
            
        # Connect to SSH
        connected = await ssh.connect(
            host=config['host'],
            port=config.get('port', 22),
            username=config['username'],
            password=config['password']
        )
        
        if not connected:
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': 'SSH connection failed. Check credentials and server availability.'
            }))
            return
            
        # Start bidirectional communication
        asyncio.create_task(handle_ssh_output(websocket, ssh))
        
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=300.0)
                await ssh.send(data)
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({
                    'type': 'status',
                    'message': 'Connection kept alive'
                }))
                continue
                
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.send_text(json.dumps({
            'type': 'error',
            'message': str(e)
        }))
    finally:
        ssh.close()

async def handle_ssh_output(websocket: WebSocket, ssh: SSHManager):
    async for output in ssh.receive():
        await websocket.send_text(json.dumps({
            'type': 'output',
            'output': output
        }))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
