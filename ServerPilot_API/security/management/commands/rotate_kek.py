"""
Management command to rotate the KEK (SERVERPILOT_MASTER_KEY).

This command re-wraps all ServerCredential.encrypted_dek values using a new KEK
provided via --new-key argument (supports base64, hex, or raw 32-byte).

Usage:
  python manage.py rotate_kek --new-key <KEY>

Safety:
- Does not decrypt application data; only rewraps DEKs.
- Writes in a transaction. Rolls back on error.
- Prints summary counts only; never logs plaintext or KEKs.
"""
from __future__ import annotations

import base64
import binascii
from typing import Tuple

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from ServerPilot_API.Servers.models import ServerCredential
from ServerPilot_API.security.crypto import rewrap_encrypted_dek, get_loaded_kek


def _decode_key(value: str) -> bytes:
    # Try base64
    try:
        k = base64.b64decode(value, validate=True)
        if len(k) in (16, 24, 32):
            return k
    except (binascii.Error, ValueError):
        # Not valid base64; try next format
        ...
    # Try hex
    try:
        k = binascii.unhexlify(value)
        if len(k) in (16, 24, 32):
            return k
    except (binascii.Error, ValueError):
        # Not valid hex; fallback below
        ...
    # Fallback: raw bytes
    k = value.encode("utf-8")
    if len(k) in (16, 24, 32):
        return k
    raise CommandError(
        "New KEK must be 16/24/32 bytes (AES-128/192/256) in base64, hex, or raw."
    )


class Command(BaseCommand):
    help = "Rotate SERVERPILOT_MASTER_KEY by rewrapping all ServerCredential DEKs"

    def add_arguments(self, parser):
        parser.add_argument('--new-key', required=True, help='New KEK (base64, hex, or raw 32-byte string)')

    def handle(self, *args, **options):
        new_key_str = options['new_key']
        new_kek = _decode_key(new_key_str)
        if len(new_kek) != 32:
            raise CommandError('New KEK must be 32 bytes for AES-256 key wrap')

        old_kek = get_loaded_kek()
        if old_kek == new_kek:
            raise CommandError('New KEK must be different from the current KEK')

        total = ServerCredential.objects.count()
        rotated = 0

        self.stdout.write(self.style.WARNING(f"Starting KEK rotation for {total} credentials..."))

        with transaction.atomic():
            for cred in ServerCredential.objects.select_for_update().all():
                try:
                    new_wrapped = rewrap_encrypted_dek(bytes(cred.encrypted_dek), old_kek, new_kek)
                    cred.encrypted_dek = new_wrapped
                    cred.save(update_fields=['encrypted_dek'])
                    rotated += 1
                except Exception as e:
                    raise CommandError(f"Failed to rewrap credential id={cred.id}: {e}")

        self.stdout.write(self.style.SUCCESS(f"KEK rotation completed. Rotated {rotated}/{total} credentials."))
