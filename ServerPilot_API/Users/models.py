import hashlib
import secrets
from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.utils import timezone as tz
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from encrypted_model_fields.fields import EncryptedCharField


class CustomUser(AbstractUser):
    THEME_CHOICES = (
        ('light', 'Light'),
        ('dark', 'Dark'),
    )
    email = models.EmailField(unique=True)
    mfa_enabled = models.BooleanField(default=False)
    profile_photo = models.ImageField(upload_to='profile_photos/', null=True, blank=True)
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='light')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    timezone = models.CharField(max_length=50, default='UTC')
    date_format = models.CharField(max_length=20, default='YYYY-MM-DD')
    recovery_codes_verified = models.BooleanField(default=False)
    password_changed_at = models.DateTimeField(default=tz.now)

    def set_password(self, raw_password):
        # If user has a usable password, save old password to history
        from ServerPilot_API.security.models import PasswordPolicy, PasswordHistory
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
        self.password_changed_at = tz.now()

    @property
    def is_password_expired(self):
        from ServerPilot_API.security.models import PasswordPolicy
        policy = PasswordPolicy.get_policy()
        if not policy or policy.password_expiration_days == 0:
            return False
        
        if not self.password_changed_at:
            return False

        expiration_date = self.password_changed_at + timedelta(days=policy.password_expiration_days)
        return tz.now() > expiration_date


class UserSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='web_sessions')
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, null=True, blank=True)
    location = models.CharField(max_length=100, null=True, blank=True)
    last_activity = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.ip_address}"


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


class UserActionLog(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True, null=True)

    def __str__(self):
        return f'{self.user.username} - {self.action} at {self.timestamp.strftime("%Y-%m-%d %H:%M:%S")}'

# Singleton model for site-wide settings
class SingletonModel(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.pk and self.__class__.objects.exists():
            raise ValidationError(f'There can be only one {self.__class__.__name__} instance.')
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        return cls.objects.get_or_create(pk=1)[0]


class AISecuritySettings(SingletonModel):
    PROVIDER_CHOICES = [
        ('openai', 'OpenAI'),
        ('gemini', 'Google Gemini'),
    ]

    provider = models.CharField(
        max_length=50,
        choices=PROVIDER_CHOICES,
        default='openai',
        help_text="The AI provider to use for security analysis."
    )
    api_key = EncryptedCharField(
        max_length=255, 
        blank=True, 
        null=True, 
        help_text="API key for the selected AI provider."
    )
    security_token = EncryptedCharField(
        max_length=255, 
        blank=True, 
        null=True, 
        help_text="Optional security token or organization ID."
    )
    is_configured = models.BooleanField(
        default=False,
        help_text="Indicates if the connection to the AI provider has been successfully tested."
    )

    def __str__(self):
        return f"AI Security Settings ({self.get_provider_display()})"

    class Meta:
        verbose_name = 'AI Security Settings'
        verbose_name_plural = 'AI Security Settings'
