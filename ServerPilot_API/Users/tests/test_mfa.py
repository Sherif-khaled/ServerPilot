import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from ServerPilot_API.Users.models import CustomUser

@pytest.mark.django_db
def test_enable_mfa():
    client = APIClient()
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password='testpass123', is_active=True)
    client.force_login(user)
    url = reverse('mfa-setup')  # Updated to use correct URL name
    response = client.post(url)
    assert response.status_code == 200
