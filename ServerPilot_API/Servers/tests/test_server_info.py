import pytest
from asgiref.sync import sync_to_async
from django.urls import reverse
from unittest.mock import patch, MagicMock, AsyncMock
from rest_framework import status
from django.test import AsyncClient
from django.contrib.auth import get_user_model
from ServerPilot_API.Customers.models import Customer
from ServerPilot_API.Servers.models import Server

User = get_user_model()

# Async test data creation helpers
@sync_to_async
def create_test_user():
    return User.objects.create_user(
        username='testuser',
        password='testpass123',
        email='test@example.com'
    )

@sync_to_async
def create_test_customer(owner):
    return Customer.objects.create(
        owner=owner,
        name='Test Customer',
        email='customer@test.com'
    )

@sync_to_async
def create_test_server(customer):
    return Server.objects.create(
        customer=customer,
        server_name='Test Server',
        server_ip='127.0.0.1',
        ssh_user='testuser',
        ssh_password='testpass123'
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
    
    # Mock command responses
    mock_conn.run.side_effect = [
        MagicMock(stdout='Linux test-server 5.15.0-78-generic #85-Ubuntu SMP'),
        MagicMock(stdout='cpu  100 0 100 100 0 0 0 0 0 0'),
        MagicMock(stdout='cpu  200 0 200 200 0 0 0 0 0 0'),
        MagicMock(stdout='''
            total        used        free      shared  buff/cache   available
Mem:           1000         500         100         100          200         100
Swap:             0           0           0
        '''),
        MagicMock(stdout='''
Filesystem      Size  Used Avail Use% Mounted on
/dev/vda1        20G   15G    5G  75% /
        ''')
    ]

    # Make request
    client = AsyncClient()
    await client.force_login(user)
    url = reverse('customer-servers-get-info', kwargs={
        'customer_pk': customer.pk,
        'pk': server.pk
    })
    
    response = await client.get(url)
    
    # Verify response
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data['os'] == 'Linux test-server 5.15.0-78-generic #85-Ubuntu SMP'
    assert data['cpu_usage'] == '66.67%'
    assert data['memory_usage'] == '50.00% (500MB / 1000MB)'
    assert data['disk_usage'] == '75% (15G / 20G)'

@pytest.mark.django_db
@pytest.mark.asyncio
async def test_get_server_info_permission_denied():
    """Test that a user cannot access server info belonging to another user."""
    # Setup test data
    user1 = await create_test_user()
    customer1 = await create_test_customer(owner=user1)
    server1 = await create_test_server(customer=customer1)
    
    # Create a different user
    user2 = await sync_to_async(User.objects.create_user)(
        username='otheruser',
        password='testpass123',
        email='other@example.com'
    )
    
    # Make request with different user
    client = AsyncClient()
    await client.force_login(user2)
    
    url = reverse('customer-servers-get-info', kwargs={
        'customer_pk': customer1.pk,
        'pk': server1.pk
    })
    
    response = await client.get(url)
    
    # Verify access is denied
    assert response.status_code == status.HTTP_403_FORBIDDEN
