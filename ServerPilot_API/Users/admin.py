from django.contrib import admin
from .models import CustomUser, UserActionLog

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'is_staff', 'is_superuser', 'is_active', 'date_joined', 'last_login')
    search_fields = ('username', 'email')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'mfa_enabled')
    ordering = ('-date_joined',)
    readonly_fields = ('last_login', 'date_joined')

@admin.register(UserActionLog)
class UserActionLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'timestamp', 'details')
    search_fields = ('user__username', 'action', 'details')
    list_filter = ('action', 'timestamp')
    ordering = ('-timestamp',)
