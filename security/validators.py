import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from .models import PasswordPolicy, PasswordHistory
from django.contrib.auth.hashers import check_password

class PasswordPolicyValidator:
    """
    A custom password validator to enforce the system-wide password policy.
    """
    def __init__(self):
        self.policy = PasswordPolicy.get_policy()

    def validate(self, password, user=None):
        errors = []

        # Minimum length
        if len(password) < self.policy.min_length:
            errors.append(ValidationError(
                _("This password must contain at least %(min_length)d characters."),
                code='password_too_short',
                params={'min_length': self.policy.min_length},
            ))

        # Uppercase requirement
        if self.policy.require_uppercase and not re.search(r'[A-Z]', password):
            errors.append(ValidationError(
                _("This password must contain at least one uppercase letter."),
                code='password_no_upper',
            ))

        # Lowercase requirement
        if self.policy.require_lowercase and not re.search(r'[a-z]', password):
            errors.append(ValidationError(
                _("This password must contain at least one lowercase letter."),
                code='password_no_lower',
            ))

        # Number requirement
        if self.policy.require_number and not re.search(r'[0-9]', password):
            errors.append(ValidationError(
                _("This password must contain at least one number."),
                code='password_no_number',
            ))

        # Symbol requirement
        if self.policy.require_symbol and not re.search(r'[^a-zA-Z0-9]', password):
            errors.append(ValidationError(
                _("This password must contain at least one special character."),
                code='password_no_symbol',
            ))
        
        # Password history check
        if user and self.policy.password_history_limit > 0:
            recent_password_hashes = PasswordHistory.objects.filter(user=user).order_by('-created_at').values_list('password_hash', flat=True)[:self.policy.password_history_limit]
            for stored_hash in recent_password_hashes:
                if check_password(password, stored_hash):
                    errors.append(ValidationError(
                        _("You cannot reuse a recent password."),
                        code='password_is_reused',
                    ))
                    break

        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return _(
            "Your password must meet the security requirements of the system."
        )
