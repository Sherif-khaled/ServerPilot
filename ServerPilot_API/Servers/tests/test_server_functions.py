import io
import pytest
from unittest.mock import MagicMock, patch

from ServerPilot_API.Users.models import CustomUser as User
from ServerPilot_API.Customers.models import Customer
from ServerPilot_API.Servers.models import Server, ServerCredential, ServerNotification

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return User.objects.create_user(username="owner", email="owner@example.com", password="pass")


@pytest.fixture
def customer(user):
    return Customer.objects.create(owner=user, email="cust@example.com")


@pytest.fixture
def server(customer):
    # Minimal server, defaults will be used where possible
    return Server.objects.create(customer=customer, server_name="S1", server_ip="127.0.0.1", trusted=True)


@pytest.fixture
def password_secret_bytes():
    return b"password123"


@pytest.fixture
def private_key_pem_bytes():
    # Minimal-looking RSA key markers for branching; loading is mocked
    return b"-----BEGIN RSA PRIVATE KEY-----\nMII...\n-----END RSA PRIVATE KEY-----\n"


def add_credential(server, username, secret_bytes):
    # Store dummy envelope fields; decrypt_secret will be monkeypatched to return secret_bytes
    return ServerCredential.objects.create(
        server=server,
        username=username,
        ciphertext=b"x",
        nonce=b"y",
        encrypted_dek=b"z",
    )


def mock_verified_fingerprint(monkeypatch):
    # Return ok=True, a dummy fingerprint dict and a host_key-like object with get_name()
    class DummyKey:
        def get_name(self):
            return "ssh-rsa"

        def asbytes(self):
            return b"keybytes"

        def get_fingerprint(self):
            class F:
                def hex(self_inner):
                    return "00" * 16
            return F()

    monkeypatch.setattr(
        Server,
        "_verify_or_alert_fingerprint",
        lambda self, timeout=10: (True, {"sha256": "SHA256:abc", "hex": "aa:bb"}, DummyKey()),
    )


def test_connect_ssh_blocks_when_untrusted(server):
    server.trusted = False
    server.save()
    ok, out, code = server.connect_ssh(command="whoami")
    assert not ok
    assert code == -1
    assert "not trusted" in out.lower()


@patch("ServerPilot_API.Servers.models.paramiko.SSHClient")
@patch("ServerPilot_API.Servers.models.decrypt_secret")
def test_connect_ssh_with_password_success(mock_decrypt, MockSSHClient, server, password_secret_bytes, monkeypatch):
    # Use stored credential decrypted to password
    cred = add_credential(server, username="testuser", secret_bytes=password_secret_bytes)
    mock_decrypt.return_value = password_secret_bytes
    mock_verified_fingerprint(monkeypatch)

    # Prepare SSH client mocks
    client = MockSSHClient.return_value
    stdout = MagicMock()
    stderr = MagicMock()
    stdout.read.return_value = b"ok"
    stdout.channel.recv_exit_status.return_value = 0
    stderr.read.return_value = b""
    client.exec_command.return_value = (MagicMock(), stdout, stderr)

    ok, out, code = server.connect_ssh(command="whoami", trusted=True)

    assert ok is True
    assert code == 0
    assert out.strip() == "ok"
    # Ensure connect used password (no pkey)
    assert client.connect.call_args.kwargs.get("password") == password_secret_bytes.decode()
    assert client.connect.call_args.kwargs.get("pkey") is None


@patch("ServerPilot_API.Servers.models.paramiko.RSAKey.from_private_key")
@patch("ServerPilot_API.Servers.models.paramiko.SSHClient")
@patch("ServerPilot_API.Servers.models.decrypt_secret")
def test_connect_ssh_with_private_key_success(mock_decrypt, MockSSHClient, MockRSAFromPrivateKey, server, private_key_pem_bytes, monkeypatch):
    # Decrypt to a PEM string; model should try key load path
    cred = add_credential(server, username="root", secret_bytes=private_key_pem_bytes)
    mock_decrypt.return_value = private_key_pem_bytes
    mock_verified_fingerprint(monkeypatch)

    loaded_key = object()
    MockRSAFromPrivateKey.return_value = loaded_key

    client = MockSSHClient.return_value
    stdout = MagicMock(); stderr = MagicMock()
    stdout.read.return_value = b"root"
    stdout.channel.recv_exit_status.return_value = 0
    stderr.read.return_value = b""
    client.exec_command.return_value = (MagicMock(), stdout, stderr)

    ok, out, code = server.connect_ssh(command="id", trusted=True)

    assert ok is True
    assert code == 0
    assert "root" in out
    # Ensure pkey used and password cleared
    assert client.connect.call_args.kwargs.get("pkey") is loaded_key
    assert client.connect.call_args.kwargs.get("password") is None


@patch("ServerPilot_API.Servers.models.paramiko.SSHClient")
@patch("ServerPilot_API.Servers.models.decrypt_secret")
def test_connect_ssh_rejects_unsafe_command(mock_decrypt, MockSSHClient, server, password_secret_bytes, monkeypatch):
    add_credential(server, username="u", secret_bytes=password_secret_bytes)
    mock_decrypt.return_value = password_secret_bytes
    mock_verified_fingerprint(monkeypatch)

    # Ensure SSH client connect is a no-op and exec_command is NOT called
    client = MockSSHClient.return_value
    client.connect.return_value = None
    client.exec_command.side_effect = AssertionError("exec_command should not be called for rejected command")

    # Use trusted=False (default) to enforce command safety validation (checked after connect, before exec)
    ok, out, code = server.connect_ssh(command="uname -a; rm -rf /")
    assert not ok
    assert code == -1
    assert "rejected" in out.lower()


def test_verify_or_alert_fingerprint_creates_notification_on_mismatch(server, monkeypatch):
    # Set server as trusted with stored fingerprint
    server.trusted = True
    server.stored_fingerprint = {"sha256": "SHA256:OLD", "hex": "11:22"}
    server.save()

    # Mock _fetch_server_host_key to return different fingerprints
    class DummyKey:
        def get_name(self):
            return "ssh-rsa"
        def asbytes(self):
            return b"k"
        def get_fingerprint(self):
            class F:
                def hex(self_inner):
                    return "00" * 16
            return F()

    monkeypatch.setattr(Server, "_fetch_server_host_key", lambda self, timeout=10: (DummyKey(), {"sha256": "SHA256:NEW", "hex": "aa:bb"}))

    ok, fps, key = server._verify_or_alert_fingerprint()

    assert ok is False
    assert ServerNotification.objects.filter(server=server, notification_type="fingerprint_mismatch").exists()


def test_change_user_password_success(server, monkeypatch):
    # Need at least one credential to determine username
    ServerCredential.objects.create(server=server, username="root", ciphertext=b"x", nonce=b"y", encrypted_dek=b"z")
    # Mock connect_ssh to return success
    monkeypatch.setattr(Server, "connect_ssh", lambda self, command, trusted: (True, "", 0))
    ok, msg = server.change_user_password("newpass")
    assert ok is True
    assert "success" in msg.lower()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_async_connect_blocks_when_untrusted(server):
    server.trusted = False
    with pytest.raises(Exception):
        await Server.async_connect_ssh(server)
