import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:5000/ws/servers/1/ssh"
    
    async with websockets.connect(uri) as websocket:
        # Send connection details
        await websocket.send(json.dumps({
            "host": "167.86.76.14",
            "port": 22,
            "username": "root",
            "password": "2P8KVdli7i1R8w21m2we01"
        }))
        
        # Test sending a command
        await websocket.send("ls\n")
        
        # Receive output
        while True:
            response = await websocket.recv()
            data = json.loads(response)
            if data['type'] == 'output':
                print("Output:", data['output'], end='')
            elif data['type'] == 'error':
                print("Error:", data['message'])
                break

if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(test_websocket())
