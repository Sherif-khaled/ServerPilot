import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from ServerPilot_API.Users.models import CustomUser

@pytest.mark.django_db
def test_profile_update():
    client = APIClient()
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password='pass1234', is_active=True)
    client.force_login(user)
    url = reverse('users:profile')
    response = client.patch(url, {'first_name': 'New', 'last_name': 'Name'})
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.first_name == 'New'
    assert user.last_name == 'Name'
    # Try to change email
    response = client.patch(url, {'email': 'changed@example.com'})
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.email == 'test@example.com'
