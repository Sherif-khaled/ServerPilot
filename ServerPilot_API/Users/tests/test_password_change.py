import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from ServerPilot_API.Users.models import CustomUser

@pytest.mark.django_db
def test_password_change():
    client = APIClient()
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password='oldpass', is_active=True)
    client.force_login(user)
    url = reverse('password-change')
    data = {
        'current_password': 'oldpass',  # Changed from old_password to current_password
        'new_password': 'newpass123'
    }
    response = client.post(url, data)
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password('newpass123')
