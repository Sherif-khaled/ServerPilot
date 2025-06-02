import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from API.Users.models import CustomUser

@pytest.mark.django_db
def test_login():
    client = APIClient()
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password='pass1234', is_active=True)
    url = reverse('login')
    data = {'username': 'testuser', 'password': 'pass1234'}
    response = client.post(url, data)
    assert response.status_code == 200
    assert response.data['status'] == 'logged in'
