import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from ServerPilot_API.Users.models import CustomUser
from unittest.mock import patch

@pytest.mark.django_db
def test_register_and_activate():
    client = APIClient()
    url = reverse('register')
    data = {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'testpass123',  # Simple password for testing
        'first_name': 'Test',
        'last_name': 'User'
    }
    
    # Mock password validation to always pass
    with patch('django.contrib.auth.password_validation.validate_password', return_value=None):
        response = client.post(url, data)
        
    assert response.status_code == 201
    user = CustomUser.objects.get(username='testuser')
    assert user.is_active
