from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PasswordPolicyViewSet, SecuritySettingsView, SecurityRiskViewSet, SelfRegistrationStatusView

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'password-policy', PasswordPolicyViewSet, basename='password-policy')
router.register(r'risks', SecurityRiskViewSet, basename='security-risk')

# The API URLs are now determined automatically by the router.
# We also add the singleton SecuritySettingsView manually.
urlpatterns = [
    path('settings/', SecuritySettingsView.as_view(), name='security-settings'),
    path('self-registration-status/', SelfRegistrationStatusView.as_view(), name='self-registration-status'),
    path('', include(router.urls)),
]

