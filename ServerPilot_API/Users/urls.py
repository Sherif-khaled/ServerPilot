from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

app_name = 'users'
from rest_framework.routers import DefaultRouter
from .views import (
    CsrfTokenView,
    RegisterView, ActivateView, LoginView, LogoutView, GitHubAuthView, ProfileView, PasswordChangeView, 
    UserAdminViewSet, UserStatsView, UserActionLogViewSet, UserViewSet, WebAuthnViewSet, RecoveryCodeViewSet,
    MFAEnableSetupView, MFAVerifySetupView, MFADisableView, MFAChallengeView, UserProfilePictureView, PasswordResetRequestView, PasswordResetConfirmView,
    UserSessionListView, UserSessionRevokeView,
    AISecuritySettingsView, AIConfigStatusView, TestAIConnectionView
)

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user') # Changed from 'profiles' to '' to make it the base
router.register(r'admin/users', UserAdminViewSet, basename='admin-users')
router.register(r'admin/logs', UserActionLogViewSet, basename='admin-logs')
router.register(r'webauthn', WebAuthnViewSet, basename='webauthn')
router.register(r'recovery-codes', RecoveryCodeViewSet, basename='recovery-codes')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('activate/<int:uid>/<str:token>/', ActivateView.as_view(), name='activate'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    # JWT token endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('login/github/', GitHubAuthView.as_view(), name='login-github'),
    path('profile/', ProfileView.as_view(), name='profile'),
    # Web Session Management
    path('sessions/', UserSessionListView.as_view(), name='user-sessions-list'),
    path('sessions/<int:pk>/revoke/', UserSessionRevokeView.as_view(), name='user-session-revoke'),
    path('csrf/', CsrfTokenView.as_view(), name='get-csrf-token'),
    path('password/change/', PasswordChangeView.as_view(), name='password-change'),
    path('password/reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('profile-picture/<str:username>/', UserProfilePictureView.as_view(), name='user-profile-picture'),
    # MFA URLs
    path('mfa/setup/', MFAEnableSetupView.as_view(), name='mfa-setup'),
    path('mfa/verify/', MFAVerifySetupView.as_view(), name='mfa-verify'),
    path('mfa/disable/', MFADisableView.as_view(), name='mfa-disable'),
    path('mfa/challenge/', MFAChallengeView.as_view(), name='mfa-challenge'),
    path('admin/stats/', UserStatsView.as_view(), name='userstats'),
    path('get-csrf-token/', CsrfTokenView.as_view(), name='get-csrf-token'),

    # AI Security Settings URLs
    path('ai-security-settings/', AISecuritySettingsView.as_view(), name='ai-security-settings'),
    path('ai-config-status/', AIConfigStatusView.as_view(), name='ai-config-status'),
    path('test-ai-connection/', TestAIConnectionView.as_view(), name='test-ai-connection'),

    path('', include(router.urls)),
]
