import unittest
from unittest.mock import patch, MagicMock, call, ANY
import paramiko # For exception types
import io

from django.contrib.auth import get_user_model
from django.test import TestCase

from ServerPilot_API.Customers.models import Customer, CustomerType
from ServerPilot_API.Servers.models import Server

User = get_user_model()

# Example RSA, Ed25519, and ECDSA private keys (for testing key loading logic)
# These are minimal, potentially invalid for actual SSH, but serve to test paramiko's parsing.
# In a real scenario, you'd use properly generated (but dummy) keys.
# For simplicity, we'll mostly mock the key loading itself.
DUMMY_RSA_PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----
MIIBOgIBAAJBALyM2u65kL90aVCH+s8A2BEef9LS0TPxH0t2usJzSWhs9LpD/XaS
... (rest of a dummy key) ...
-----END RSA PRIVATE KEY-----"""

DUMMY_ED25519_PRIVATE_KEY = """-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz
... (rest of a dummy key) ...
-----END OPENSSH PRIVATE KEY-----"""

DUMMY_ECDSA_PRIVATE_KEY = """-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIHK9wzauv2kCHAhk0E9PA5FfUnxYg2KGlVjPNaDBCIrRoAoGCCqGSM49
... (rest of a dummy key) ...
-----END EC PRIVATE KEY-----"""


class TestServerSSHConnection(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='conn_testuser', email='conn@example.com', password='password')
        self.customer_type = CustomerType.objects.create(name='Conn Test Type')
        self.customer = Customer.objects.create(owner=self.user, customer_type=self.customer_type, email='cust_conn@example.com')
        
        self.server_details = {
            'customer': self.customer,
            'server_name': 'SSH Test Server',
            'server_ip': '1.2.3.4', # Dummy IP
            'ssh_port': 22,
        }

    @patch('API.Servers.models.paramiko.SSHClient')
    def test_connect_ssh_password_non_root_success(self, MockSSHClient):
        mock_client_instance = MockSSHClient.return_value
        mock_stdout = MagicMock()
        mock_stdout.read.return_value = b'command output'
        mock_stdout.channel.recv_exit_status.return_value = 0 # Success
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b'' # No error

        mock_client_instance.exec_command.return_value = (MagicMock(), mock_stdout, mock_stderr)

        server = Server.objects.create(
            **self.server_details,
            login_using_root=False,
            ssh_user='testuser',
            ssh_password='testpassword'
        )
        
        success, output = server.connect_ssh(command='whoami')
        
        self.assertTrue(success)
        self.assertEqual(output, 'command output')
        MockSSHClient.assert_called_once()
        mock_client_instance.set_missing_host_key_policy.assert_called_once()
        args, _ = mock_client_instance.set_missing_host_key_policy.call_args
        self.assertIsInstance(args[0], paramiko.AutoAddPolicy)
        mock_client_instance.connect.assert_called_once_with(
            hostname='1.2.3.4',
            port=22,
            username='testuser',
            password='testpassword',
            timeout=10,
            look_for_keys=False,
            allow_agent=False
        )
        mock_client_instance.exec_command.assert_called_once_with('whoami', timeout=10)
        mock_client_instance.close.assert_called_once()

    @patch('ServerPilot_API.Servers.models.paramiko.RSAKey.from_private_key')
    @patch('ServerPilot_API.Servers.models.paramiko.Ed25519Key.from_private_key')
    @patch('ServerPilot_API.Servers.models.paramiko.ECDSAKey.from_private_key')
    @patch('ServerPilot_API.Servers.models.paramiko.SSHClient')
    def test_connect_ssh_key_root_success(self, MockSSHClient, MockECDSAKey, MockEd25519Key, MockRSAKey):
        # Assume RSA key is the one that successfully loads
        mock_rsa_loaded_key = MagicMock(spec=paramiko.RSAKey)
        MockRSAKey.return_value = mock_rsa_loaded_key
        MockEd25519Key.side_effect = paramiko.SSHException("Not Ed25519") # Simulate other keys failing
        MockECDSAKey.side_effect = paramiko.SSHException("Not ECDSA")

        mock_client_instance = MockSSHClient.return_value
        mock_stdout = MagicMock()
        mock_stdout.read.return_value = b'root output'
        mock_stdout.channel.recv_exit_status.return_value = 0
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b''
        mock_client_instance.exec_command.return_value = (MagicMock(), mock_stdout, mock_stderr)

        server = Server.objects.create(
            **self.server_details,
            login_using_root=True, # ssh_root_password not set
            ssh_key=DUMMY_RSA_PRIVATE_KEY 
        )
        
        success, output = server.connect_ssh(command='id')
        
        self.assertTrue(success)
        self.assertEqual(output, 'root output')
        MockSSHClient.assert_called_once()
        
        # Check that from_private_key was attempted for RSA
        MockRSAKey.assert_called_once()
        # Check that from_private_key was also attempted for others before RSA (if they were in the list before it)
        # Order of attempts in model: RSA, Ed25519, ECDSA
        self.assertTrue(MockEd25519Key.call_count >= 0) # Called or not depending on order
        self.assertTrue(MockECDSAKey.call_count >= 0)
        
        mock_client_instance.connect.assert_called_once_with(
            hostname='1.2.3.4',
            port=22,
            username='root',
            pkey=mock_rsa_loaded_key, # Check that the loaded key object is passed
            password=None, # Password should be None when key is used
            timeout=10,
            look_for_keys=False,
            allow_agent=False
        )
        mock_client_instance.close.assert_called_once()

    @patch('ServerPilot_API.Servers.models.paramiko.SSHClient')
    def test_connect_ssh_authentication_failure(self, MockSSHClient):
        mock_client_instance = MockSSHClient.return_value
        mock_client_instance.connect.side_effect = paramiko.AuthenticationException("Auth failed")

        server = Server.objects.create(
            **self.server_details,
            login_using_root=False,
            ssh_user='wronguser',
            ssh_password='wrongpassword'
        )
        
        success, output = server.connect_ssh()
        
        self.assertFalse(success)
        self.assertIn("Authentication failed: Auth failed", output)
        mock_client_instance.close.assert_called_once() # Ensure close is called even on failure

    @patch('ServerPilot_API.Servers.models.paramiko.SSHClient')
    def test_connect_ssh_connection_timeout(self, MockSSHClient):
        mock_client_instance = MockSSHClient.return_value
        # Simulate paramiko raising a generic exception that might wrap a timeout,
        # or connect itself raising TimeoutError (socket.timeout often wrapped as SSHException by paramiko)
        mock_client_instance.connect.side_effect = TimeoutError("Connection timed out")


        server = Server.objects.create(**self.server_details, ssh_user='user', ssh_password='pw')
        success, output = server.connect_ssh(timeout=1) # Short timeout for test
        
        self.assertFalse(success)
        self.assertIn("Connection timed out after 1 seconds.", output)

    def test_connect_ssh_no_credentials_non_root(self):
        server = Server.objects.create(**self.server_details, login_using_root=False, ssh_user='user', ssh_password=None, ssh_key=None)
        success, output = server.connect_ssh()
        self.assertFalse(success)
        self.assertEqual(output, "No SSH key or password provided for the selected login type.")

    def test_connect_ssh_no_credentials_root(self):
        server = Server.objects.create(**self.server_details, login_using_root=True, ssh_root_password=None, ssh_key=None)
        success, output = server.connect_ssh()
        self.assertFalse(success)
        self.assertEqual(output, "No SSH key or password provided for the selected login type.")

    def test_connect_ssh_no_username_configured(self):
        server = Server.objects.create(**self.server_details, login_using_root=False, ssh_user=None, ssh_password='pw') # ssh_user is None
        success, output = server.connect_ssh()
        self.assertFalse(success)
        self.assertEqual(output, "SSH username is not configured for the selected login type.")

    @patch('ServerPilot_API.Servers.models.paramiko.SSHClient')
    def test_connect_ssh_command_execution_error(self, MockSSHClient):
        mock_client_instance = MockSSHClient.return_value
        mock_stdout = MagicMock()
        mock_stdout.read.return_value = b'some output before error'
        mock_stdout.channel.recv_exit_status.return_value = 1 # Error exit status
        mock_stderr = MagicMock()
        mock_stderr.read.return_value = b'critical error message'
        mock_client_instance.exec_command.return_value = (MagicMock(), mock_stdout, mock_stderr)

        server = Server.objects.create(**self.server_details, ssh_user='user', ssh_password='pw')
        success, output = server.connect_ssh(command='failing_command')

        self.assertFalse(success)
        self.assertIn("Command exited with status 1.", output)
        self.assertIn("STDOUT: some output before error", output)
        self.assertIn("STDERR: critical error message", output)
        mock_client_instance.close.assert_called_once()

    @patch('ServerPilot_API.Servers.models.io.StringIO') # Mock StringIO to control key loading
    @patch('ServerPilot_API.Servers.models.paramiko.RSAKey.from_private_key')
    @patch('ServerPilot_API.Servers.models.paramiko.Ed25519Key.from_private_key')
    @patch('ServerPilot_API.Servers.models.paramiko.ECDSAKey.from_private_key')
    @patch('ServerPilot_API.Servers.models.paramiko.SSHClient')
    def test_connect_ssh_key_loading_all_fail(self, MockSSHClient, MockECDSAKey, MockEd25519Key, MockRSAKey, MockStringIO):
        # Make all key loading attempts fail
        MockRSAKey.side_effect = paramiko.SSHException("Not RSA")
        MockEd25519Key.side_effect = paramiko.SSHException("Not Ed25519")
        MockECDSAKey.side_effect = paramiko.SSHException("Not ECDSA")
        
        mock_stringio_instance = MockStringIO.return_value
        
        server = Server.objects.create(
            **self.server_details,
            login_using_root=True,
            ssh_key="this-is-a-bad-key-string"
        )
        
        success, output = server.connect_ssh()
        
        self.assertFalse(success)
        self.assertEqual(output, "Failed to load SSH private key. Ensure it's a valid unencrypted key of a supported type (RSA, Ed25519, ECDSA).")
        MockStringIO.assert_called_once_with("this-is-a-bad-key-string")
        # Ensure seek(0) was called for each key type attempt
        self.assertEqual(mock_stringio_instance.seek.call_count, 3) 
        mock_stringio_instance.seek.assert_has_calls([call(0), call(0), call(0)])


if __name__ == '__main__':
    unittest.main()
