from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PasswordPolicyViewSet, SecuritySettingsView

router = DefaultRouter()
router.register(r'policy', PasswordPolicyViewSet, basename='password-policy')

urlpatterns = [
    path('', include(router.urls)),
    path('settings/', SecuritySettingsView.as_view(), name='security-settings'),
]
