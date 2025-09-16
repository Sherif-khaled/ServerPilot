import pytest
import secrets
from django.urls import reverse
from rest_framework.test import APIClient
from ServerPilot_API.Users.models import CustomUser

@pytest.mark.django_db
def test_password_change():
    client = APIClient()
    old_pw = secrets.token_urlsafe(12)
    new_pw = secrets.token_urlsafe(12)
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password=old_pw, is_active=True)
    client.force_login(user)
    url = reverse('users:password-change')
    data = {
        'current_password': old_pw,  # Changed from old_password to current_password
        'new_password': new_pw
    }
    response = client.post(url, data)
    assert response.status_code == 200  # nosec
    user.refresh_from_db()
    assert user.check_password(new_pw)  # nosec
