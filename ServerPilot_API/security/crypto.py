"""
Cryptographic helpers for envelope encryption of sensitive secrets.

Design:
- AES-256-GCM for data encryption (DEK) with 12-byte random nonce.
- AES Key Wrap (RFC 3394) with 256-bit KEK for wrapping the DEK (no nonce required).
- Master key (KEK) is loaded once at import from env var SERVERPILOT_MASTER_KEY.
- Never log plaintext or keys. Keep secrets in memory for as short as possible.

Environment:
- SERVERPILOT_MASTER_KEY: 32 bytes, base64 or hex encoded are both supported. Raw 32-byte string also supported.

Returns and inputs use bytes to avoid implicit encoding issues.
"""
from __future__ import annotations

import base64
import binascii
import os
from typing import Dict

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.keywrap import aes_key_wrap, aes_key_unwrap

from django.core.exceptions import ImproperlyConfigured


# Module-level KEK loaded once
_KEK: bytes | None = None


def _decode_key(value: str) -> bytes:
    # Try base64
    try:
        k = base64.b64decode(value, validate=True)
        if len(k) in (16, 24, 32):
            return k
    except Exception:
        pass
    # Try hex
    try:
        k = binascii.unhexlify(value)
        if len(k) in (16, 24, 32):
            return k
    except Exception:
        pass
    # Fallback: raw bytes
    k = value.encode("utf-8")
    if len(k) in (16, 24, 32):
        return k
    raise ImproperlyConfigured(
        "SERVERPILOT_MASTER_KEY must be 16/24/32 bytes (AES-128/192/256) in base64, hex, or raw."
    )


def _load_master_key() -> bytes:
    global _KEK
    if _KEK is not None:
        return _KEK
    env_value = os.getenv("SERVERPILOT_MASTER_KEY")
    if not env_value:
        raise ImproperlyConfigured("SERVERPILOT_MASTER_KEY environment variable is not set")
    _KEK = _decode_key(env_value)
    if len(_KEK) != 32:
        # Enforce AES-256 for KEK
        raise ImproperlyConfigured("SERVERPILOT_MASTER_KEY must be 32 bytes for AES-256 key wrap")
    return _KEK


def encrypt_secret(plaintext: bytes) -> Dict[str, bytes]:
    """
    Envelope-encrypt a plaintext secret.

    - Generate a random 32-byte DEK.
    - Encrypt plaintext with AES-256-GCM using DEK and random 12-byte nonce.
    - Wrap the DEK using AES Key Wrap with the KEK.

    Returns a dict with binary values: {ciphertext, nonce, encrypted_dek}
    """
    if not isinstance(plaintext, (bytes, bytearray)):
        raise TypeError("plaintext must be bytes")

    KEK = _load_master_key()

    # Generate DEK and encrypt data
    dek = bytearray(os.urandom(32))
    try:
        nonce = os.urandom(12)
        aead = AESGCM(bytes(dek))
        ciphertext = aead.encrypt(nonce, bytes(plaintext), associated_data=None)

        # Wrap DEK using KEK
        wrapped_dek = aes_key_wrap(KEK, bytes(dek))

        return {
            "ciphertext": ciphertext,
            "nonce": nonce,
            "encrypted_dek": wrapped_dek,
        }
    finally:
        # Best-effort wipe of DEK from memory
        for i in range(len(dek)):
            dek[i] = 0
        del dek


def rewrap_encrypted_dek(encrypted_dek: bytes, old_kek: bytes, new_kek: bytes) -> bytes:
    """
    Re-wrap a wrapped DEK using a new KEK without exposing plaintext data.

    This is used during key rotation: unwrap with old_kek, then wrap with new_kek.
    """
    if not (isinstance(encrypted_dek, (bytes, bytearray)) and isinstance(old_kek, (bytes, bytearray)) and isinstance(new_kek, (bytes, bytearray))):
        raise TypeError("encrypted_dek, old_kek, new_kek must be bytes")

    dek = bytearray(aes_key_unwrap(bytes(old_kek), bytes(encrypted_dek)))
    try:
        return aes_key_wrap(bytes(new_kek), bytes(dek))
    finally:
        for i in range(len(dek)):
            dek[i] = 0
        del dek


def get_loaded_kek() -> bytes:
    """Return the currently loaded KEK (raises if not configured)."""
    return _load_master_key()


def decrypt_secret(data: Dict[str, bytes]) -> bytes:
    """
    Decrypt ciphertext produced by encrypt_secret().

    Expects keys: ciphertext, nonce, encrypted_dek (all bytes)
    """
    KEK = _load_master_key()

    ciphertext = data.get("ciphertext")
    nonce = data.get("nonce")
    encrypted_dek = data.get("encrypted_dek")
    if not (isinstance(ciphertext, (bytes, bytearray)) and isinstance(nonce, (bytes, bytearray)) and isinstance(encrypted_dek, (bytes, bytearray))):
        raise TypeError("ciphertext, nonce, encrypted_dek must be bytes")

    # Unwrap DEK
    dek = bytearray(aes_key_unwrap(KEK, bytes(encrypted_dek)))
    try:
        aead = AESGCM(bytes(dek))
        plaintext = aead.decrypt(bytes(nonce), bytes(ciphertext), associated_data=None)
        return plaintext
    finally:
        for i in range(len(dek)):
            dek[i] = 0
        del dek
