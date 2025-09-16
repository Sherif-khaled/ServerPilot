import pytest
import secrets
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from ServerPilot_API.Users.models import CustomUser

@pytest.mark.django_db
def test_admin_deactivate_user():
    client = APIClient()
    admin_pw = secrets.token_urlsafe(12)
    user_pw = secrets.token_urlsafe(12)
    admin = CustomUser.objects.create_superuser('admin', 'admin@example.com', admin_pw)
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password=user_pw, is_active=True)
    client.force_login(admin)
    url = reverse('users:admin-users-detail', kwargs={'pk': user.pk})
    response = client.delete(url)
    assert response.status_code == status.HTTP_204_NO_CONTENT  # nosec
    with pytest.raises(CustomUser.DoesNotExist):
        user.refresh_from_db()
