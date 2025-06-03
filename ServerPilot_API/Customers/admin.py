from django.contrib import admin

from .models import Customer, CustomerType


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'email', 'owner', 'customer_type', 'is_active', 'created_at')
    list_filter = ('is_active', 'customer_type', 'owner', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'company_name', 'owner__username')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('owner', 'customer_type', 'first_name', 'last_name', 'email', 'is_active')}),
        ('Contact Information', {'fields': ('phone_number', 'company_name', 'address_line1', 'city', 'country'), 'classes': ('collapse',)}),
        ('Details', {'fields': ('notes',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

@admin.register(CustomerType)
class CustomerTypeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)

