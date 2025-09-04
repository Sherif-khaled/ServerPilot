from django.contrib import admin
from .models import EmailSettings, Favicon

@admin.register(Favicon)
class FaviconAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'get_logo_preview']
    readonly_fields = ['get_logo_preview']
    fields = ['icon']
    
    def get_logo_preview(self, obj):
        if obj.icon:
            return f'<img src="{obj.icon.url}" style="max-width: 100px; height: auto;" />'
        return "No logo uploaded"
    get_logo_preview.short_description = 'Logo Preview'
    get_logo_preview.allow_tags = True
    
    def has_add_permission(self, request):
        # Only allow one favicon instance
        return not Favicon.objects.exists()

@admin.register(EmailSettings)
class EmailSettingsAdmin(admin.ModelAdmin):
    list_display = ['send_from', 'alias_name', 'smtp_server', 'smtp_port', 'use_tls', 'use_ssl']
    list_editable = ['use_tls', 'use_ssl']
    fieldsets = (
        ('Sender Information', {
            'fields': ('send_from', 'alias_name')
        }),
        ('SMTP Configuration', {
            'fields': ('smtp_server', 'smtp_port', 'use_tls', 'use_ssl')
        }),
        ('Authentication', {
            'fields': ('username', 'password'),
            'description': 'Leave blank if your SMTP server doesn\'t require authentication'
        }),
    )
    
    def has_add_permission(self, request):
        # Only allow one email settings instance
        return not EmailSettings.objects.exists()
