from django.contrib import admin
from .models import SecuritySettings, PasswordPolicy, PasswordHistory, SecurityRisk

# Register SecuritySettings to make it editable in the admin panel.
@admin.register(SecuritySettings)
class SecuritySettingsAdmin(admin.ModelAdmin):
    # Use fieldsets to explicitly define the layout of the admin form.
    # This ensures all fields are present and saveable.
    # Define all editable fields in a simple list to ensure they are saved correctly.
    fields = [
        'recaptcha_enabled',
        'recaptcha_site_key',
        'recaptcha_secret_key',
        'session_expiration_hours',
    ]
    list_display = ('id', 'recaptcha_enabled', 'session_expiration_hours')

    # Prevent adding new SecuritySettings objects, as it's a singleton.
    def has_add_permission(self, request):
        return not SecuritySettings.objects.exists()

# Register PasswordPolicy to make it editable in the admin panel.
@admin.register(PasswordPolicy)
class PasswordPolicyAdmin(admin.ModelAdmin):
    list_display = ('id', 'min_length', 'require_uppercase', 'require_lowercase', 'require_number', 'require_symbol', 'password_expiration_days')
    # Prevent adding new PasswordPolicy objects, as it's a singleton.
    def has_add_permission(self, request):
        return not PasswordPolicy.objects.exists()

# Register PasswordHistory for viewing purposes (optional, but good practice).
@admin.register(SecurityRisk)
class SecurityRiskAdmin(admin.ModelAdmin):
    list_display = ('title', 'risk_level', 'is_enabled', 'expect_non_zero_exit', 'required_role', 'created_at')
    list_filter = ('risk_level', 'is_enabled', 'expect_non_zero_exit')
    search_fields = ('title', 'description')
    fieldsets = (
        ('Risk Details', {
            'fields': ('title', 'description', 'risk_level', 'is_enabled', 'required_role')
        }),
        ('Execution Logic', {
            'fields': ('check_command', 'match_pattern', 'expect_non_zero_exit', 'fix_command')
        }),
    )


@admin.register(PasswordHistory)
class PasswordHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at')
    readonly_fields = ('user', 'password_hash', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
