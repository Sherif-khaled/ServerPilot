import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from API.Users.models import CustomUser

@pytest.mark.django_db
def test_user_statistics():
    client = APIClient()
    admin = CustomUser.objects.create_superuser('admin', 'admin@example.com', 'adminpass')
    client.force_login(admin)
    url = reverse('userstats')
    response = client.get(url)
    assert response.status_code == 200
    assert 'total_users' in response.data
