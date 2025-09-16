import secrets
from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Log
from .services import log_action
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class AuditLogServiceTest(TestCase):
    def setUp(self):
        """Set up a test user for the tests."""
        self._password = secrets.token_urlsafe(16)
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password=self._password
        )

    def test_log_action_creates_log_entry(self):
        """Test that log_action creates a Log entry with correct details."""
        action_type = 'test_action'
        details_text = 'This is a test action.'
        self.assertEqual(Log.objects.count(), 0)
        log_action(user=self.user, action=action_type, details=details_text)
        self.assertEqual(Log.objects.count(), 1)
        log_entry = Log.objects.first()
        self.assertEqual(log_entry.user, self.user)
        self.assertEqual(log_entry.action, action_type)
        self.assertEqual(log_entry.details, details_text)
        self.assertIsNone(log_entry.ip_address)

class AuditLogAPIViewTest(APITestCase):
    def setUp(self):
        admin_password = secrets.token_urlsafe(16)
        user1_password = secrets.token_urlsafe(16)
        user2_password = secrets.token_urlsafe(16)
        self.admin_user = User.objects.create_superuser('admin', 'admin@example.com', admin_password)
        self.user1 = User.objects.create_user('user1', 'user1@example.com', user1_password)
        self.user2 = User.objects.create_user('user2', 'user2@example.com', user2_password)

        # Create logs with different users and timestamps
        now = timezone.now()
        log_action(user=self.user1, action='login', details='User 1 logged in')
        log_action(user=self.user2, action='logout', details='User 2 logged out')
        # Manually create and set timestamp for testing date filters
        old_log = Log.objects.create(user=self.user1, action='old_action', details='An old action from user 1')
        old_log.timestamp = now - timedelta(days=2)
        old_log.save(update_fields=['timestamp'])
        self.url = reverse('log-list')

    def test_non_admin_cannot_access_logs(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_logs(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)

    def test_filter_by_username(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.url, {'user': self.user1.username})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        # All returned logs should belong to user1
        for log in response.data['results']:
            self.assertEqual(log['user']['username'], self.user1.username)

    def test_filter_by_date(self):
        self.client.force_authenticate(user=self.admin_user)
        two_days_ago = (timezone.now() - timedelta(days=2)).strftime('%Y-%m-%d')
        response = self.client.get(self.url, {'start_date': two_days_ago, 'end_date': two_days_ago})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['action'], 'old_action')
