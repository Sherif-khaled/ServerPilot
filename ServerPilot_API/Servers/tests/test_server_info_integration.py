import pytest
from asgiref.sync import sync_to_async
from django.urls import reverse
from rest_framework import status
from django.test import AsyncClient
from django.contrib.auth import get_user_model
from ServerPilot_API.Customers.models import Customer
from ServerPilot_API.Servers.models import Server

User = get_user_model()

# --- Synchronous Pytest Fixture for Test Data ---
@pytest.fixture
def live_server_data():
    """
    A synchronous pytest fixture to set up all necessary database objects.
    This runs entirely before the async test, avoiding context conflicts.
    """
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    # 1. Setup: Use environment variables for credentials
    SSH_HOST = os.getenv('SSH_HOST')
    SSH_USER = os.getenv('SSH_USER')
    SSH_PASS = os.getenv('SSH_PASS')
    
    if not all([SSH_HOST, SSH_USER, SSH_PASS]):
        pytest.skip("SSH credentials not configured in environment variables")

    # Create User
    user, _ = User.objects.get_or_create(
        username='testuser_integration',
        defaults={'password': 'testpass123', 'email': 'integration@test.com'}
    )

    # Create Customer
    customer, _ = Customer.objects.get_or_create(
        owner=user,
        defaults={'company_name': 'Integration Test Customer', 'email': 'integration_customer@test.com'}
    )

    # Create Server
    server, _ = Server.objects.get_or_create(
        customer=customer,
        server_ip=SSH_HOST,
        defaults={
            'server_name': 'Live Integration Test Server',
            'login_using_root': True,
            'ssh_user': SSH_USER,
            'ssh_root_password': SSH_PASS
        }
    )
    return user, customer, server


# --- Integration Test ---
pytestmark = pytest.mark.real_server
@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_get_server_info_live_connection(live_server_data, settings):
    """
    Tests the get_server_info endpoint using data from a synchronous fixture.
    """
    # Disable OTP middleware for this test, as it's not async-safe
    settings.MIDDLEWARE = [m for m in settings.MIDDLEWARE if m != 'django_otp.middleware.OTPMiddleware']

    user, customer, server = live_server_data

    # 2. Action: Make an authenticated API call to the endpoint
    client = AsyncClient()
    # The login still needs to be wrapped because the test function is async
    await sync_to_async(client.force_login, thread_sensitive=True)(user)

    url = reverse('customer-servers-get-info', kwargs={
        'customer_pk': customer.pk,
        'pk': server.pk
    })

    print(f"\nRequesting server info from URL: {url}")
    response = await client.get(url)

    # 3. Assert: Verify the response is successful and contains valid data
    print(f"Response Status: {response.status_code}")
    print(f"Response JSON: {response.json()}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Check for the presence of basic metrics
    required_keys = ['os', 'cpu_usage', 'memory', 'disks']
    for key in required_keys:
        assert key in data, f"Missing expected key: {key}"
    
    # Verify OS contains Linux
    assert 'Linux' in data['os'], "Expected Linux OS"
    
    # Verify CPU usage is numeric
    assert isinstance(float(data['cpu_usage']), (int, float)), "CPU usage should be numeric"
    
    # Verify memory structure
    memory_keys = ['total_gb', 'used_gb', 'available_gb']
    for key in memory_keys:
        assert key in data['memory'], f"Missing memory key: {key}"
        assert isinstance(data['memory'][key], (int, float)), f"Memory {key} should be numeric"
    
    # Verify disks structure
    assert isinstance(data['disks'], list), "Disks should be a list"
    assert len(data['disks']) > 0, "Expected at least one disk"
    disk_keys = ['filesystem', 'total_gb', 'used_gb', 'available_gb', 'mountpoint']
    for key in disk_keys:
        assert key in data['disks'][0], f"Missing disk key: {key}"
