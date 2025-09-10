import pytest
import uuid
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from ServerPilot_API.Customers.models import Customer, CustomerType
from ServerPilot_API.Servers.models import Server

User = get_user_model()

class ServerCredentialsTests(APITestCase):
    def setUp(self):
        # Create a user with unique credentials
        self.user = User.objects.create_user(
            username=f'testuser_{uuid.uuid4().hex[:8]}',
            email=f'test_{uuid.uuid4().hex[:8]}@example.com',
            password='testpassword123'
        )
        
        # Create another user for permission tests
        self.other_user = User.objects.create_user(
            username=f'otheruser_{uuid.uuid4().hex[:8]}',
            email=f'other_{uuid.uuid4().hex[:8]}@example.com',
            password='otherpassword123'
        )

        # Create an admin user
        self.admin_user = User.objects.create_superuser(
            username=f'admin_{uuid.uuid4().hex[:8]}',
            email=f'admin_{uuid.uuid4().hex[:8]}@example.com',
            password='adminpassword123'
        )

        # Create a customer type
        self.customer_type = CustomerType.objects.create(name='Test Type')

        # Create a customer owned by self.user
        self.customer = Customer.objects.create(
            owner=self.user,
            customer_type=self.customer_type,
            first_name='Test',
            last_name='Customer',
            email=f'customer_{uuid.uuid4().hex[:8]}@example.com'
        )
        
        # Create another customer owned by other_user
        self.other_customer = Customer.objects.create(
            owner=self.other_user,
            customer_type=self.customer_type,
            first_name='Other',
            last_name='Customer',
            email=f'other_customer_{uuid.uuid4().hex[:8]}@example.com'
        )
        
        # Create a server for the customer
        self.server = Server.objects.create(
            customer=self.customer,
            server_name='Test Server',
            server_ip='192.168.1.1',
            ssh_port=22,
            login_using_root=False,
            ssh_user='testuser',
            ssh_password='testpass123',
            ssh_key=None
        )
        
        # API client setup
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    # def test_get_credentials_as_owner(self):
    #     """Test that server owner can retrieve their server's credentials."""
    #     url = reverse('server-credentials', kwargs={'pk': self.server.pk, 'customer_pk': self.customer.pk})
    #     response = self.client.get(url)
        
    #     self.assertEqual(response.status_code, status.HTTP_200_OK)
    #     self.assertEqual(response.data['server_name'], self.server.server_name)
    #     self.assertEqual(response.data['server_ip'], self.server.server_ip)
    #     self.assertEqual(response.data['ssh_port'], self.server.ssh_port)
    #     self.assertEqual(response.data['ssh_user'], 'testuser' if not self.server.login_using_root else 'root')
    #     self.assertIn('ssh_key_available', response.data)
    #     self.assertNotIn('ssh_password', response.data)  # Should never return password
    #     self.assertNotIn('ssh_root_password', response.data)  # Should never return root password
    #     self.assertNotIn('ssh_key', response.data)  # Should never return private key

    def test_get_credentials_as_admin(self):
        """Admin can list credential metadata for any server."""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('server-credentials', kwargs={'pk': self.server.pk, 'customer_pk': self.customer.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Expect a list of credential records (likely empty initially)
        self.assertIsInstance(response.data, list)

    def test_get_credentials_unauthorized(self):
        """Test that other users cannot retrieve server credentials."""
        self.client.force_authenticate(user=self.other_user)
        url = reverse('server-credentials', kwargs={'pk': self.server.pk, 'customer_pk': self.customer.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], "Server not found.")

    def test_get_credentials_unauthenticated(self):
        """Test that unauthenticated users cannot access credentials."""
        # Ensure client is not authenticated
        self.client.force_authenticate(user=None)
        url = reverse('server-credentials', kwargs={'pk': self.server.pk, 'customer_pk': self.customer.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['detail'], "Authentication credentials were not provided.")

    def test_get_credentials_nonexistent_server(self):
        """Test requesting credentials for a non-existent server."""
        self.client.force_authenticate(user=self.customer.owner)
        url = reverse('server-credentials', kwargs={'pk': 99999, 'customer_pk': self.customer.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], "Server not found for the specified customer.")

    def test_get_credentials_wrong_customer(self):
        """Test requesting credentials with wrong customer ID."""
        self.client.force_authenticate(user=self.customer.owner)
        url = reverse('server-credentials', kwargs={'pk': self.server.pk, 'customer_pk': 2})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['detail'], "Server not found for the specified customer.")
