from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import Mock
from .serializers import PasswordChangeSerializer

CustomUser = get_user_model()

class PasswordChangeSerializerTest(TestCase):

    def setUp(self):
        """Set up a user for testing."""
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='old_password123'
        )

    def get_serializer_context(self, user):
        """Helper to create a mock request context for the serializer."""
        request = Mock()
        request.user = user
        return {'request': request}

    def test_password_change_success(self):
        """Test that a password can be changed successfully with the correct old password."""
        print("\n--- Running test_password_change_success ---")
        context = self.get_serializer_context(self.user)
        data = {
            'current_password': 'old_password123',
            'new_password': 'New_password456'
        }
        serializer = PasswordChangeSerializer(data=data, context=context)
        
        is_valid = serializer.is_valid(raise_exception=False)
        print(f"Serializer validation result: {is_valid}")
        if not is_valid:
            print(f"Serializer errors: {serializer.errors}")

        self.assertTrue(is_valid)
        serializer.save()
        self.user.refresh_from_db()
        
        # Check if the new password is set correctly
        self.assertTrue(self.user.check_password('New_password456'))
        print("Password changed successfully.")

    def test_password_change_fail_wrong_password(self):
        """Test that password change fails with an incorrect old password."""
        print("\n--- Running test_password_change_fail_wrong_password ---")
        context = self.get_serializer_context(self.user)
        data = {
            'current_password': 'wrong_old_password',
            'new_password': 'new_password789'
        }
        serializer = PasswordChangeSerializer(data=data, context=context)
        
        is_valid = serializer.is_valid(raise_exception=False)
        print(f"Serializer validation result: {is_valid}")

        self.assertFalse(is_valid)
        self.assertIn('current_password', serializer.errors)
        print(f"Serializer correctly failed with errors: {serializer.errors['current_password']}")

        # Verify the user's password has not changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('old_password123'))
        print("Password was not changed, as expected.")
