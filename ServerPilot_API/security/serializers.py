from rest_framework import serializers
from .models import PasswordPolicy, SecuritySettings, SecurityRisk

class PasswordPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordPolicy
        fields = '__all__'


class SecuritySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecuritySettings
        fields = ('recaptcha_site_key', 'recaptcha_secret_key', 'recaptcha_enabled', 'session_expiration_hours', 'self_registration_enabled')


class SecurityRiskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityRisk
        fields = '__all__'
