import os
import base64
import uuid
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from ServerPilot_API.security.crypto import encrypt_secret, decrypt_secret

User = get_user_model()


class CryptoEnvelopeTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Ensure a KEK is set for tests (32 bytes base64)
        if not os.getenv('SERVERPILOT_MASTER_KEY'):
            os.environ['SERVERPILOT_MASTER_KEY'] = base64.b64encode(b'K' * 32).decode('ascii')

    def test_encrypt_decrypt_roundtrip_utf8(self):
        plaintext = b"myS3cretP@ssw0rd"
        blob = encrypt_secret(plaintext)
        assert set(blob.keys()) == {"ciphertext", "nonce", "encrypted_dek"}
        out = decrypt_secret(blob)
        assert out == plaintext

    def test_encrypt_decrypt_roundtrip_binary(self):
        plaintext = bytes(range(0, 256))
        blob = encrypt_secret(plaintext)
        out = decrypt_secret(blob)
        assert out == plaintext
