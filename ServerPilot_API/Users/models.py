import secrets
import hashlib
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

class RecoveryCode(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recovery_codes')
    code = models.CharField(max_length=128)
    used = models.BooleanField(default=False)

    def __str__(self):
        return f"Recovery code for {self.user.username}"

    @staticmethod
    def hash_code(code):
        return hashlib.sha256(code.encode('utf-8')).hexdigest()

    @staticmethod
    def generate_code():
        return '-'.join(''.join(secrets.choice('abcdefghijklmnopqrstuvwxyz0123456789') for _ in range(4)) for _ in range(3))


class WebAuthnKey(models.Model):
    user = models.ForeignKey(
        'CustomUser',
        on_delete=models.CASCADE,
        related_name='webauthn_keys'
    )
    name = models.CharField(max_length=255, help_text="A user-friendly name for the key.")
    credential_id = models.BinaryField(max_length=512, unique=True)
    public_key = models.BinaryField(max_length=512)
    sign_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"'{self.name}' for {self.user.username}"


class CustomUser(AbstractUser):
    THEME_CHOICES = (
        ('light', 'Light'),
        ('dark', 'Dark'),
    )
    # Email is unique and required
    email = models.EmailField(unique=True)
    # MFA enabled flag
    mfa_enabled = models.BooleanField(default=False)
    # Profile photo
    profile_photo = models.ImageField(upload_to='profile_photos/', null=True, blank=True)
    # Theme preference
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='light')
    recovery_codes_verified = models.BooleanField(default=False)
    # Email cannot be changed after registration
    # Email immutability is enforced at the serializer level to avoid issues with partial updates
    # def save(self, *args, **kwargs):
    #     if self.pk:
    #         orig = CustomUser.objects.get(pk=self.pk)
    #         if orig.email != self.email:
    #             raise ValueError("Email cannot be changed.")
    #     super().save(*args, **kwargs)

class UserActionLog(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True, null=True)

    def __str__(self):
        return f'{self.user.username} - {self.action} at {self.timestamp.strftime("%Y-%m-%d %H:%M:%S")}'
