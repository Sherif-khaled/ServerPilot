from django.apps import AppConfig


class ServersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ServerPilot_API.Servers'
    label = 'Servers' # Optional: if you want a shorter label for management commands
