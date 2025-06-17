from django.conf import settings as django_settings
from .models import EmailSettings

def apply_email_settings():
    email_settings = EmailSettings.load()
    django_settings.EMAIL_HOST = email_settings.smtp_server
    django_settings.EMAIL_PORT = email_settings.smtp_port
    django_settings.EMAIL_HOST_USER = email_settings.username
    django_settings.EMAIL_HOST_PASSWORD = email_settings.password
    django_settings.EMAIL_USE_TLS = email_settings.use_tls
    django_settings.EMAIL_USE_SSL = email_settings.use_ssl
    django_settings.DEFAULT_FROM_EMAIL = email_settings.send_from
    django_settings.EMAIL_FROM_ALIAS = email_settings.alias_name
