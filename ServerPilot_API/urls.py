from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('ServerPilot_API.Users.urls')),
    path('api/customers/', include('ServerPilot_API.Customers.urls')),
    # Note: Server URLs are nested under Customers, so they are included in the Customers app's urls.py
    path('api/security/', include('ServerPilot_API.security.urls')),
    path('api/audit-log/', include('ServerPilot_API.audit_log.urls')),
    path('api/configuration/', include('ServerPilot_API.configuration.urls')),
]
