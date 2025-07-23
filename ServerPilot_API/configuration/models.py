from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from encrypted_model_fields.fields import EncryptedCharField
from ServerPilot_API.Users.models import SingletonModel





class EmailSettings(SingletonModel):
    send_from = models.EmailField(max_length=255)
    alias_name = models.CharField(max_length=255, blank=True)
    smtp_server = models.CharField(max_length=255)
    smtp_port = models.PositiveIntegerField()
    use_tls = models.BooleanField(default=False, verbose_name=_('Use TLS'))
    use_ssl = models.BooleanField(default=False, verbose_name=_('Use SSL'))
    username = models.CharField(max_length=255, blank=True)
    password = EncryptedCharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return 'Email Settings'

    def clean(self):
        if self.use_tls and self.use_ssl:
            raise ValidationError(_('You cannot select both TLS and SSL. Please choose one.'))

    class Meta:
        verbose_name = 'Email Settings'
        verbose_name_plural = 'Email Settings'




