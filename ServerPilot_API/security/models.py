from django.db import models
from django.conf import settings

class PasswordPolicy(models.Model):
    min_length = models.PositiveIntegerField(default=8)
    require_uppercase = models.BooleanField(default=True)
    require_lowercase = models.BooleanField(default=True)
    require_number = models.BooleanField(default=True)
    require_symbol = models.BooleanField(default=True)
    password_expiration_days = models.PositiveIntegerField(default=90, help_text="0 means password never expires.")
    password_history_limit = models.PositiveIntegerField(default=5, help_text="Number of old passwords to prevent reuse.")

    def __str__(self):
        return "Default Password Policy"

    @staticmethod
    def get_policy():
        # Always return the first policy object, creating it if it doesn't exist.
        policy, created = PasswordPolicy.objects.get_or_create(pk=1)
        return policy

    class Meta:
        verbose_name = "Password Policy"
        verbose_name_plural = "Password Policies"

class PasswordHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='password_history')
    password_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Password history for {self.user.username} at {self.created_at.strftime('%Y-%m-%d')}"

    class Meta:
        verbose_name = "Password History"
        verbose_name_plural = "Password Histories"
        ordering = ['-created_at']


class SecuritySettings(models.Model):
    recaptcha_site_key = models.CharField(max_length=255, blank=True)
    recaptcha_secret_key = models.CharField(max_length=255, blank=True)
    recaptcha_enabled = models.BooleanField(default=False)
    session_expiration_hours = models.PositiveIntegerField(default=24, help_text="Number of hours before a user session expires.")

    def __str__(self):
        return "Security Settings"

    @staticmethod
    def get_settings():
        # Use get_or_create to ensure a settings object always exists.
        settings, created = SecuritySettings.objects.get_or_create(pk=1)
        return settings

    class Meta:
        verbose_name = "Security Settings"
        verbose_name_plural = "Security Settings"
