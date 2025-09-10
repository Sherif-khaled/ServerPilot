"""
URL configuration for serverpilot_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from serverpilot_project import views as project_views

from ServerPilot_API.api_root import api_root

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/servers/', include('ServerPilot_API.Servers.urls')),
    path('api/users/', include('ServerPilot_API.Users.urls')),
    path('api/customers/', include('ServerPilot_API.Customers.urls')),
    path('api/audit/', include('ServerPilot_API.audit_log.urls')),
    path('api/db/', include('ServerPilot_API.db_management.urls')),
    path('api/security/', include('ServerPilot_API.security.urls')),
    path('api/stats/', include('ServerPilot_API.stats.urls')),
    path('api/configuration/', include('ServerPilot_API.configuration.urls')),
    path('api/ai/', include('ServerPilot_API.ai_handler.urls')),
    path('api/applications/', include('ServerPilot_API.server_applications.urls')),
    # Error page previews (non-auth)
    path('error/502/', project_views.error_502, name='error-502'),
    path('error/503/', project_views.error_503, name='error-503'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Custom error handlers
handler404 = 'serverpilot_project.views.custom_404'
