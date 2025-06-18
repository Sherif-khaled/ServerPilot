from django.apps import AppConfig


class ConfigurationConfig(AppConfig):
    def ready(self):
        try:
            from .utils import apply_email_settings
            apply_email_settings()
        except Exception as e:
            # This can happen if the database is not yet migrated
            # We'll print a warning but allow the app to start.
            print(f'WARNING: Could not apply email settings on startup: {e}')
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ServerPilot_API.configuration'
