import asyncio
import json
import asyncssh
import logging
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from ..models import Server
from typing import Optional

class SshConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        self.logger = logging.getLogger(__name__)
        super().__init__(*args, **kwargs)
        self.ssh_connection: Optional[asyncssh.SSHClientConnection] = None
        self.ssh_session: Optional[asyncssh.SSHClientSession] = None
        self.ssh_stdin: Optional[asyncssh.SSHWriter] = None
        self.ssh_stdout: Optional[asyncssh.SSHReader] = None
        self.ssh_stderr: Optional[asyncssh.SSHReader] = None
        self.stdout_task: Optional[asyncio.Task] = None
        self.stderr_task: Optional[asyncio.Task] = None
        self._closing = False
        self._send_lock = asyncio.Lock()
        self._cleanup_lock = asyncio.Lock()

    async def connect(self):
        self.logger.info("CONSUMER LOG: SshConsumer.connect() called.")
        self.user = self.scope.get("user")
        
        if not self.user or not self.user.is_authenticated:
            self.logger.warning("Unauthenticated user tried to connect. Closing connection.")
            await self.accept() # Accept to send a message
            await self.safe_send_json({'type': 'error', 'message': 'Authentication failed.'})
            await self.close()
            return

        try:
            self.server_id = self.scope['url_route']['kwargs']['server_id']
            self.server = await self.get_server_instance()
        except (KeyError, Server.DoesNotExist):
            self.logger.warning(f"User {self.user.username} tried to access an invalid or unauthorized server.")
            await self.accept()
            await self.safe_send_json({'type': 'error', 'message': 'Server not found or access denied.'})
            await self.close()
            return
        
        if not self.server:
            self.logger.warning(f"User {self.user.username} denied access to server {self.server_id}.")
            await self.accept()
            await self.safe_send_json({'type': 'error', 'message': 'Access to server denied.'})
            await self.close()
            return

        await self.accept()
        self.logger.info(f"WebSocket connected for user {self.user.username} to server {self.server.id}")
        
        conn_details = await self.get_ssh_details_from_db()
        asyncio.create_task(self.start_ssh_session(conn_details))

    async def disconnect(self, close_code):
        self.logger.info(f"CONSUMER LOG: SshConsumer.disconnect() called with close_code: {close_code}")
        self._closing = True
        
        async with self._cleanup_lock:
            await self._cleanup_tasks()
            await self.close_ssh_resources(notify_client=False)
        
        await super().disconnect(close_code)
        self.logger.info("CONSUMER LOG: SshConsumer.disconnect() finished.")

    async def _cleanup_tasks(self):
        """Properly cleanup background tasks"""
        tasks_to_cleanup = []
        
        if self.stdout_task:
            tasks_to_cleanup.append(self.stdout_task)
        if self.stderr_task:
            tasks_to_cleanup.append(self.stderr_task)
        
        if tasks_to_cleanup:
            self.logger.info(f"Cleaning up {len(tasks_to_cleanup)} tasks: {[t.get_name() for t in tasks_to_cleanup if t]}")
            
            for task in tasks_to_cleanup:
                if task and not task.done(): # Only cancel if task exists and not already done
                    self.logger.info(f"Cancelling task {task.get_name()}")
                    task.cancel()
            
            self.logger.info(f"Gathering tasks: {[t.get_name() for t in tasks_to_cleanup if t]}")
            results = await asyncio.gather(*tasks_to_cleanup, return_exceptions=True)
            self.logger.info(f"Gather results: {results}")

            for i, task in enumerate(tasks_to_cleanup):
                if not task: continue
                res = results[i]
                log_msg = f"Post-gather: Task {task.get_name()} | Done: {task.done()} | Cancelled: {task.cancelled()}"
                if isinstance(res, Exception):
                    log_msg += f" | Result: Exception {type(res).__name__}: {str(res)}"
                else:
                    log_msg += f" | Result: {res}"
                self.logger.info(log_msg)
            
            self.logger.info("Yielding to event loop once more after task cleanup.")
            await asyncio.sleep(0) # Give event loop a chance to fully settle tasks

        self.stdout_task = None
        self.stderr_task = None

    async def receive_json(self, content):
        if self._closing:
            return
            
        self.logger.info(f"SshConsumer.receive_json() called with content: {content}")
        action = content.get("action")
        data = content.get("data", {})

        try:
            if action == "send_ssh_data":
                if self.ssh_stdin and not self.ssh_stdin.is_closing():
                    command_to_send = data.get("command", "")
                    await self.handle_ssh_data(command_to_send)
                else:
                    self.logger.warning("Cannot send data, SSH stdin is not available or closing.")
                    await self.safe_send_json({'type': 'error', 'message': 'SSH stdin not available for writing.'})
            elif action == "resize_pty":
                await self.handle_resize_pty(data)
        except Exception as e:
            self.logger.exception(f"Error in receive_json: {e}")
            await self.safe_send_json({'type': 'error', 'message': f'Error processing request: {str(e)}'})

    async def receive(self, text_data=None, bytes_data=None):
        if self._closing:
            return
            
        if text_data:
            try:
                data = json.loads(text_data)
                await self.receive_json(data)
            except json.JSONDecodeError:
                self.logger.exception("Invalid JSON received.")
                await self.safe_send_json({'type': 'error', 'message': 'Invalid JSON received.'})
        elif bytes_data:
            self.logger.warning("Received binary data, not supported.")
            await self.safe_send_json({'type': 'error', 'message': 'Binary data not supported.'})

    async def handle_ssh_data(self, data_str):
        self.logger.info(f"Sending data to SSH: {data_str}")
        if not self.ssh_stdin or self.ssh_stdin.is_closing():
            self.logger.warning("Cannot send data, SSH stdin is not available or closing.")
            await self.safe_send_json({'type': 'error', 'message': 'SSH stdin not available for writing.'})
            return

        full_command_str = data_str # Frontend now sends the newline

        try:
            underlying_channel_encoding = self.ssh_stdin._chan._encoding

            if underlying_channel_encoding:
                self.logger.info(f"SSH Writing STR to stdin (channel encoding: {underlying_channel_encoding}): {full_command_str!r}")
                self.ssh_stdin.write(full_command_str)
            else:
                payload = full_command_str.encode('utf-8')
                self.logger.info(f"SSH Writing BYTES to stdin (channel has no encoding): {payload!r}")
                self.ssh_stdin.write(payload)
            
            await self.ssh_stdin.drain()
        except Exception as e:
            self.logger.error(f"Error sending SSH data: {e}", exc_info=True)
            await self.safe_send_json({'type': 'error', 'message': f'Error sending SSH data: {str(e)}'})

    async def handle_resize_pty(self, resize_data):
        self.logger.info(f"Handling PTY resize: {resize_data}")
        if not self.ssh_session or self.ssh_session.is_closing():
            await self.safe_send_json({'type': 'error', 'message': 'SSH session not active for PTY resize.'})
            return

        try:
            rows = resize_data.get('rows', 24)
            cols = resize_data.get('cols', 80)
            width_pixels = resize_data.get('width_pixels', 0)
            height_pixels = resize_data.get('height_pixels', 0)
            self.ssh_session.change_terminal_size(cols, rows, width_pixels, height_pixels)
            await self.safe_send_json({'type': 'status', 'message': f'PTY resized to {cols}x{rows}.'})
        except Exception as e:
            self.logger.error(f"Error resizing PTY: {e}")
            await self.safe_send_json({'type': 'error', 'message': f'Error resizing PTY: {str(e)}'})

    async def start_ssh_session(self, conn_details):
        self.logger.info(f"Starting SSH session with: {conn_details}")
        host = conn_details.get('host')
        port = conn_details.get('port', 22)
        username = conn_details.get('username')
        password = conn_details.get('password')
        client_keys = conn_details.get('client_keys')

        if not all([host, username]):
            await self.safe_send_json({'type': 'error', 'message': 'Host and username are required.'})
            return

        try:
            await self.close_ssh_resources(notify_client=False)

            self.logger.info(f"Connecting to {host}:{port} as {username}")
            self.ssh_connection = await asyncio.wait_for(
                asyncssh.connect(
                    host, 
                    port=port, 
                    username=username, 
                    password=password, 
                    known_hosts=None,
                    client_keys=client_keys
                ),
                timeout=10
            )
            await self.safe_send_json({'type': 'status', 'message': 'SSH connection successful. Opening session...'})

            opened_streams = await self.ssh_connection.open_session(
                term_type='xterm-color',
                term_size=(80, 24),
                request_pty=True
            )

            if isinstance(opened_streams[0], asyncssh.SSHClientChannel):
                self.logger.info("PTY session channel established.")
                self.ssh_session = opened_streams[0]
                self.ssh_stdin = opened_streams[1]
                self.ssh_stdout = opened_streams[2]
                self.ssh_stderr = self.ssh_session.stderr
            elif len(opened_streams) == 3 and isinstance(opened_streams[0], asyncssh.SSHWriter):
                self.logger.warning("Failed to get PTY session channel, got direct streams. PTY-specific features like resize might not work.")
                self.ssh_session = None
                self.ssh_stdin = opened_streams[0]
                self.ssh_stdout = opened_streams[1]
                self.ssh_stderr = opened_streams[2]
            else:
                self.logger.error(f"Unexpected return type or structure from open_session: {opened_streams}")
                await self.close_ssh_resources(notify_client=False)
                raise TypeError("Unknown return structure from asyncssh.open_session")

            await self.safe_send_json({'type': 'status', 'message': 'SSH session established.'})

            self.stdout_task = asyncio.create_task(
                self.stream_ssh_output(self.ssh_stdout, 'stdout'),
                name='ssh_stdout_stream'
            )
            self.stderr_task = asyncio.create_task(
                self.stream_ssh_output(self.ssh_stderr, 'stderr'),
                name='ssh_stderr_stream'
            )

        except asyncssh.PermissionDenied as e:
            self.logger.error(f"Permission denied: {e}")
            await self.safe_send_json({'type': 'error', 'message': f'SSH permission denied: {str(e)}'})
            await self.close_ssh_resources()
        except asyncssh.ConnectionLost as e:
            self.logger.error(f"Connection lost: {e}")
            await self.safe_send_json({'type': 'error', 'message': f'SSH connection lost: {str(e)}'})
            await self.close_ssh_resources()
        except ConnectionRefusedError:
            self.logger.error(f"Connection refused by {host}:{port}")
            await self.safe_send_json({'type': 'error', 'message': f'SSH connection refused by {host}:{port}.'})
            await self.close_ssh_resources()
        except asyncio.TimeoutError:
            self.logger.error(f"Connection timeout to {host}:{port}")
            await self.safe_send_json({'type': 'error', 'message': f'SSH connection timeout to {host}:{port}.'})
            await self.close_ssh_resources()
        except Exception as e:
            self.logger.exception(f"Unexpected error in start_ssh_session: {e}")
            await self.safe_send_json({'type': 'error', 'message': f'Unexpected error: {str(e)}'})
            await self.close_ssh_resources()

    async def stream_ssh_output(self, stream, stream_name):
        self.logger.info(f"Starting {stream_name} streaming task")
        try:
            async for data in stream:
                if self._closing:
                    self.logger.info(f"{stream_name} stream stopping due to closing")
                    break
                    
                try:
                    if isinstance(data, bytes):
                        decoded_data = data.decode(errors='replace')
                    elif isinstance(data, str):
                        decoded_data = data
                    else:
                        self.logger.warning(f"Unexpected data type in {stream_name}: {type(data)}")
                        continue
                    
                    await self.safe_send_json({'type': stream_name, 'data': decoded_data})
                    await asyncio.sleep(0.01)
                except Exception as e:
                    self.logger.error(f"Error processing {stream_name} data: {e}")
                    
        except asyncio.CancelledError:
            self.logger.info(f"{stream_name} streaming task cancelled")
            raise
        except (asyncssh.ConnectionLost, asyncssh.DisconnectError) as e:
            self.logger.warning(f"{stream_name} connection lost: {e}")
            if not self._closing:
                await self.safe_send_json({'type': 'status', 'message': f'{stream_name} stream closed.'})
        except Exception as e:
            self.logger.exception(f"Error in {stream_name} stream: {e}")
            if not self._closing:
                await self.safe_send_json({'type': 'error', 'message': f'{stream_name} stream error: {str(e)}'})
        finally:
            self.logger.info(f"{stream_name} streaming task ended")

    async def close_ssh_resources(self, notify_client=False, message=None):
        async with self._cleanup_lock:
            await self._cleanup_tasks()
            
            if self.ssh_connection and not self.ssh_connection.is_closed():
                try:
                    self.ssh_connection.close()
                    await asyncio.wait_for(self.ssh_connection.wait_closed(), timeout=4.5)
                    self.logger.info("SSH connection closed")
                except asyncio.TimeoutError:
                    self.logger.warning("Timeout waiting for SSH connection to close")
                except Exception as e:
                    self.logger.error(f"Error closing SSH connection: {e}")
            
            self.ssh_session = None
            self.ssh_stdin = None
            self.ssh_stdout = None
            self.ssh_stderr = None
            self.ssh_connection = None

            if notify_client and message and not self._closing:
                await self.safe_send_json({'type': 'status', 'message': message})

    async def safe_send_json(self, data):
        """Thread-safe JSON sending with error handling"""
        if self._closing:
            return
            
        async with self._send_lock:
            try:
                await self.send(text_data=json.dumps(data))
            except Exception as e:
                self.logger.error(f"Error sending WebSocket message: {e}")

    @database_sync_to_async
    def get_server_instance(self):
        try:
            server = Server.objects.select_related('customer__owner').get(pk=self.server_id)
            if server.customer.owner == self.user:
                return server
            return None
        except Server.DoesNotExist:
            return None

    @database_sync_to_async
    def get_ssh_details_from_db(self):
        details = {
            'host': str(self.server.server_ip),
            'port': self.server.ssh_port,
        }
        if self.server.login_using_root:
            details['username'] = 'root'
            details['password'] = self.server.ssh_root_password
            details['client_keys'] = None
        else:
            details['username'] = self.server.ssh_user
            details['password'] = self.server.ssh_password
            if self.server.ssh_key:
                details['client_keys'] = [asyncssh.import_private_key(self.server.ssh_key)]
                details['password'] = None # Prefer key over password
            else:
                 details['client_keys'] = None
        
        return details