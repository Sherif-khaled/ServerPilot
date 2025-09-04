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
    self_registration_enabled = models.BooleanField(default=False, help_text="Allow users to register themselves without admin approval.")


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


class SecurityRisk(models.Model):
    """Model representing a security risk check that can be executed on a server or system."""

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        CRITICAL = "critical", "Critical"

    title = models.CharField(max_length=255)
    description = models.TextField()

    # Command (e.g., shell/Python) to execute in order to check if risk exists
    check_command = models.TextField(help_text="Command to check for the risk condition.")

    # Regex or glob pattern to match from the check_command output that indicates the risk is present
    match_pattern = models.CharField(max_length=255, help_text="Pattern indicating risk presence in command output.")

    # If True, a non-zero exit code from the check_command is expected and considered a success for matching.
    expect_non_zero_exit = models.BooleanField(default=False, help_text="Set to True if a non-zero exit code indicates the risk is present.")

    # Command to automatically fix / mitigate the risk
    fix_command = models.TextField(blank=True)

    risk_level = models.CharField(max_length=8, choices=RiskLevel.choices, default=RiskLevel.LOW)

    # Django group / role name that is required to execute the fix. Default is 'admin'
    required_role = models.CharField(max_length=64, default="admin")

    is_enabled = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Security Risk"
        verbose_name_plural = "Security Risks"
