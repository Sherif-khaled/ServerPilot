from rest_framework import serializers
from .models import AISettings

class AISettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISettings
        fields = ['id', 'provider', 'model', 'api_key']
        extra_kwargs = {
            'api_key': {'write_only': True, 'required': False},
        }

    def update(self, instance, validated_data):
        # Update instance with validated data, using current value as default
        instance.provider = validated_data.get('provider', instance.provider)
        instance.model = validated_data.get('model', instance.model)

        # The api_key is not required, so we only update it if it's provided.
        api_key = validated_data.get('api_key')
        if api_key:
            instance.api_key = api_key

        instance.save()
        return instance

    def to_representation(self, instance):
        # Customize the output for read operations to ensure api_key is never returned.
        representation = super().to_representation(instance)
        representation.pop('api_key', None)
        return representation
