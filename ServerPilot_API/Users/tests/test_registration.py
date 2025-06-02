import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from API.Users.models import CustomUser

@pytest.mark.django_db
def test_register_and_activate():
    client = APIClient()
    url = reverse('register')
    data = {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'pass1234',
        'first_name': 'Test',
        'last_name': 'User'
    }
    response = client.post(url, data)
    assert response.status_code == 201
    user = CustomUser.objects.get(username='testuser')
    assert not user.is_active
    # Simulate activation
    from django.contrib.auth.tokens import default_token_generator
    token = default_token_generator.make_token(user)
    activate_url = reverse('activate', args=[user.pk, token])
    response = client.get(activate_url)
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.is_active
