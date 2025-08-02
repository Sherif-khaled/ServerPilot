from django.urls import path
from .views import (
    EmailSettingsView,
    TestEmailConnectionView,
    FaviconView
)

urlpatterns = [
    path('email-settings/', EmailSettingsView.as_view(), name='email-settings'),
    path('test-email/', TestEmailConnectionView.as_view(), name='test-email-connection'),
    path('favicon/', FaviconView.as_view(), name='favicon'),

]
