from django.urls import path, include

urlpatterns = [
    path('configuration/', include('ServerPilot_API.configuration.urls')),
]
