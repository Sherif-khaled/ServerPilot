from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from ServerPilot_API.Users.models import CustomUser, UserSession

class WebSessionTests(APITestCase):

    def setUp(self):
        # Create a user
        self.user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password='password123')
        
        # Log in the user to create a session
        self.client.login(username='testuser', password='password123')
        
        # Get the session key
        self.session_key = self.client.session.session_key
        
        # Create a UserSession object for the current session
        self.current_user_session = UserSession.objects.create(
            user=self.user,
            session_key=self.session_key,
            ip_address='127.0.0.1',
            user_agent='Test Client'
        )

        # Create another session for the same user
        self.other_user_session = UserSession.objects.create(
            user=self.user,
            session_key='some_other_session_key',
            ip_address='192.168.1.1',
            user_agent='Another Test Client'
        )

    def test_list_sessions(self):
        """
        Ensure an authenticated user can list their own sessions.
        """
        url = reverse('users:user-sessions-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2) # Should see both sessions

    def test_revoke_other_session(self):
        """
        Ensure a user can revoke a session that is not the current one.
        """
        url = reverse('users:user-session-revoke', kwargs={'pk': self.other_user_session.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserSession.objects.filter(pk=self.other_user_session.pk).exists())

    def test_cannot_revoke_current_session(self):
        """
        Ensure a user cannot revoke their current session.
        """
        url = reverse('users:user-session-revoke', kwargs={'pk': self.current_user_session.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(UserSession.objects.filter(pk=self.current_user_session.pk).exists())

    def test_unauthenticated_access(self):
        """
        Ensure unauthenticated users cannot access session management endpoints.
        """
        self.client.logout()
        list_url = reverse('users:user-sessions-list')
        revoke_url = reverse('users:user-session-revoke', kwargs={'pk': self.other_user_session.pk})
        
        list_response = self.client.get(list_url)
        revoke_response = self.client.delete(revoke_url)
        
        self.assertEqual(list_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(revoke_response.status_code, status.HTTP_403_FORBIDDEN)
