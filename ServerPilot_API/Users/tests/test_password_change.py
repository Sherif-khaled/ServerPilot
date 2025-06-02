import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from API.Users.models import CustomUser

@pytest.mark.django_db
def test_password_change():
    client = APIClient()
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password='oldpass', is_active=True)
    client.force_login(user)
    url = reverse('password')
    response = client.post(url, {'old_password': 'oldpass', 'new_password': 'newpass'})
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password('newpass')
