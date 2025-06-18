from django.core.management.base import BaseCommand
from ServerPilot_API.security.models import SecuritySettings

class Command(BaseCommand):
    help = 'Checks and displays the current email configuration from the database.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("--- Checking Email Settings in Database ---"))
        
        settings_count = SecuritySettings.objects.count()
        self.stdout.write(f"Found {settings_count} SecuritySettings object(s).")

        if settings_count == 0:
            self.stdout.write(self.style.WARNING("No SecuritySettings object found. Please create one via the admin panel."))
            return

        if settings_count > 1:
            self.stdout.write(self.style.WARNING("Warning: Multiple SecuritySettings objects found. This is a singleton model and should only have one instance."))

        all_settings = SecuritySettings.objects.all()
        for i, settings in enumerate(all_settings):
            self.stdout.write(self.style.SUCCESS(f"\n--- Displaying Settings for Object {i+1} (pk={settings.pk}) ---"))
            self.stdout.write(f"  Email Host: '{settings.email_host}'")
            self.stdout.write(f"  Email Port: {settings.email_port}")
            self.stdout.write(f"  Email Use TLS: {settings.email_use_tls}")
            self.stdout.write(f"  Email Host User: '{settings.email_host_user}'")
            self.stdout.write(f"  Email Host Password: '{'********' if settings.email_host_password else ''}'")
            self.stdout.write(f"  Default From Email: '{settings.default_from_email}'")
        
        self.stdout.write(self.style.SUCCESS("\n--- Check Complete ---"))
