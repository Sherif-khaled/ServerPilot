from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Log
from .services import log_action

User = get_user_model()

class AuditLogServiceTest(TestCase):
    def setUp(self):
        """Set up a test user for the tests."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )

    def test_log_action_creates_log_entry(self):
        """Test that log_action creates a Log entry with correct details."""
        action_type = 'test_action'
        details_text = 'This is a test action.'
        
        # Ensure no logs exist before the action
        self.assertEqual(Log.objects.count(), 0)
        
        # Perform the action
        log_action(user=self.user, action=action_type, details=details_text)
        
        # Check that one log entry has been created
        self.assertEqual(Log.objects.count(), 1)
        
        # Verify the details of the created log entry
        log_entry = Log.objects.first()
        self.assertEqual(log_entry.user, self.user)
        self.assertEqual(log_entry.action, action_type)
        self.assertEqual(log_entry.details, details_text)
        self.assertIsNone(log_entry.ip_address) # Since we didn't pass a request
