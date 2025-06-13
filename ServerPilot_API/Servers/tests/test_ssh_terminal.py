import asyncio
import asyncssh
from unittest.mock import patch, AsyncMock, Mock

from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase, override_settings
from channels.db import database_sync_to_async

from ServerPilot_API.Customers.models import Customer, CustomerType
from ServerPilot_API.Servers.models import Server
from serverpilot_project.asgi import application

User = get_user_model()

@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }
)
@patch('ServerPilot_API.Servers.ssh_terminal.consumers.asyncssh.connect', new_callable=AsyncMock)
@patch('ServerPilot_API.Servers.ssh_terminal.consumers.asyncssh.import_private_key')
class SshTerminalConsumerTest(TransactionTestCase):

    @database_sync_to_async
    def create_user(self, username, password, email):
        return User.objects.create_user(username=username, password=password, email=email)

    @database_sync_to_async
    def create_customer_type(self, name):
        return CustomerType.objects.create(name=name)

    @database_sync_to_async
    def create_customer(self, first_name, last_name, email, owner, customer_type):
        return Customer.objects.create(first_name=first_name, last_name=last_name, email=email, owner=owner, customer_type=customer_type)

    @database_sync_to_async
    def create_server(self, customer, ip):
        return Server.objects.create(
            customer=customer, server_ip=ip, ssh_port=22,
            login_using_root=True, ssh_root_password="testpassword"
        )

    async def _mock_stream_from_queue(self, queue):
        while True:
            data = await queue.get()
            if data is None: # Sentinel for stopping
                break
            yield data

    async def _setup_mocks_and_db(self, mock_import_private_key, mock_connect):
        self.mock_connect = mock_connect
        self.mock_import_private_key = mock_import_private_key
        self.mock_conn = AsyncMock()
        self.mock_session = AsyncMock(spec=asyncssh.SSHClientChannel)
        self.mock_stdin = AsyncMock()
        self.mock_stdout = AsyncMock()
        self.mock_stderr = AsyncMock()

        self.mock_conn.is_closed.return_value = False
        self.mock_conn.open_session = AsyncMock(return_value=(self.mock_session, self.mock_stdin, self.mock_stdout))
        self.mock_session.is_closing = Mock(return_value=False)
        self.mock_session.stderr = self.mock_stderr
        self.mock_stdin.is_closing = Mock(return_value=False)
        self.mock_connect.return_value = self.mock_conn
        self.mock_import_private_key.side_effect = lambda key_str: f"MOCK_KEY_FOR:{key_str[:10]}"
        
        self.stdout_queue = asyncio.Queue()
        self.stderr_queue = asyncio.Queue()
        self.mock_stdout.__aiter__ = lambda _: self._mock_stream_from_queue(self.stdout_queue)
        self.mock_stderr.__aiter__ = lambda _: self._mock_stream_from_queue(self.stderr_queue)

        await self.stdout_queue.put(b'ssh_prompt> ')

        self.user = await self.create_user("testuser", "password", "testuser@example.com")
        self.customer_type = await self.create_customer_type("Test Type")
        self.customer = await self.create_customer("Test", "Customer", "test@example.com", self.user, self.customer_type)
        self.server = await self.create_server(self.customer, "1.2.3.4")

    async def test_successful_connection_and_prompt(self, mock_import_private_key, mock_connect):
        await self._setup_mocks_and_db(mock_import_private_key, mock_connect)

        communicator = WebsocketCommunicator(
            application, f"/ws/servers/{self.server.id}/ssh/", headers=[(b"origin", b"http://testserver")]
        )
        communicator.scope['user'] = self.user
        
        connected, _ = await communicator.connect()
        self.assertTrue(connected, "WebSocket connection failed")

        self.assertEqual(await communicator.receive_json_from(), {'type': 'status', 'message': 'SSH connection successful. Opening session...'})
        self.assertEqual(await communicator.receive_json_from(), {'type': 'status', 'message': 'SSH session established.'})
        self.assertEqual(await communicator.receive_json_from(), {'type': 'stdout', 'data': 'ssh_prompt> '})

        await communicator.disconnect()

    async def test_send_command_and_receive_output(self, mock_import_private_key, mock_connect):
        await self._setup_mocks_and_db(mock_import_private_key, mock_connect)

        communicator = WebsocketCommunicator(
            application, f"/ws/servers/{self.server.id}/ssh/", headers=[(b"origin", b"http://testserver")]
        )
        communicator.scope['user'] = self.user
        await communicator.connect()

        # Consume status messages and initial prompt
        self.assertEqual(await communicator.receive_json_from(), {'type': 'status', 'message': 'SSH connection successful. Opening session...'})
        self.assertEqual(await communicator.receive_json_from(), {'type': 'status', 'message': 'SSH session established.'})
        self.assertEqual(await communicator.receive_json_from(), {'type': 'stdout', 'data': 'ssh_prompt> '})

        # Send command and assert it was written
        await communicator.send_json_to({"action": "send_ssh_data", "data": {"command": "ls\n"}})
        await asyncio.sleep(0.01)  # Allow consumer to process the message
        self.mock_stdin.write.assert_called_once_with("ls\n")

        # Simulate command output
        await self.stdout_queue.put(b'output from ls\n')
        await self.stdout_queue.put(b'ssh_prompt> ')

        # Receive and assert output
        self.assertEqual(await communicator.receive_json_from(), {'type': 'stdout', 'data': 'output from ls\n'})
        self.assertEqual(await communicator.receive_json_from(), {'type': 'stdout', 'data': 'ssh_prompt> '})

        # Clean up
        await self.stdout_queue.put(None) # Stop the mock stream
        await communicator.disconnect()

    async def test_resize_pty(self, mock_import_private_key, mock_connect):
        await self._setup_mocks_and_db(mock_import_private_key, mock_connect)

        communicator = WebsocketCommunicator(
            application, f"/ws/servers/{self.server.id}/ssh/", headers=[(b"origin", b"http://testserver")]
        )
        communicator.scope['user'] = self.user
        await communicator.connect()
        await communicator.receive_json_from()
        await communicator.receive_json_from()
        await communicator.receive_json_from()

        resize_data = {"rows": 40, "cols": 120, "width_pixels": 800, "height_pixels": 600}
        await communicator.send_json_to({"action": "resize_pty", "data": resize_data})
        self.assertEqual(await communicator.receive_json_from(), {'type': 'status', 'message': 'PTY resized to 120x40.'})
        self.mock_session.change_terminal_size.assert_called_once_with(120, 40, 800, 600)

        await communicator.disconnect()

    async def test_unauthenticated_connection_is_rejected(self, mock_import_private_key, mock_connect):
        await self._setup_mocks_and_db(mock_import_private_key, mock_connect)
        from django.contrib.auth.models import AnonymousUser
        communicator = WebsocketCommunicator(
            application, f"/ws/servers/{self.server.id}/ssh/", headers=[(b"origin", b"http://testserver")]
        )
        communicator.scope['user'] = AnonymousUser()

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        self.assertEqual(await communicator.receive_json_from(), {'type': 'error', 'message': 'Authentication failed.'})

        close_event = await communicator.receive_output()
        self.assertEqual(close_event['type'], 'websocket.close')

    async def test_unauthorized_server_access_is_rejected(self, mock_import_private_key, mock_connect):
        await self._setup_mocks_and_db(mock_import_private_key, mock_connect)
        other_user = await self.create_user("otheruser", "password", "otheruser@example.com")
        other_customer = await self.create_customer("Other", "Customer", "other@example.com", other_user, self.customer_type)
        other_server = await self.create_server(other_customer, "8.8.8.8")

        communicator = WebsocketCommunicator(
            application, f"/ws/servers/{other_server.id}/ssh/", headers=[(b"origin", b"http://testserver")]
        )
        communicator.scope['user'] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        self.assertEqual(await communicator.receive_json_from(), {'type': 'error', 'message': 'Access to server denied.'})

        close_event = await communicator.receive_output()
        self.assertEqual(close_event['type'], 'websocket.close')
