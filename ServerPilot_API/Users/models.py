import secrets
import hashlib
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from security.models import PasswordHistory, PasswordPolicy

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
    email = models.EmailField(unique=True)
    mfa_enabled = models.BooleanField(default=False)
    profile_photo = models.ImageField(upload_to='profile_photos/', null=True, blank=True)
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='light')
    recovery_codes_verified = models.BooleanField(default=False)
    password_changed_at = models.DateTimeField(default=timezone.now)

    def set_password(self, raw_password):
        # If user has a usable password, save old password to history
        if self.has_usable_password():
            policy = PasswordPolicy.get_policy()
            if policy.password_history_limit > 0:
                PasswordHistory.objects.create(user=self, password_hash=self.password)
                # Trim history if it exceeds the limit
                history_limit = policy.password_history_limit
                user_history = PasswordHistory.objects.filter(user=self).order_by('-created_at')
                if user_history.count() > history_limit:
                    ids_to_delete = user_history.values_list('id', flat=True)[history_limit:]
                    PasswordHistory.objects.filter(pk__in=list(ids_to_delete)).delete()
        
        super().set_password(raw_password)
        self.password_changed_at = timezone.now()

    @property
    def is_password_expired(self):
        policy = PasswordPolicy.get_policy()
        if not policy or policy.password_expiration_days == 0:
            return False
        
        if not self.password_changed_at:
            return False

        expiration_date = self.password_changed_at + timedelta(days=policy.password_expiration_days)
        return timezone.now() > expiration_date

class UserActionLog(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True, null=True)

    def __str__(self):
        return f'{self.user.username} - {self.action} at {self.timestamp.strftime("%Y-%m-%d %H:%M:%S")}'
