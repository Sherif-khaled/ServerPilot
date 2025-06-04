import pytest
from asgiref.sync import sync_to_async
from django.urls import reverse
from rest_framework import status
from django.test import AsyncClient
from django.contrib.auth import get_user_model
from API.Customers.models import Customer
from API.Servers.models import Server

User = get_user_model()

# --- Synchronous Pytest Fixture for Test Data ---
@pytest.fixture
def live_server_data():
    """
    A synchronous pytest fixture to set up all necessary database objects.
    This runs entirely before the async test, avoiding context conflicts.
    """
    # 1. Setup: Use the provided live server credentials
    SSH_HOST = "167.86.76.14"
    SSH_USER = "root"
    SSH_PASS = "2P8KVdli7i1R8w21m2we01"

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

    # Check for the presence and basic validity of data
    assert 'os' in data and 'Linux' in data['os']
    assert 'cpu_usage' in data and '%' in data['cpu_usage']
    assert 'memory_usage' in data and '%' in data['memory_usage']
    assert 'disk_usage' in data and '%' in data['disk_usage']
