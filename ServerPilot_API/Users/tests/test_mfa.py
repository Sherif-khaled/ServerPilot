import pytest
import time
import pyotp
import base64
import re
from urllib.parse import parse_qs, urlparse
from django.urls import reverse
from rest_framework.test import APIClient
from ServerPilot_API.Users.models import CustomUser
from django_otp.plugins.otp_totp.models import TOTPDevice

@pytest.mark.django_db
def test_enable_mfa():
    client = APIClient()
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password='testpass123', is_active=True)
    client.force_login(user)
    url = reverse('users:mfa-setup')  # Correctly namespaced URL
    response = client.post(url)
    assert response.status_code == 200

@pytest.mark.django_db
def test_verify_mfa_setup():
    client = APIClient()
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password='testpass123', is_active=True)
    client.force_login(user)

    # 1. Setup MFA to get the secret key
    setup_url = reverse('users:mfa-setup')
    setup_response = client.post(setup_url)
    assert setup_response.status_code == 200
    provisioning_uri = setup_response.data.get('provisioning_uri')
    device_id = setup_response.data.get('device_id')

    # Extract secret from provisioning URI
    parsed_uri = urlparse(provisioning_uri)
    secret = parse_qs(parsed_uri.query)['secret'][0]

    # 2. Verify the OTP
    totp = pyotp.TOTP(secret)
    otp_token = totp.now()

    verify_url = reverse('users:mfa-verify')
    verify_data = {
        'device_id': device_id,
        'otp_token': otp_token
    }
    verify_response = client.post(verify_url, verify_data)

    # 3. Assert that verification was successful
    assert verify_response.status_code == 200
    assert verify_response.data['status'] == 'MFA enabled successfully.'

    # 4. Check that the user and device are updated
    user.refresh_from_db()
    assert user.mfa_enabled is True
    device = TOTPDevice.objects.get(id=device_id)
    assert device.confirmed is True