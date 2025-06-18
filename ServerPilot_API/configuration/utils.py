from django.conf import settings as django_settings
from .models import EmailSettings

def apply_email_settings():
    """
    Loads email settings from the database and applies them to the Django settings.
    This function is designed to be safe to call at any time, including during startup
    or when no settings have been configured yet.
    """
    try:
        # The SingletonModel's load() method should return the single instance
        # or create a new, unsaved one if it doesn't exist.
        email_settings = EmailSettings.load()

        # Only apply settings if the instance has been saved to the database (i.e., has a pk)
        if email_settings and email_settings.pk:
            django_settings.EMAIL_HOST = email_settings.smtp_server
            django_settings.EMAIL_PORT = email_settings.smtp_port
            django_settings.EMAIL_HOST_USER = email_settings.username
            django_settings.EMAIL_HOST_PASSWORD = email_settings.password
            django_settings.EMAIL_USE_TLS = email_settings.use_tls
            django_settings.EMAIL_USE_SSL = email_settings.use_ssl
            django_settings.DEFAULT_FROM_EMAIL = email_settings.send_from
            
            # This is a custom setting, use setattr for safety
            setattr(django_settings, 'EMAIL_FROM_ALIAS', email_settings.alias_name)
            
            print("INFO: Custom email settings from database have been applied.")
        else:
            # This case handles when the app starts for the first time before settings are saved.
            print("INFO: No saved email settings found. Django will use defaults from settings.py.")

    except Exception as e:
        # This broad exception is a safeguard, especially during initial migrations
        # when the database table might not exist yet.
        print(f"WARNING: Could not apply email settings. This might be expected during initial setup. Error: {e}")
