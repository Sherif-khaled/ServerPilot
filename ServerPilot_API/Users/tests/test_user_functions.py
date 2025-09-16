import pytest
from datetime import timedelta
from django.utils import timezone as tz
from django.core.exceptions import ValidationError

from ServerPilot_API.Users.models import (
    CustomUser,
    UserSession,
    RecoveryCode,
    WebAuthnKey,
    AISecuritySettings,
)
from ServerPilot_API.security.models import PasswordPolicy, PasswordHistory

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return CustomUser.objects.create_user(
        username="u1",
        email="u1@example.com",
        password="initial-pass",
    )


def test_set_password_creates_history_after_first_change(user):
    # First change creates history of old hash
    old_hash = user.password
    user.set_password("second-pass")
    user.save()

    history = PasswordHistory.objects.filter(user=user).order_by("-created_at")
    assert history.count() == 1
    assert history.first().password_hash == old_hash
    assert user.password_changed_at is not None


def test_password_history_limit_enforced(user):
    # Set policy limit to 2, then rotate 3 times => only last 2 history entries remain
    policy = PasswordPolicy.get_policy()
    policy.password_history_limit = 2
    policy.save()

    hashes = []
    for i in range(3):
        prev_hash = user.password
        user.set_password(f"pass-{i}")
        user.save()
        hashes.append(prev_hash)

    stored_hashes = list(PasswordHistory.objects.filter(user=user).order_by("-created_at").values_list("password_hash", flat=True))
    # We expect only the last two previous hashes present
    assert len(stored_hashes) == 2
    assert stored_hashes[0] == hashes[-1]  # most recent previous
    assert stored_hashes[1] == hashes[-2]  # previous to that


def test_is_password_expired_logic(user):
    policy = PasswordPolicy.get_policy()

    # No expiration when days=0
    policy.password_expiration_days = 0
    policy.save()
    assert user.is_password_expired is False

    # With expiration enabled and timestamp far in past => expired
    policy.password_expiration_days = 10
    policy.save()
    user.password_changed_at = tz.now() - timedelta(days=20)
    user.save(update_fields=["password_changed_at"])
    assert user.is_password_expired is True

    # Recently changed => not expired
    user.password_changed_at = tz.now() - timedelta(days=1)
    user.save(update_fields=["password_changed_at"])
    assert user.is_password_expired is False


def test_recovery_code_generate_and_hash(user):
    code = RecoveryCode.generate_code()
    # Format like xxxx-xxxx-xxxx (3 groups of 4)
    parts = code.split("-")
    assert len(parts) == 3
    assert all(len(p) == 4 for p in parts)

    hashed = RecoveryCode.hash_code(code)
    # SHA256 hex length = 64
    assert isinstance(hashed, str)
    assert len(hashed) == 64

    # Store a code entry
    rc = RecoveryCode.objects.create(user=user, code=hashed)
    assert str(rc).startswith("Recovery code for ")


def test_user_session_basic_str(user):
    sess = UserSession.objects.create(user=user, session_key="abc123")
    s = str(sess)
    assert user.username in s


def test_webauthn_key_str(user):
    key = WebAuthnKey.objects.create(
        user=user,
        name="YubiKey",
        credential_id=b"cid",
        public_key=b"pk",
    )
    assert "YubiKey" in str(key)


def test_aisecuritysettings_singleton():
    # First load returns singleton
    s1 = AISecuritySettings.load()
    assert s1.pk == 1

    # Creating another instance should raise ValidationError via SingletonModel.save
    s2 = AISecuritySettings()
    with pytest.raises(ValidationError):
        s2.save()

    # Load again returns same object
    s3 = AISecuritySettings.load()
    assert s3.pk == s1.pk
