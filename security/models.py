from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

class Setting(models.Model):
    name = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=255)

    def __str__(self):
        return self.name

class PasswordPolicy(models.Model):
    """
    A singleton model to store the system-wide password policy.
    """
    min_length = models.PositiveIntegerField(default=8, help_text=_("Minimum password length."))
    max_length = models.PositiveIntegerField(null=True, blank=True)
    uppercase_required = models.BooleanField(default=True, help_text=_("Require at least one uppercase letter."))
    lowercase_required = models.BooleanField(default=True, help_text=_("Require at least one lowercase letter."))
    digit_required = models.BooleanField(default=True, help_text=_("Require at least one number."))
    special_char_required = models.BooleanField(default=True, help_text=_("Require at least one special character."))
    special_characters = models.CharField(max_length=255, default=r"!@#$%^&*()_+-=[]{};':\|,.<>/?")
    history_limit = models.PositiveIntegerField(default=3, help_text=_("Number of old passwords to remember to prevent reuse."))
    expiry_days = models.PositiveIntegerField(default=90, help_text=_("Number of days until a password expires. 0 for no expiration."))

    def save(self, *args, **kwargs):
        """
        Ensure that there is only one PasswordPolicy object.
        """
        if not self.pk and PasswordPolicy.objects.exists():
            raise ValidationError(_('There can be only one PasswordPolicy instance.'))
        return super(PasswordPolicy, self).save(*args, **kwargs)

    @classmethod
    def get_policy(cls):
        """
        Get the current password policy, or create a default one if it doesn't exist.
        """
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "System Password Policy"

    class Meta:
        verbose_name = _("Password Policy")
        verbose_name_plural = _("Password Policies")


class PasswordHistory(models.Model):
    """
    Stores a history of user passwords to prevent reuse.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='password_history')
    password_hash = models.CharField(max_length=128, help_text=_("The hashed password."))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Password History")
        verbose_name_plural = _("Password History")
        ordering = ['-created_at']

    def __str__(self):
        return f"Password history for {self.user.username}"
