import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from API.Users.models import CustomUser

@pytest.mark.django_db
def test_enable_mfa():
    client = APIClient()
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password='pass1234', is_active=True)
    client.force_login(user)
    url = reverse('mfa')
    response = client.post(url, {'enable': True})
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.mfa_enabled
