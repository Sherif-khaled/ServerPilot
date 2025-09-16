import pytest
import secrets
from django.urls import reverse
from rest_framework.test import APIClient
from ServerPilot_API.Users.models import CustomUser

@pytest.mark.django_db
def test_profile_update():
    client = APIClient()
    pw = secrets.token_urlsafe(12)
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password=pw, is_active=True)
    client.force_login(user)
    url = reverse('users:profile')
    response = client.patch(url, {'first_name': 'New', 'last_name': 'Name'})
    assert response.status_code == 200  # nosec
    user.refresh_from_db()
    assert user.first_name == 'New'  # nosec
    assert user.last_name == 'Name'  # nosec
    # Try to change email
    response = client.patch(url, {'email': 'changed@example.com'})
    assert response.status_code == 200  # nosec
    user.refresh_from_db()
    assert user.email == 'test@example.com'  # nosec
