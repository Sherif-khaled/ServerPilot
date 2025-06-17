from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from encrypted_model_fields.fields import EncryptedCharField


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

# Create your models here.
