from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from ServerPilot_API.Customers.models import Customer, CustomerType
from ServerPilot_API.Servers.models import Server

User = get_user_model()

class ServerAPITests(APITestCase):
    def setUp(self):
        # Create a user
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpassword123')
        
        # Create another user for permission tests
        self.other_user = User.objects.create_user(username='otheruser', email='other@example.com', password='otherpassword123')

        # Create a customer type
        self.customer_type = CustomerType.objects.create(name='Test Type')

        # Create a customer owned by self.user
        self.customer = Customer.objects.create(
            owner=self.user,
            customer_type=self.customer_type,
            first_name='Test',
            last_name='Customer',
            email='customer@example.com'
        )
        
        # Create a customer owned by self.other_user
        self.other_customer = Customer.objects.create(
            owner=self.other_user,
            customer_type=self.customer_type,
            first_name='Other Test',
            last_name='Customer',
            email='othercustomer@example.com'
        )

        # URL for listing/creating servers for self.customer
        self.servers_url = reverse('customer-servers-list', kwargs={'customer_pk': self.customer.pk})

        # Authenticate as self.user
        self.client.force_authenticate(user=self.user)

    def test_create_server_non_root_with_password(self):
        """
        Ensure we can create a new server for a customer (non-root login with password).
        """
        data = {
            'server_name': 'My Test Server',
            'server_ip': '192.168.1.100',
            'ssh_port': 2222,
            'login_using_root': False,
            'ssh_user': 'testsshuser',
            'ssh_password': 'sshpassword123'
        }
        response = self.client.post(self.servers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Server.objects.count(), 1)
        server = Server.objects.first()
        self.assertEqual(server.server_name, data['server_name'])
        self.assertEqual(server.ssh_port, data['ssh_port'])
        self.assertFalse(server.login_using_root)
        self.assertEqual(server.ssh_user, data['ssh_user'])
        self.assertIsNotNone(server.ssh_password) # Password is saved
        self.assertIsNone(server.ssh_root_password)

    def test_create_server_root_with_key(self):
        """
        Ensure we can create a new server for a customer (root login with SSH key).
        """
        data = {
            'server_name': 'My Root Key Server',
            'server_ip': '192.168.1.101',
            'login_using_root': True,
            'ssh_key': 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQD...'
        }
        response = self.client.post(self.servers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        server = Server.objects.get(server_name=data['server_name'])
        self.assertTrue(server.login_using_root)
        self.assertEqual(server.ssh_key, data['ssh_key'])
        self.assertIsNone(server.ssh_user)
        self.assertIsNone(server.ssh_password)
        self.assertIsNone(server.ssh_root_password)

    def test_create_server_fail_non_root_missing_credentials(self):
        """
        Test creation fails if non-root login and no password/key provided.
        """
        data = {
            'server_name': 'Fail Server',
            'server_ip': '192.168.1.102',
            'login_using_root': False,
            'ssh_user': 'useronly'
        }
        response = self.client.post(self.servers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non-root login, either SSH password or an SSH key must be provided', str(response.data))

    def test_create_server_fail_root_missing_credentials(self):
        """
        Test creation fails if root login and no root password/key provided.
        """
        data = {
            'server_name': 'Fail Root Server',
            'server_ip': '192.168.1.103',
            'login_using_root': True
        }
        response = self.client.post(self.servers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('root login, either SSH root password or an SSH key must be provided', str(response.data))
        
    def test_create_server_fail_non_root_user_is_root(self):
        """
        Test creation fails if non-root login and ssh_user is 'root'.
        """
        data = {
            'server_name': 'Fail Server',
            'server_ip': '192.168.1.102',
            'login_using_root': False,
            'ssh_user': 'root',
            'ssh_password': 'somepassword'
        }
        response = self.client.post(self.servers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("'ssh_user' cannot be 'root' for non-root login", str(response.data))

    def test_create_server_unauthenticated(self):
        """
        Test server creation fails for unauthenticated user.
        """
        self.client.force_authenticate(user=None) # Unauthenticate
        data = {'server_name': 'Unauth Server', 'server_ip': '1.2.3.4'}
        response = self.client.post(self.servers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_server_for_other_users_customer_permission_denied(self):
        """
        Test server creation fails if trying to create for a customer not owned by the user.
        The IsOwnerOfCustomerForServer permission should prevent this.
        """
        other_customer_servers_url = reverse('customer-servers-list', kwargs={'customer_pk': self.other_customer.pk})
        data = {
            'server_name': 'My Test Server',
            'server_ip': '192.168.1.100',
            'login_using_root': False,
            'ssh_user': 'testsshuser',
            'ssh_password': 'sshpassword123'
        }
        response = self.client.post(other_customer_servers_url, data, format='json')
        # This will be caught by IsOwnerOfCustomerForServer permission
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_list_servers_for_customer(self):
        """
        Ensure we can list servers for a specific customer.
        """
        Server.objects.create(customer=self.customer, server_name='Server A', server_ip='10.0.0.1', ssh_user='user_a', ssh_password='pw_a')
        Server.objects.create(customer=self.customer, server_name='Server B', server_ip='10.0.0.2', ssh_user='user_b', ssh_password='pw_b')
        # Server for another customer, should not be listed
        Server.objects.create(customer=self.other_customer, server_name='Server C', server_ip='10.0.0.3', ssh_user='user_c', ssh_password='pw_c')

        response = self.client.get(self.servers_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        # Server A and B order might vary depending on default ordering, so check names exist
        server_names_in_response = {s['server_name'] for s in response.data}
        self.assertIn('Server A', server_names_in_response)
        self.assertIn('Server B', server_names_in_response)

    def test_retrieve_server_detail(self):
        """
        Ensure we can retrieve a specific server and passwords are not exposed.
        """
        server = Server.objects.create(
            customer=self.customer, server_name='Detail Test Server', server_ip='10.0.0.5',
            login_using_root=True, ssh_root_password='rootpassword', ssh_key='akey'
        )
        detail_url = reverse('customer-servers-detail', kwargs={'customer_pk': self.customer.pk, 'pk': server.pk})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['server_name'], server.server_name)
        self.assertNotIn('ssh_password', response.data)
        self.assertNotIn('ssh_root_password', response.data)
        self.assertIn('ssh_key', response.data) # ssh_key is fine to return if not sensitive

    # --- Placeholder for Update Tests ---
    def test_update_server_partial_patch(self):
        """
        Test partially updating a server (e.g., name and login type).
        """
        server = Server.objects.create(
            customer=self.customer, server_name='Initial Name', server_ip='10.0.0.6',
            login_using_root=False, ssh_user='olduser', ssh_password='oldpassword'
        )
        detail_url = reverse('customer-servers-detail', kwargs={'customer_pk': self.customer.pk, 'pk': server.pk})
        
        patch_data = {
            'server_name': 'Updated Name',
            'login_using_root': True,
            'ssh_root_password': 'newrootpassword' # Provide necessary creds for new login type
        }
        response = self.client.patch(detail_url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        server.refresh_from_db()
        self.assertEqual(server.server_name, 'Updated Name')
        self.assertTrue(server.login_using_root)
        self.assertIsNotNone(server.ssh_root_password)
        self.assertIsNone(server.ssh_user) # Should be nulled by serializer
        self.assertIsNone(server.ssh_password) # Should be nulled

    # --- Placeholder for Delete Tests ---
    def test_delete_server(self):
        """
        Test deleting a server.
        """
        server = Server.objects.create(customer=self.customer, server_name='To Delete', server_ip='10.0.0.7', ssh_user='deluser', ssh_password='delpw')
        detail_url = reverse('customer-servers-detail', kwargs={'customer_pk': self.customer.pk, 'pk': server.pk})
        
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Server.objects.filter(pk=server.pk).exists())
