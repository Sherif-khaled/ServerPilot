from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CsrfTokenView,
    RegisterView, ActivateView, LoginView, LogoutView, GitHubAuthView, ProfileView, PasswordChangeView, 
    UserAdminViewSet, UserStatsView, UserActionLogViewSet, UserViewSet, WebAuthnViewSet, RecoveryCodeViewSet,
    MFAEnableSetupView, MFAVerifySetupView, MFADisableView, MFAChallengeView
)

router = DefaultRouter()
router.register(r'profiles', UserViewSet, basename='user')
router.register(r'admin/users', UserAdminViewSet, basename='admin-users')
router.register(r'admin/logs', UserActionLogViewSet, basename='admin-logs')
router.register(r'webauthn', WebAuthnViewSet, basename='webauthn')
router.register(r'recovery-codes', RecoveryCodeViewSet, basename='recovery-codes')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('activate/<int:uid>/<str:token>/', ActivateView.as_view(), name='activate'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('login/github/', GitHubAuthView.as_view(), name='login-github'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('csrf/', CsrfTokenView.as_view(), name='get-csrf-token'),
    path('password/change/', PasswordChangeView.as_view(), name='password-change'),
    # MFA URLs
    path('mfa/setup/', MFAEnableSetupView.as_view(), name='mfa-setup'),
    path('mfa/verify/', MFAVerifySetupView.as_view(), name='mfa-verify'),
    path('mfa/disable/', MFADisableView.as_view(), name='mfa-disable'),
    path('mfa/challenge/', MFAChallengeView.as_view(), name='mfa-challenge'),
    path('admin/stats/', UserStatsView.as_view(), name='userstats'),
    path('get-csrf-token/', CsrfTokenView.as_view(), name='get-csrf-token'),
    path('', include(router.urls)),
]
