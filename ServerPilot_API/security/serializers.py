from rest_framework import serializers
from .models import PasswordPolicy, SecuritySettings

class PasswordPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordPolicy
        fields = '__all__'


class SecuritySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecuritySettings
        fields = ('recaptcha_site_key', 'recaptcha_secret_key', 'recaptcha_enabled')
