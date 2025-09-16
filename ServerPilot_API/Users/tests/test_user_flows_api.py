import io
import os
from PIL import Image
import pytest
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core import mail
from rest_framework.test import APIClient
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from ServerPilot_API.Users.models import CustomUser, UserSession, RecoveryCode
from ServerPilot_API.security.models import SecuritySettings
from django_otp.plugins.otp_totp.models import TOTPDevice

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(django_user_model):
    return django_user_model.objects.create_user(
        username="loginuser",
        email="login@example.com",
        password="pass12345",
        email_verified=True,
        is_active=True,
    )


def test_register_disabled_returns_403(api_client):
    # Ensure self-registration disabled
    settings_obj = SecuritySettings.get_settings()
    settings_obj.self_registration_enabled = False
    settings_obj.save()

    url = reverse("users:register")
    res = api_client.post(url, {
        "username": "newuser",
        "email": "new@example.com",
        "password": "P@ssw0rd123",
        "first_name": "New",
        "last_name": "User",
    }, format="json")
    assert res.status_code == 403


def test_register_activate_then_login(api_client, monkeypatch):
    # Enable self-registration
    settings_obj = SecuritySettings.get_settings()
    settings_obj.self_registration_enabled = True
    settings_obj.save()

    # Avoid real email sending
    monkeypatch.setattr("ServerPilot_API.Users.views.send_mail", lambda *args, **kwargs: 1)

    reg_url = reverse("users:register")
    payload = {
        "username": "newuser2",
        "email": "new2@example.com",
        "password": "P@ssw0rd123",
    }
    res = api_client.post(reg_url, payload, format="json")
    assert res.status_code == 201

    # Activate
    user = CustomUser.objects.get(username="newuser2")
    token = default_token_generator.make_token(user)
    uid = user.pk
    act_url = reverse("users:activate", args=[uid, token])
    act_res = api_client.get(act_url)
    assert act_res.status_code == 200

    # Login now works
    login_url = reverse("users:login")
    login_res = api_client.post(login_url, {"username": "newuser2", "password": "P@ssw0rd123"}, format="json")
    assert login_res.status_code == 200
    assert login_res.data["username"] == "newuser2"


def test_login_mfa_required_flow(api_client, user):
    # Create a confirmed TOTP device and enable MFA
    device = TOTPDevice.objects.create(user=user, confirmed=True)
    user.mfa_enabled = True
    user.save()

    login_url = reverse("users:login")
    res = api_client.post(login_url, {"username": user.username, "password": "pass12345"}, format="json")
    assert res.status_code == 200
    assert res.data.get("mfa_required") is True
    assert "mfa_user_id" in api_client.session


def test_mfa_setup_and_verify(api_client, user, monkeypatch):
    # Authenticate
    api_client.force_authenticate(user=user)

    # Setup
    setup_url = reverse("users:mfa-setup")
    setup_res = api_client.post(setup_url)
    assert setup_res.status_code == 200
    assert "device_id" in setup_res.data
    device_id = setup_res.data["device_id"]

    # Force verify_token to always succeed
    monkeypatch.setattr(TOTPDevice, "verify_token", lambda self, tok: True)

    verify_url = reverse("users:mfa-verify")
    verify_res = api_client.post(verify_url, {"otp_token": "123456"}, format="json")
    assert verify_res.status_code == 200

    user.refresh_from_db()
    assert user.mfa_enabled is True


def test_sessions_list_and_revoke(api_client, user):
    # Create a current session for the client
    session = api_client.session
    session.save()
    current_key = session.session_key

    # Create session records
    cur = UserSession.objects.create(user=user, session_key=current_key, ip_address="1.1.1.1", user_agent="UA")
    other = UserSession.objects.create(user=user, session_key="otherkey", ip_address="2.2.2.2", user_agent="UA2")

    api_client.force_authenticate(user=user)

    list_url = reverse("users:user-sessions-list")
    list_res = api_client.get(list_url)
    assert list_res.status_code == 200
    assert any(item["id"] == cur.id for item in list_res.data)
    assert any(item["id"] == other.id for item in list_res.data)

    # Try to revoke current session => 400
    revoke_cur = reverse("users:user-session-revoke", args=[cur.id])
    revoke_cur_res = api_client.delete(revoke_cur)
    assert revoke_cur_res.status_code == 400

    # Revoke other => 204
    revoke_other = reverse("users:user-session-revoke", args=[other.id])
    revoke_other_res = api_client.delete(revoke_other)
    assert revoke_other_res.status_code == 204
    assert not UserSession.objects.filter(id=other.id).exists()


def test_profile_photo_upload(api_client, user, tmp_path, settings):
    # Save uploads to a temp directory
    settings.MEDIA_ROOT = tmp_path

    api_client.force_authenticate(user=user)
    url = reverse("users:profile")

    # Create a valid tiny PNG image via Pillow
    buffer = io.BytesIO()
    img = Image.new("RGB", (2, 2), color=(255, 0, 0))
    img.save(buffer, format="PNG")
    buffer.seek(0)
    file = SimpleUploadedFile("avatar.png", buffer.read(), content_type="image/png")

    res = api_client.patch(url, {"profile_photo": file, "first_name": "Pic", "last_name": "Update"}, format="multipart")
    assert res.status_code == 200
    assert res.data.get("profile_photo")


def test_mfa_challenge_with_recovery_code(api_client, user):
    # Prepare: put MFA challenge user id in session
    session = api_client.session
    session["mfa_user_id"] = str(user.id)
    session.save()

    # Create a recovery code for the user (store hashed)
    raw_code = "abcd-ef12-3456"
    hashed = RecoveryCode.hash_code(raw_code)
    RecoveryCode.objects.create(user=user, code=hashed, used=False)

    url = reverse("users:mfa-challenge")
    res = api_client.post(url, {"recovery_code": raw_code}, format="json")
    assert res.status_code == 200
    # Should return profile data on success
    assert res.data.get("username") == user.username
