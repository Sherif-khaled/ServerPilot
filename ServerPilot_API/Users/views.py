import io
import random
import string
import logging
from datetime import datetime
from django.utils import timezone
from rest_framework import generics, status, permissions, views, viewsets
from django.http import JsonResponse
from django.utils import timezone as tz  # Import with alias to avoid conflicts
from django.middleware.csrf import get_token as get_csrf_token_value
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from django.db import transaction
from django.views import View
from rest_framework.response import Response
from django.contrib.auth import login, logout, update_session_auth_hash
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from rest_framework import serializers
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import CustomUser, UserActionLog, WebAuthnKey, RecoveryCode
import webauthn
from webauthn.helpers.structs import (
    RegistrationCredential, AuthenticatorSelectionCriteria, PublicKeyCredentialRpEntity,
    PublicKeyCredentialUserEntity, AuthenticatorAttachment, UserVerificationRequirement
)
from django_otp import devices_for_user
from django_otp.plugins.otp_totp.models import TOTPDevice
import qrcode
import qrcode.image.svg
from io import BytesIO
import base64
from .serializers import (
    RegisterSerializer, LoginSerializer, ProfileSerializer, PasswordChangeSerializer, MFASerializer, MFAVerifySerializer,
    UserAdminCreateSerializer, UserAdminUpdateSerializer, GitHubAuthSerializer, UserActionLogSerializer,
    AdminSetPasswordSerializer, WebAuthnKeySerializer, RecoveryCodeSerializer, UserListSerializer
)
import logging
import datetime

# Get an instance of a logger
logger = logging.getLogger(__name__)

from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action # Added for custom actions

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = ProfileSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdminUser()]

    def get_serializer_class(self):
        if self.action == 'create':
            return RegisterSerializer
        return ProfileSerializer

from .permissions import IsAdminOrSelf
from .logging_utils import log_user_action


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfTokenView(View):
    """
    A view to ensure the CSRF cookie is set on the client.
    """
    def get(self, request, *args, **kwargs):
        return JsonResponse({'detail': 'CSRF cookie set.'})

# Registration (basic)
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    def perform_create(self, serializer):
        from rest_framework.exceptions import APIException
        user = serializer.save()
        # Send activation email
        try:
            token = default_token_generator.make_token(user)
            activation_link = f"http://localhost:3000/activate/{user.pk}/{token}"
            send_mail(
                'Activate your account',
                f'Click to activate: {activation_link}',
                settings.DEFAULT_FROM_EMAIL,
                [user.email]
            )
            log_user_action(user, 'register', f'Activation email sent to {user.email}')
        except Exception as e:
            raise APIException(f'Error sending activation email: {e}')

# Email activation
class ActivateView(views.APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request, uid, token):
        user = get_object_or_404(CustomUser, pk=uid)
        if default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            log_user_action(user, 'activate', 'CustomUser activated account')
            return Response({'status': 'activated'})
        return Response({'error': 'Invalid token'}, status=400)

# Logout View
class LogoutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        # Optionally, log the logout action if you have a logging utility
        # log_user_action(request.user, 'logout', 'User logged out') 
        return Response({'status': 'logged out'}, status=status.HTTP_200_OK)

# Login (basic)
class LoginView(views.APIView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data

        # Check if MFA is enabled and a device is configured
        device = get_user_totp_device(user)
        if user.mfa_enabled and device:
            # MFA is enabled and a device exists, proceed with MFA verification flow.
            # Clear any existing session data first
            if 'mfa_user_id' in request.session:
                del request.session['mfa_user_id']
            if 'mfa_verified_at' in request.session:
                del request.session['mfa_verified_at']
                
            # Set new MFA session data
            request.session['mfa_user_id'] = str(user.id)  # Ensure it's a string for JSON serialization
            request.session['mfa_verified_at'] = tz.now().isoformat()  # Use the aliased import
            
            # Save the session to ensure it's persisted
            request.session.save()
            
            logger.info(f"MFA required for user {user.username}. Session ID: {request.session.session_key}")
            return Response({
                'mfa_required': True,
                'message': 'MFA verification required',
                'session_id': request.session.session_key  # For debugging
            }, status=status.HTTP_200_OK)
        else:
            # If MFA is not enabled, or if it's enabled but no device is configured (inconsistent state),
            # log the user in directly.
            if user.mfa_enabled and not device:
                # Log this inconsistent state for admin review.
                logger.warning(f"User '{user.username}' has mfa_enabled=True but no MFA device configured. Bypassing MFA for login.")

            login(request, user)
            from django.utils import timezone
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            log_user_action(user, 'login', 'User logged in successfully')

            # Prepare response data, adding a flag if MFA setup is needed.
            profile_data = ProfileSerializer(user, context={'request': request}).data
            if user.mfa_enabled and not device:
                profile_data['mfa_setup_required'] = True
            
            return Response(profile_data)

# GitHub OAuth (simplified, actual OAuth flow handled in frontend/backend integration)
class GitHubAuthView(views.APIView):
    serializer_class = GitHubAuthSerializer
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        # Exchange code for user info (pseudo-code)
        # user = ...
        # login(request, user)
        # log_user_action(user, 'login_github', 'CustomUser logged in via GitHub')
        return Response({'status': 'GitHub login not implemented in backend-only example'})

from rest_framework.parsers import MultiPartParser, FormParser

# Profile view/update
class ProfileView(generics.RetrieveUpdateAPIView):
    parser_classes = (MultiPartParser, FormParser)
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return self.request.user
    def perform_update(self, serializer):
        instance = serializer.save()
        log_user_action(instance, 'profile_update', 'CustomUser updated profile')

# Password change
class PasswordChangeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PasswordChangeSerializer
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Wrong old password'}, status=400)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        update_session_auth_hash(request, user)
        log_user_action(user, 'password_change', 'CustomUser changed password')
        return Response({'status': 'password changed'})

# MFA Views
def get_user_totp_device(user):
    devices = devices_for_user(user)
    for device in devices:
        if isinstance(device, TOTPDevice):
            return device
    return None

class MFAEnableSetupView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        logger.info(f"MFAEnableSetupView: Received request from user {user.username}")

        try:
            with transaction.atomic():
                # Delete any existing unconfirmed TOTP devices for this user
                TOTPDevice.objects.filter(user=user, confirmed=False).delete()
                
                # Create a new TOTP device with explicit parameters
                logger.info(f"MFAEnableSetupView: Creating new TOTP device for user {user.username}")
                
                # Generate a random hexadecimal key for the TOTP device
                # Using 20 bytes (40 hex chars) for the key as per TOTP standard
                random_key = ''.join(random.choices('0123456789abcdef', k=40))
                
                device = TOTPDevice(
                    user=user,
                    name=f"{user.username}'s TOTP Device",
                    confirmed=False,  # Will be set to True after successful verification
                    step=30,  # 30-second time step
                    digits=6,  # 6-digit tokens
                    tolerance=1,  # Allow 1 step (30s) of clock drift
                    key=random_key  # Use the generated random key
                )
                device.save()
                logger.info(f"MFAEnableSetupView: Successfully created new device (ID: {device.id})")
                
                # Generate provisioning URI, ensuring the key is correctly base32 encoded.
                import base64
                import urllib.parse
                from binascii import unhexlify

                issuer_name = "ServerPilotApp"
                account_name = user.email

                # The key is stored as hex. It must be decoded to binary and then base32-encoded for the URI.
                binary_key = unhexlify(device.key.encode('ascii'))
                base32_key = base64.b32encode(binary_key).decode('utf-8')

                # URL-encode the issuer and account name for safety.
                encoded_issuer = urllib.parse.quote(issuer_name)
                encoded_account = urllib.parse.quote(account_name)

                # Construct the final URI.
                uri = (
                    f"otpauth://totp/{encoded_issuer}:{encoded_account}?"
                    f"secret={base32_key}&"
                    f"issuer={encoded_issuer}&"
                    f"digits={device.digits}&"
                    f"period={device.step}&"
                    "algorithm=SHA1"
                )

                logger.info(f"MFAEnableSetupView: Generated config URL for device {device.id}")
                logger.debug(f"Final TOTP URI: {uri}")

                # Generate QR code
                qr = qrcode.QRCode(version=1, box_size=5, border=2)
                qr.add_data(uri)
                qr.make(fit=True)
                
                buffered = io.BytesIO()
                img = qr.make_image(fill_color="black", back_color="white")
                img.save(buffered, format="PNG")
                
                qr_code_uri = f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}"
                
                logger.debug(f"Device details - Key: {device.key} (hex), Secret: {base32_key} (base32)")
                
                logger.info(f"MFAEnableSetupView: Successfully generated QR code for device {device.id}")
                
                # Store the device ID in the session for verification
                request.session['mfa_device_id'] = device.id
                request.session.save()

                return Response({
                    'qr_code_uri': qr_code_uri,
                    'provisioning_uri': uri,
                    'device_id': str(device.id)  # Return device ID to frontend
                })
                
        except Exception as e:
            logger.error(f"MFAEnableSetupView: Error during MFA setup for user {user.username}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to set up MFA. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MFAVerifySetupView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MFAVerifySerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp_token = serializer.validated_data['otp_token']
        user = request.user

        # Get the device ID from the session or try to find an unconfirmed device
        device_id = request.session.get('mfa_device_id')
        if device_id:
            try:
                device = TOTPDevice.objects.get(id=device_id, user=user, confirmed=False)
            except TOTPDevice.DoesNotExist:
                device = None
        else:
            # Fallback to finding any unconfirmed device
            device = TOTPDevice.objects.filter(user=user, confirmed=False).first()
            
        if not device:
            # If we still can't find a device, check if MFA is enabled
            if user.mfa_enabled:
                logger.warning(f"User {user.username} has mfa_enabled=True but no MFA device. Resetting mfa_enabled to False.")
                user.mfa_enabled = False
                user.save()
            return Response(
                {
                    'status': 'error',
                    'code': 'mfa_not_setup',
                    'detail': 'MFA setup not found or expired. Please set up MFA again.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Log device and token details for debugging
        logger.info(f"MFA Verification - User: {user.username}, Device: {device.__class__.__name__}, Device confirmed: {device.confirmed}")
        
        # Set tolerance on the device (3 steps = 90 seconds total window)
        tolerance = 3
        device.tolerance = tolerance
        logger.info(f"Verifying OTP with tolerance: {tolerance} steps (~{tolerance * 30} seconds)")
        
        # Get current server time for logging
        current_time = datetime.datetime.utcnow()
        logger.info(f"Server UTC time: {current_time.isoformat()}")
        
        try:
            # Verify the token
            is_valid = device.verify_token(otp_token)
        except Exception as e:
            logger.error(f"Error verifying OTP token: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Error verifying token. Please try again.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if is_valid:
            logger.info(f"OTP verification successful for user {user.username}")
            if not device.confirmed:
                device.confirmed = True
                device.save()
                user.mfa_enabled = True
                user.save()
                log_user_action(user, 'mfa_enable', 'MFA has been enabled.')
            return Response({'status': 'MFA enabled successfully.'})
        else:
            # Log more details about the failure
            logger.warning(
                f"Invalid OTP token for user {user.username}. "
                f"Server UTC time: {current_time.isoformat()}, "
                f"Token: {otp_token}, "
                f"Device step: {getattr(device, 'step', 'N/A')}, "
                f"Device key: {getattr(device, 'key', 'N/A')[:10]}..., "
                f"Device last_used: {getattr(device, 'last_used', 'N/A')}"
            )
            return Response(
                {'error': 'Invalid OTP token. Please ensure your device time is synchronized with internet time.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class MFADisableView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        devices = devices_for_user(user)
        for device in devices:
            if device:
                logger.info(f"MFADisableView: Deleting device for user {user.username}")
                device.delete()
        user.mfa_enabled = False
        user.save()
        log_user_action(user, 'mfa_disable', 'MFA has been disabled.')
        return Response({'status': 'MFA disabled successfully.'})

class MFAChallengeView(views.APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = MFAVerifySerializer

    def post(self, request, *args, **kwargs):
        user_id = request.session.get('mfa_user_id')
        if not user_id:
            logger.warning("MFA challenge failed: No user_id in session")
            return Response(
                {'error': 'No MFA challenge pending. Please log in again.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            logger.error(f"MFA challenge failed: User with id {user_id} not found")
            return Response(
                {'error': 'User not found. Please log in again.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get OTP token from either 'otp' or 'otp_token' field for backward compatibility
        otp_token = request.data.get('otp') or request.data.get('otp_token')
        if not otp_token:
            logger.warning("MFA challenge failed: No OTP token provided")
            return Response(
                {'error': 'OTP token is required. Please provide either "otp" or "otp_token" field.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        device = get_user_totp_device(user)
        if not device or not device.confirmed:
            logger.warning(f"MFA challenge failed: No confirmed device for user {user.username}")
            return Response(
                {'error': 'MFA not properly configured for this account.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Set tolerance on the device (1 step = 30 seconds)
            device.tolerance = 1
            if device.verify_token(otp_token):
                    # Log the user in with the session backend
                login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                
                # Update last login time
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])
                
                # Ensure the session is saved with the auth data
                request.session.cycle_key()
                request.session.save()
                
                # Clear the MFA session data
                if 'mfa_user_id' in request.session:
                    del request.session['mfa_user_id']
                if 'mfa_verified_at' in request.session:
                    del request.session['mfa_verified_at']
                
                # Save the session to ensure it's persisted
                request.session.save()
                
                logger.info(f"MFA login successful for user {user.username}")
                log_user_action(user, 'login_mfa', 'User logged in successfully with MFA')
                
                # Return the user data
                return Response(ProfileSerializer(user, context={'request': request}).data)
            else:
                logger.warning(f"Invalid OTP token for user {user.username}")
                return Response(
                    {'error': 'Invalid verification code. Please try again.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"MFA verification error for user {user.username}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred during verification. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Admin controls
class UserAdminViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all().order_by('-date_joined')
    permission_classes = [permissions.IsAdminUser]
    serializer_class = ProfileSerializer

    def get_serializer_class(self):
        # Import serializers here to avoid circular dependency issues
        from .serializers import UserListSerializer, UserAdminCreateSerializer, UserAdminUpdateSerializer, AdminSetPasswordSerializer
        if self.action == 'list':
            return UserListSerializer
        if self.action == 'create':
            return UserAdminCreateSerializer
        if self.action in ['update', 'partial_update']:
            return UserAdminUpdateSerializer
        if self.action == 'set_password':
            return AdminSetPasswordSerializer
        # For 'retrieve', it falls through to the default
        return self.serializer_class # Default to ProfileSerializer for retrieve, etc.

    def perform_create(self, serializer):
        user = serializer.save()
        log_user_action(user, 'admin_create_user', f'Admin {self.request.user.username} created user {user.username}')

    def perform_update(self, serializer):
        user = serializer.save()
        log_user_action(user, 'admin_update_user', f'Admin {self.request.user.username} updated user {user.username}')

    def perform_destroy(self, instance):
        user_username = instance.username # Capture username before deletion
        log_user_action(instance, 'admin_delete_user', f'Admin {self.request.user.username} deleted user {user_username}')
        instance.delete()

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids or not isinstance(ids, list):
            return Response({'error': 'List of user IDs is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure all IDs are integers
        try:
            user_ids = [int(id_val) for id_val in ids]
        except ValueError:
            return Response({'error': 'All IDs must be integers.'}, status=status.HTTP_400_BAD_REQUEST)

        users_to_delete = CustomUser.objects.filter(id__in=user_ids)
        deleted_count = 0
        
        # Log before deleting
        for user in users_to_delete:
            log_user_action(user, 'admin_bulk_delete_user', f'Admin {request.user.username} bulk deleted user {user.username} (ID: {user.id})')

        if users_to_delete.exists():
            # Perform the bulk delete
            # The .delete() method on a queryset returns a tuple: (total_objects_deleted, per_object_type_counts)
            actual_deleted_count, _ = users_to_delete.delete()
            deleted_count = actual_deleted_count

        if deleted_count > 0:
            return Response({'status': f'{deleted_count} users deleted successfully.'}, status=status.HTTP_200_OK)
        else:
            return Response({'status': 'No matching users found to delete or IDs list was empty.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='set-password')
    def set_password(self, request, pk=None):
        user = self.get_object()
        serializer = AdminSetPasswordSerializer(data=request.data, context={'user': user})
        if serializer.is_valid():
            serializer.save()
            log_user_action(user, 'admin_set_password', f'Admin {request.user.username} set password for user {user.username}')
            # Invalidate other sessions for the user whose password was changed by admin
            # This is important for security.
            # Note: update_session_auth_hash requires the request object where the user is logged in.
            # Since the admin is performing this, and not the user themselves, this call might not directly
            # invalidate the target user's sessions if they are logged in elsewhere. 
            # A more robust solution might involve deleting all Session objects for that user.
            # For now, we'll rely on the user being forced to log in again if their session becomes invalid.
            # Consider a custom signal or direct session management if stricter invalidation is needed.
            return Response({'status': 'password set successfully'}, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# CustomUser statistics
RP_ID = 'localhost'  # Should be your domain name in production
RP_NAME = 'ServerPilot App'

class WebAuthnViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        keys = WebAuthnKey.objects.filter(user=request.user)
        serializer = WebAuthnKeySerializer(keys, many=True)
        return Response(serializer.data)

    def destroy(self, request, pk=None):
        try:
            key = WebAuthnKey.objects.get(pk=pk, user=request.user)
            key.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except WebAuthnKey.DoesNotExist:
            return Response({'error': 'Key not found.'}, status=status.HTTP_404_NOT_FOUND)


class RecoveryCodeViewSet(viewsets.GenericViewSet):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = RecoveryCodeSerializer

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Generate new recovery codes for the user.
        This will delete all old codes and create 10 new ones.
        """
        user = request.user
        # Delete old codes
        RecoveryCode.objects.filter(user=user).delete()

        # Generate 10 new codes
        new_codes = [RecoveryCode.generate_code() for _ in range(10)]

        # Save hashed codes to the database
        recovery_codes_to_create = [RecoveryCode(user=user, code=RecoveryCode.hash_code(code)) for code in new_codes]
        RecoveryCode.objects.bulk_create(recovery_codes_to_create)

        # Also reset the verification status, forcing user to re-confirm
        user.recovery_codes_verified = False
        user.save(update_fields=['recovery_codes_verified'])

        return Response({'codes': new_codes, 'verified': user.recovery_codes_verified}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def confirm(self, request):
        """
        Mark the user's recovery codes as verified and saved.
        """
        user = request.user
        if not user.recovery_codes.exists():
            return Response({'error': 'No recovery codes found to confirm.'}, status=status.HTTP_400_BAD_REQUEST)

        user.recovery_codes_verified = True
        user.save(update_fields=['recovery_codes_verified'])
        return Response({'status': 'Recovery codes confirmed successfully.', 'verified': True}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def begin_registration(self, request):
        user = request.user
        options = webauthn.generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=str(user.id).encode('utf-8'),
            user_name=user.username,
            user_display_name=user.get_full_name() or user.username,
        )
        request.session['webauthn_challenge'] = options.challenge
        return Response(options)

    @action(detail=False, methods=['post'])
    def complete_registration(self, request):
        user = request.user
        challenge = request.session.get('webauthn_challenge')
        if not challenge:
            return Response({'error': 'Challenge not found in session.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            credential = RegistrationCredential.parse_raw(request.body)
            verification = webauthn.verify_registration_response(
                credential=credential,
                expected_challenge=challenge,
                expected_origin='http://localhost:3000', # Your frontend origin
                expected_rp_id=RP_ID,
                require_user_verification=False,
            )

            WebAuthnKey.objects.create(
                user=user,
                name=request.data.get('name', f'Key-{random.randint(1000, 9999)}'),
                credential_id=verification.credential_id,
                public_key=verification.credential_public_key,
                sign_count=verification.sign_count,
            )
            del request.session['webauthn_challenge']
            return Response({'status': 'success'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def begin_authentication(self, request):
        user_keys = WebAuthnKey.objects.filter(user=request.user)
        if not user_keys.exists():
            return Response({'error': 'No security keys registered for this user.'}, status=4.00)

        allow_credentials = [{'type': 'public-key', 'id': key.credential_id} for key in user_keys]
        options = webauthn.generate_authentication_options(
            rp_id=RP_ID,
            allow_credentials=allow_credentials,
        )
        request.session['webauthn_challenge'] = options.challenge
        return Response(options)

    @action(detail=False, methods=['post'])
    def complete_authentication(self, request):
        challenge = request.session.get('webauthn_challenge')
        if not challenge:
            return Response({'error': 'Challenge not found in session.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Logic to verify authentication will be added here
            # For now, this is a placeholder
            del request.session['webauthn_challenge']
            return Response({'status': 'authentication successful (placeholder)'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserStatsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        now = timezone.now()
        new_users = CustomUser.objects.filter(date_joined__gte=now-timedelta(days=7)).count()
        total_users = CustomUser.objects.count()
        inactive_users = CustomUser.objects.filter(is_active=False).count()
        # For current logged in users, we can use session data or a 3rd-party package; here, just a placeholder:
        current_logged_in = UserActionLog.objects.filter(action='login', timestamp__gte=now-timedelta(hours=1)).count()
        return Response({
            'total_users': total_users,
            'new_users': new_users,
            'inactive_users': inactive_users,
            'current_logged_in': current_logged_in
        })

# CustomUser action logs (admin only)
class UserActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserActionLog.objects.all()
    serializer_class = UserActionLogSerializer
    permission_classes = [permissions.IsAdminUser]

# CSRF Token view
@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfTokenView(View):
    def get(self, request, *args, **kwargs):
        csrf_token = get_csrf_token_value(request)
        return JsonResponse({'csrfToken': csrf_token})
