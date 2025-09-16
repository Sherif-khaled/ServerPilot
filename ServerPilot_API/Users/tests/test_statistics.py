import pytest
import secrets
from django.urls import reverse
from rest_framework.test import APIClient
from ServerPilot_API.Users.models import CustomUser

@pytest.mark.django_db
def test_user_statistics():
    client = APIClient()
    admin_pw = secrets.token_urlsafe(12)
    admin = CustomUser.objects.create_superuser('admin', 'admin@example.com', admin_pw)
    client.force_login(admin)
    url = reverse('users:userstats')
    response = client.get(url)
    assert response.status_code == 200  # nosec
    assert 'total_users' in response.data  # nosec
