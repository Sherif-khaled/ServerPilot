from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SecurityRiskViewSet, PasswordPolicyViewSet, SecuritySettingsView

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'risks', SecurityRiskViewSet, basename='security-risk')
router.register(r'password-policy', PasswordPolicyViewSet, basename='password-policy')

# The API URLs are now determined automatically by the router.
# We also add the singleton SecuritySettingsView manually.
urlpatterns = [
    path('', include(router.urls)),
    path('settings/', SecuritySettingsView.as_view(), name='security-settings'),
]

