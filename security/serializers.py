from rest_framework import serializers
from .models import PasswordPolicy

class PasswordPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordPolicy
        fields = '__all__'
