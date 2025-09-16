import pytest
import secrets
from django.urls import reverse
from rest_framework.test import APIClient
from ServerPilot_API.Users.models import CustomUser

@pytest.mark.django_db
def test_login():
    client = APIClient()
    pw = secrets.token_urlsafe(12)
    user = CustomUser.objects.create_user(
        username='testuser', 
        email='test@example.com', 
        password=pw, 
        is_active=True,
        first_name='Test',
        last_name='User'
    )
    url = reverse('users:login')
    data = {'username': 'testuser', 'password': pw}
    response = client.post(url, data)
    assert response.status_code == 200  # nosec
    assert 'username' in response.data  # nosec
    assert response.data['username'] == 'testuser'  # nosec
