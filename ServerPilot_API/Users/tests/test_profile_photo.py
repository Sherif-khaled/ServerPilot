import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from ServerPilot_API.Users.models import CustomUser
from django.core.files.uploadedfile import SimpleUploadedFile
import base64

@pytest.mark.django_db
def test_profile_photo_upload():
    client = APIClient()
    user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password='pass1234', is_active=True)
    client.force_login(user)
    url = reverse('users:profile')
    # Use a minimal valid PNG image for testing
    # A valid 1x1 transparent PNG, base64 encoded
    base64_png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    image_bytes = base64.b64decode(base64_png)
    photo = SimpleUploadedFile('test_photo.png', image_bytes, content_type='image/png')
    response = client.patch(url, {'profile_photo': photo}, format='multipart')
    if response.status_code == 400:
        print("Validation Error:", response.data)
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.profile_photo
