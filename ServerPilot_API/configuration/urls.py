from django.urls import path
from .views import EmailSettingsView, TestEmailConnectionView

urlpatterns = [
    path('email-settings/', EmailSettingsView.as_view(), name='email-settings'),
    path('email-settings/test-connection/', TestEmailConnectionView.as_view(), name='email-settings-test-connection'),
]
