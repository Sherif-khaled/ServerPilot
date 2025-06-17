from django.contrib import admin

from .models import EmailSettings

class EmailSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        # Only allow adding if no instance exists
        return not EmailSettings.objects.exists()

admin.site.register(EmailSettings, EmailSettingsAdmin)
