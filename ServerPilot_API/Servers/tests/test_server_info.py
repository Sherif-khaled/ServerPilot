import pytest
from asgiref.sync import sync_to_async
from django.urls import reverse
from unittest.mock import patch, MagicMock, AsyncMock
from rest_framework import status
from django.test import AsyncClient
from django.contrib.auth import get_user_model
from ServerPilot_API.Customers.models import Customer
from ServerPilot_API.Servers.models import Server
import uuid
import secrets

User = get_user_model()

# Async test data creation helpers
async def create_test_user() -> User:
    """Helper to create a test user with unique email"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    password = secrets.token_urlsafe(16)
    return await sync_to_async(User.objects.create_user)(
        username=f'testuser_{uuid.uuid4().hex[:8]}',
        password=password,
        email=f'test_{uuid.uuid4().hex[:8]}@example.com'
    )

async def create_test_customer(owner: User) -> Customer:
    """Helper to create a test customer with correct fields"""
    from ServerPilot_API.Customers.models import Customer
    
    return await sync_to_async(Customer.objects.create)(
        owner=owner,
        first_name='Test',
        last_name='Customer',
        email=f'customer_{uuid.uuid4().hex[:8]}@example.com'
    )

async def create_test_server(customer: Customer) -> Server:
    return await sync_to_async(Server.objects.create)(
        customer=customer,
        server_name='Test Server',
        server_ip='127.0.0.1',
        ssh_user='testuser',
        ssh_password=secrets.token_urlsafe(12)
    )

@pytest.mark.django_db
@pytest.mark.asyncio
@patch('ServerPilot_API.Servers.views.asyncssh.connect')
async def test_get_server_info_success(mock_connect):
    """Test successfully fetching server information with a mocked SSH connection."""
    # Setup test data
    user = await create_test_user()
    customer = await create_test_customer(owner=user)
    server = await create_test_server(customer=customer)

    # Setup mock SSH connection
    mock_conn = AsyncMock()
    mock_connect.return_value.__aenter__.return_value = mock_conn
    
    # Mock command responses in exact execution order
    mock_responses = [
        # uname -a
        MagicMock(stdout='Linux test-server 5.15.0-78-generic #85-Ubuntu SMP'),
        # First grep 'cpu ' /proc/stat
        MagicMock(stdout='cpu  100 0 100 100 0 0 0 0 0 0'),
        # free -b
        MagicMock(stdout='''
                  total        used        free      shared  buff/cache   available
Mem:        1048576000    524288000    104857600    104857600    209715200    104857600
Swap:               0           0           0
            '''),
        # df -B1
        MagicMock(stdout='''
Filesystem     1K-blocks     Used Available Use% Mounted on
/dev/vda1      20971520  15728640   5242880  75% /
            '''),
        # Second grep 'cpu ' /proc/stat (after sleep)
        MagicMock(stdout='cpu  200 0 200 200 0 0 0 0 0 0')
    ]
    mock_conn.run.side_effect = mock_responses

    # Make request
    client = AsyncClient()
    await sync_to_async(client.force_login, thread_sensitive=True)(user)
    
    url = reverse('customer-servers-get-info', kwargs={
        'customer_pk': customer.pk,
        'pk': server.pk
    })
    
    response = await client.get(url)
    
    # Verify successful response
    assert response.status_code == status.HTTP_200_OK  # nosec B101
    assert 'os' in response.json()  # nosec B101
    assert 'cpu_usage' in response.json()  # nosec B101

@pytest.mark.django_db
@pytest.mark.asyncio
async def test_get_server_info_permission_denied():
    """Test that a user cannot access server info belonging to another user."""
    # Setup test data
    user1 = await create_test_user()
    customer1 = await create_test_customer(owner=user1)
    server1 = await create_test_server(customer=customer1)
    
    # Create a different user and customer
    user2 = await create_test_user()
    customer2 = await create_test_customer(owner=user2)
    
    # Make request with user2 trying to access server1 (which belongs to customer1)
    client = AsyncClient()
    await sync_to_async(client.force_login, thread_sensitive=True)(user2)
    
    url = reverse('customer-servers-get-info', kwargs={
        'customer_pk': customer1.pk,
        'pk': server1.pk
    })
    
    response = await client.get(url)
    
    # Verify access is denied
    assert response.status_code == status.HTTP_403_FORBIDDEN  # nosec B101
    assert 'error' in response.json()  # nosec B101
    assert 'permission' in response.json()['error'].lower()  # nosec B101
