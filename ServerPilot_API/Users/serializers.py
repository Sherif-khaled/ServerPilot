import logging
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser, UserActionLog, WebAuthnKey, RecoveryCode, UserSession, AISecuritySettings

logger = logging.getLogger(__name__)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'first_name', 'last_name')

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        user.is_active = True  # Make users active immediately
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        logger.info(f"Login attempt for username: {username}")
        # Note: Do not log the password itself in production for security reasons.
        # For debugging, you might temporarily log its presence or length, e.g., logger.info(f"Password provided: {'yes' if password else 'no'}")

        user = authenticate(username=username, password=password)

        if user is not None:
            logger.info(f"User '{username}' authenticated successfully. Is active: {user.is_active}")
            if user.is_active:
                return user
            else:
                logger.warning(f"Login failed for '{username}': User is inactive.")
                raise serializers.ValidationError("User account is inactive.")
        else:
            logger.warning(f"Login failed for '{username}': Invalid credentials.")
            # Check if user exists to differentiate between wrong username and wrong password
            try:
                CustomUser.objects.get(username=username)
                logger.warning(f"Login failed for '{username}': Password incorrect.")
            except CustomUser.DoesNotExist:
                logger.warning(f"Login failed for '{username}': User does not exist.")
            raise serializers.ValidationError("Invalid credentials or inactive user.")

class GitHubAuthSerializer(serializers.Serializer):
    code = serializers.CharField()
    # The view will handle GitHub OAuth exchange

class ProfileSerializer(serializers.ModelSerializer):
    profile_photo = serializers.ImageField(max_length=None, use_url=True, allow_null=True, required=False)

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile_photo', 'mfa_enabled', 'recovery_codes_verified', 'is_staff', 'theme', 'phone_number', 'timezone', 'date_format', 'language')
        read_only_fields = ('username', 'email')


class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing users in the admin panel, including status and last login.
    """
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'date_joined',
            'is_active',
            'is_staff',
            'last_login',
            'profile_photo_url'
        )

    def get_profile_photo_url(self, obj):
        request = self.context.get('request')
        if obj.profile_photo and hasattr(obj.profile_photo, 'url'):
            return request.build_absolute_uri(obj.profile_photo.url)
        return None


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(style={"input_type": "password"}, required=True)

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(style={"input_type": "password"}, required=True)
    new_password = serializers.CharField(style={"input_type": "password"}, required=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        logger.info(f"Attempting password change for user: {user.username}")

        # Note: Do not log the password 'value' itself for security.
        # The password hash is stored in user.password.
        logger.debug(f"Stored password hash for {user.username}: {user.password}")

        is_correct = user.check_password(value)
        
        if not is_correct:
            logger.warning(f"Password change failed for user '{user.username}': Current password did not match.")
            # The error message should be generic to avoid leaking information.
            raise serializers.ValidationError({'current_password': 'Your old password was entered incorrectly. Please enter it again.'})
        
        logger.info(f"Current password verified for user: {user.username}")
        return value

    def validate(self, data):
        # It's a good practice to still use Django's password validation
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(data['new_password'], self.context['request'].user)
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': list(e.messages)})
        return data

    def save(self, **kwargs):
        password = self.validated_data['new_password']
        user = self.context['request'].user
        user.set_password(password)
        user.save()
        return user


class MFAVerifySerializer(serializers.Serializer):
    """
    Serializer for verifying an OTP token.
    """
    otp_token = serializers.CharField(required=True, min_length=6, max_length=6)

class MFASerializer(serializers.Serializer):
    enable = serializers.BooleanField()

class UserAdminCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'first_name', 'last_name', 'is_active', 'is_staff')

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_active=validated_data.get('is_active', True),
            is_staff=validated_data.get('is_staff', False)
        )
        return user

class UserAdminUpdateSerializer(serializers.ModelSerializer):
    # Email and username are typically sensitive; consider if they should be updatable by admin
    # Email updates might need re-verification logic not included here.
    # Password should be changed via a dedicated reset flow, not direct update here.
    email = serializers.EmailField(required=False)
    username = serializers.CharField(required=False)

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'mfa_enabled')
        read_only_fields = ('profile_photo',) # Admin not updating photo via this form

    def update(self, instance, validated_data):
        # Prevent email change if it's a policy, similar to ProfileSerializer
        # For now, allowing admin to change it, but be aware of implications.
        # if 'email' in validated_data and validated_data['email'] != instance.email:
        #     raise serializers.ValidationError({'email': 'Email change policy violation.'})
        
        # Password is not updated here. If 'password' is in validated_data, it's ignored.
        validated_data.pop('password', None)

        return super().update(instance, validated_data)


from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

class AdminSetPasswordSerializer(serializers.Serializer):
    """
    Serializer for an admin to set a user's password.
    """
    new_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    def validate_new_password(self, value):
        try:
            validate_password(value, self.context.get('user'))
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def save(self, **kwargs):
        password = self.validated_data['new_password']
        user = self.context['user']
        logger.info(f"AdminSetPassword: Attempting to set password for user ID: {user.id}, username: {user.username}")
        logger.debug(f"AdminSetPassword: User '{user.username}' password hash BEFORE set_password: {user.password}")

        user.set_password(password)
        logger.debug(f"AdminSetPassword: User '{user.username}' password hash AFTER set_password (before save): {user.password}")

        user.save()
        logger.info(f"AdminSetPassword: Password for user '{user.username}' (ID: {user.id}) successfully saved.")
        # Optionally, log this action or invalidate existing sessions for the user
        return user


class UserActionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserActionLog
        fields = '__all__'

class RecoveryCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecoveryCode
        fields = ['code']


class WebAuthnKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebAuthnKey
        fields = ['id', 'name', 'credential_id', 'created_at', 'last_used_at']
        read_only_fields = ['credential_id', 'created_at', 'last_used_at']

class UserSessionSerializer(serializers.ModelSerializer):
    is_current_session = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = ('id', 'ip_address', 'user_agent', 'location', 'last_activity', 'is_current_session')

    def get_is_current_session(self, obj):
        return obj.session_key == self.context['request'].session.session_key


class AISecuritySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISecuritySettings
        fields = ['provider', 'api_key', 'security_token', 'is_configured']
        extra_kwargs = {
            'api_key': {'write_only': True, 'required': False},
            'security_token': {'write_only': True, 'required': False},
            'is_configured': {'read_only': True}
        }
