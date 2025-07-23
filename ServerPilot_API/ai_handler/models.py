from django.db import models
from encrypted_model_fields.fields import EncryptedCharField

class AISettings(models.Model):
    """
    Stores settings for AI integrations, such as API keys and model preferences.
    """
    provider = models.CharField(max_length=100, default='OpenAI', help_text='The AI provider, e.g., OpenAI, Anthropic.')
    api_key = EncryptedCharField(max_length=255, help_text='The API key for the selected AI provider.')
    model = models.CharField(max_length=100, default='gpt-3.5-turbo', help_text='The specific model to be used, e.g., gpt-4, gpt-3.5-turbo.')

    class Meta:
        verbose_name = "AI Setting"
        verbose_name_plural = "AI Settings"

    def __str__(self):
        return f"AI Settings for {self.provider}"

# Create your models here.
