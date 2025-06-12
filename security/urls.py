from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PasswordPolicyViewSet

router = DefaultRouter()
router.register(r'policy', PasswordPolicyViewSet, basename='password-policy')

urlpatterns = [
    path('', include(router.urls)),
]
