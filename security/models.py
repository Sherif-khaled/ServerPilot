from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

class PasswordPolicy(models.Model):
    """
    A singleton model to store the system-wide password policy.
    """
    min_length = models.PositiveIntegerField(default=8, help_text=_("Minimum password length."))
    require_uppercase = models.BooleanField(default=True, help_text=_("Require at least one uppercase letter."))
    require_lowercase = models.BooleanField(default=True, help_text=_("Require at least one lowercase letter."))
    require_number = models.BooleanField(default=True, help_text=_("Require at least one number."))
    require_symbol = models.BooleanField(default=True, help_text=_("Require at least one special character."))
    password_expiration_days = models.PositiveIntegerField(default=90, help_text=_("Number of days until a password expires. 0 for no expiration."))
    password_history_limit = models.PositiveIntegerField(default=5, help_text=_("Number of old passwords to remember to prevent reuse."))

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
