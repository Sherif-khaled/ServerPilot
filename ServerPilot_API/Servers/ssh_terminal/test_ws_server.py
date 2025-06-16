import pytest
import asyncio
import websockets
import json
import subprocess
import time
import os
import signal
import socket

# Define server address
HOST = "127.0.0.1"
PORT = 8000
URI = f"ws://{HOST}:{PORT}/ws/servers/1/ssh"

@pytest.fixture(scope="module")
def fastapi_server(module_mocker):
    """
    Starts the FastAPI server with a mocked SSHManager and unbuffered output.
    """
    # Mock the connect method to simulate a successful connection.
    async def mock_connect(self, *args, **kwargs):
        self.connected = True
        return True
    module_mocker.patch('ServerPilot_API.Servers.ssh_terminal.ws_server.SSHManager.connect', side_effect=mock_connect, autospec=True)

    # Mock the receive method to yield a predictable response.
    async def mock_receive(self, *args, **kwargs):
        yield 'hello world'
    module_mocker.patch('ServerPilot_API.Servers.ssh_terminal.ws_server.SSHManager.receive', side_effect=mock_receive, autospec=True)

    # Mock the send method to be an async no-op, as it's awaited by the server.
    async def mock_send(self, *args, **kwargs):
        pass
    module_mocker.patch('ServerPilot_API.Servers.ssh_terminal.ws_server.SSHManager.send', side_effect=mock_send, autospec=True)

    # Use 'python -u' to force unbuffered output from the server process.
    env = os.environ.copy()
    env["MOCK_SSH_MANAGER"] = "1"
    command = ["python", "-u", "-m", "uvicorn", "ServerPilot_API.Servers.ssh_terminal.ws_server:app", "--host", HOST, "--port", str(PORT)]
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    print(f"\n[DEBUG] Project Root: {project_root}")
    print(f"[DEBUG] Uvicorn Command: {' '.join(command)}")
    server_process = subprocess.Popen(command, cwd=project_root, preexec_fn=os.setsid, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Poll for server readiness.
    for _ in range(20):
        time.sleep(0.5)
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex((HOST, PORT)) == 0:
                print(f"Server is up on {HOST}:{PORT}")
                yield
                break
    else:
        os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)
        pytest.fail("FastAPI server failed to start.")

    # Teardown
    print("\nTearing down server...")
    os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)
    server_process.wait(timeout=5)
    print("Server stopped.")

# @pytest.mark.asyncio
# async def test_websocket_flow(fastapi_server):
#     """
#     Tests the full WebSocket flow with a mocked SSH backend.
#     """
#     try:
#         async with websockets.connect(URI, open_timeout=5) as websocket:
#             # 1. Send connection details to trigger the mocked connection.
#             await websocket.send(json.dumps({
#                 "host": "mock_host",
#                 "username": "mock_user",
#                 "password": "mock_pass"
#             }))

#             # 2. The server's background task should now run, call the mocked `receive`,
#             #    and send the response back to us.
#             response = await asyncio.wait_for(websocket.recv(), timeout=10)
#             data = json.loads(response)

#             assert data['type'] == 'output'
#             assert 'hello world' in data['output']

#             # 3. Test sending a command to the server.
#             await websocket.send("some command\n")
#             # No response is expected here as `send` is mocked.

#     except Exception as e:
#         pytest.fail(f"Test failed with an unexpected error: {e}")

