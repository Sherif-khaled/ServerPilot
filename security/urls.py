from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PasswordPolicyViewSet, SettingViewSet

router = DefaultRouter()
router.register(r'password-policy', PasswordPolicyViewSet, basename='password-policy')
router.register(r'settings', SettingViewSet, basename='setting')

urlpatterns = [
    path('', include(router.urls)),
]
