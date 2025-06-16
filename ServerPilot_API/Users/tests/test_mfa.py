import pytest
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

@pytest.mark.django_db
def test_mfa_challenge_flow_simple():
    """Simplified test for MFA challenge flow with detailed logging."""
    import sys
    
    # Helper function to log to stderr (avoids pytest output capture)
    def log(msg):
        print(msg, file=sys.stderr)
    
    log("\n=== Starting MFA Challenge Flow Test ===")
    
    # 1. Setup test user
    log("\n1. Creating test user...")
    user = CustomUser.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        is_active=True
    )
    log(f"   Created user: {user.username} (ID: {user.id})")
    
    # 2. Create a test client
    client = APIClient()
    
    # 3. Login the user
    log("\n2. Logging in user...")
    login_success = client.login(username='testuser', password='testpass123')
    log(f"   Login success: {login_success}")
    assert login_success is True
    
    # 4. Setup MFA
    log("\n3. Setting up MFA...")
    setup_url = reverse('users:mfa-setup')
    log(f"   Setup URL: {setup_url}")
    
    response = client.post(setup_url, {})
    log(f"   Status code: {response.status_code}")
    log(f"   Response data: {response.data}")
    assert response.status_code == 200
    
    # 5. Get the device and generate OTP
    device = TOTPDevice.objects.get(user=user)
    secret = base64.b32encode(device.bin_key).decode('utf-8')
    totp = pyotp.TOTP(secret)
    otp = totp.now()
    
    log(f"   Device ID: {device.id}")
    log(f"   Secret: {secret}")
    log(f"   OTP: {otp}")
    
    # 6. Verify MFA setup
    log("\n4. Verifying MFA setup...")
    verify_url = reverse('users:mfa-verify')
    verify_data = {
        'device_id': str(device.id),
        'otp_token': otp
    }
    log(f"   Verify URL: {verify_url}")
    log(f"   Verify data: {verify_data}")
    
    response = client.post(verify_url, verify_data)
    log(f"   Status code: {response.status_code}")
    log(f"   Response data: {response.data}")
    assert response.status_code == 200
    
    # 7. Verify MFA is enabled
    user.refresh_from_db()
    log(f"   MFA enabled: {user.mfa_enabled}")
    assert user.mfa_enabled is True
    
    # 8. Logout
    log("\n5. Logging out...")
    client.logout()
    
    # 9. Login again (should trigger MFA challenge)
    log("\n6. Logging in again...")
    login_url = reverse('users:login')
    login_data = {'username': 'testuser', 'password': 'testpass123'}
    
    log(f"   Login URL: {login_url}")
    log(f"   Login data: {login_data}")
    
    response = client.post(login_url, login_data)
    log(f"   Status code: {response.status_code}")
    log(f"   Response data: {response.data}")
    assert response.status_code == 200
    assert response.data.get('mfa_required') is True
    
    # 10. Check session for mfa_user_id
    session = client.session
    mfa_user_id = session.get('mfa_user_id')
    log(f"   Session mfa_user_id: {mfa_user_id}")
    log(f"   Full session: {dict(session)}")
    
    assert mfa_user_id is not None
    assert str(user.id) == str(mfa_user_id)
    
    # 11. Submit MFA challenge
    log("\n7. Submitting MFA challenge...")
    challenge_url = reverse('users:mfa-challenge')
    challenge_otp = totp.now()
    challenge_data = {'otp_token': challenge_otp}
    
    log(f"   Challenge URL: {challenge_url}")
    log(f"   Challenge OTP: {challenge_otp}")
    
    response = client.post(challenge_url, challenge_data)
    log(f"   Status code: {response.status_code}")
    log(f"   Response data: {response.data}")
    
    # 12. Verify challenge was successful
    assert response.status_code == 200
    assert response.data.get('username') == user.username
    
    # 13. Verify session state
    session = client.session
    log(f"   Final session: {dict(session)}")
    assert '_auth_user_id' in session
    assert session['_auth_user_id'] == str(user.id)
    assert 'mfa_user_id' not in session
    
    log("\n=== Test completed successfully ===\n")

@pytest.mark.django_db
def test_mfa_challenge_flow():
    print("\n=== Starting MFA Challenge Flow Test ===")
    
    # 1. Setup user and enable MFA via the API endpoints
    client = APIClient()
    
    # Create test user
    print("\n1. Creating test user...")
    user = CustomUser.objects.create_user(
        username='testuser', 
        email='test@example.com', 
        password='testpass123', 
        is_active=True
    )
    print(f"   Created user: {user.username} (ID: {user.id})")
    
    # Login the user to start a session
    print("\n2. Logging in user...")
    login_success = client.login(username='testuser', password='testpass123')
    assert login_success is True, "Failed to log in test user"
    print("   User logged in successfully")
    
    # 2. Setup MFA
    print("\n3. Setting up MFA...")
    setup_url = reverse('users:mfa-setup')
    print(f"   Calling MFA setup endpoint: {setup_url}")
    setup_response = client.post(setup_url, {})
    print(f"   MFA setup response: {setup_response.status_code}")
    print(f"   Response data: {setup_response.data}")
    assert setup_response.status_code == 200, f"Failed to setup MFA: {setup_response.data}"
    
    # Get the device and secret key
    device = TOTPDevice.objects.get(user=user)
    secret = base64.b32encode(device.bin_key).decode('utf-8')
    print(f"   Created TOTP device (ID: {device.id}) with secret: {secret}")
    
    # Generate OTP
    totp = pyotp.TOTP(secret)
    otp_token = totp.now()
    print(f"   Generated OTP: {otp_token}")
    
    # 3. Verify MFA setup
    print("\n4. Verifying MFA setup...")
    verify_url = reverse('users:mfa-verify')
    verify_data = {
        'device_id': str(device.id),
        'otp_token': otp_token
    }
    print(f"   Calling MFA verify endpoint: {verify_url}")
    print(f"   Verify data: {verify_data}")
    verify_response = client.post(verify_url, verify_data)
    print(f"   MFA verify response: {verify_response.status_code}")
    print(f"   Response data: {verify_response.data}")
    assert verify_response.status_code == 200, f"Failed to verify MFA: {verify_response.data}"
    
    # Verify MFA is enabled
    user.refresh_from_db()
    print(f"   MFA enabled status: {user.mfa_enabled}")
    assert user.mfa_enabled is True, "MFA not enabled after verification"
    
    # 4. Logout to test the full flow
    print("\n5. Logging out user...")
    client.logout()
    print("   User logged out")
    
    # 5. Login again (should trigger MFA challenge)
    print("\n6. Logging in again (should trigger MFA challenge)...")
    login_url = reverse('users:login')
    login_data = {
        'username': 'testuser',
        'password': 'testpass123'
    }
    print(f"   Calling login endpoint: {login_url}")
    print(f"   Login data: {login_data}")
    
    # Capture session before login
    session = client.session
    print(f"   Session before login: {dict(session)}")
    
    login_response = client.post(login_url, login_data)
    print(f"   Login response: {login_response.status_code}")
    print(f"   Response data: {login_response.data}")
    
    # Verify MFA challenge is required
    assert login_response.status_code == 200, f"Login failed: {login_response.data}"
    assert login_response.data.get('mfa_required') is True, "MFA challenge not triggered"
    
    # 6. Get the user ID from session (should be set by login view)
    session = client.session
    print(f"   Session after login: {dict(session)}")
    user_id = session.get('mfa_user_id')
    print(f"   mfa_user_id in session: {user_id}")
    assert user_id is not None, "mfa_user_id not set in session"
    assert str(user.id) == str(user_id), "Session user ID doesn't match test user"
    
    # 7. Submit MFA challenge
    print("\n7. Submitting MFA challenge...")
    challenge_url = reverse('users:mfa-challenge')
    challenge_otp = totp.now()
    challenge_data = {'otp_token': challenge_otp}
    print(f"   Calling MFA challenge endpoint: {challenge_url}")
    print(f"   Challenge OTP: {challenge_otp}")
    
    # Capture session before challenge
    print(f"   Session before challenge: {dict(session)}")
    
    challenge_response = client.post(challenge_url, challenge_data)
    print(f"   Challenge response: {challenge_response.status_code}")
    print(f"   Response data: {challenge_response.data}")
    
    # Verify successful authentication
    assert challenge_response.status_code == 200, f"MFA challenge failed: {challenge_response.data}"
    assert challenge_response.data.get('username') == user.username, "Unexpected user in response"
    
    # Verify session is properly set
    session = client.session
    print(f"   Session after challenge: {dict(session)}")
    assert '_auth_user_id' in session, "User not logged in after MFA challenge"
    assert session['_auth_user_id'] == str(user.id), "Wrong user ID in session"
    assert 'mfa_user_id' not in session, "MFA user ID not cleared after successful challenge"
    
    print("\n=== MFA Challenge Flow Test Completed Successfully ===\n")
