from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import AISettings
from .serializers import AISettingsSerializer
from openai import OpenAI

class AISettingsView(generics.RetrieveUpdateAPIView):
    """
    API view to retrieve and update the AI settings.
    Handles a singleton AISettings object.
    """
    serializer_class = AISettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Ensure a single settings object exists
        obj, created = AISettings.objects.get_or_create(pk=1)
        return obj

class AIModelsView(APIView):
    """
    API view to fetch the list of available AI models from the configured provider.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            settings = AISettings.objects.get(pk=1)
            if not settings.api_key:
                return Response({'error': 'API key is not configured.'}, status=status.HTTP_400_BAD_REQUEST)
        except AISettings.DoesNotExist:
            return Response({'error': 'AI settings are not configured.'}, status=status.HTTP_400_BAD_REQUEST)

        provider = settings.provider
        if provider.lower() == 'openai':
            try:
                client = OpenAI(api_key=settings.api_key)
                models = client.models.list()
                model_ids = [model.id for model in models.data]
                # Filter for gpt models for relevance
                gpt_models = sorted([model_id for model_id in model_ids if 'gpt' in model_id])
                return Response({'models': gpt_models})
            except Exception as e:
                return Response({'error': f'Failed to fetch models from OpenAI: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({'error': f'Provider "{provider}" is not supported for model fetching.'}, status=status.HTTP_400_BAD_REQUEST)


class ExplainSecurityRiskView(APIView):
    """
    API view to generate a security risk explanation using an AI model.
    """
    def post(self, request, *args, **kwargs):
        risk_description = request.data.get('risk_description')
        if not risk_description:
            return Response({'error': 'Risk description is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            settings = AISettings.objects.get(pk=1)
        except AISettings.DoesNotExist:
            return Response({'error': 'AI settings are not configured.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            prompt = f"Explain why the following is a security risk in 3 terms for a non-technical person: \"{risk_description}\""
            client = OpenAI(api_key=settings.api_key)
            response = client.chat.completions.create(
                model=settings.model,
                messages=[
                    {"role": "system", "content": "You are a cybersecurity expert explaining risks to beginners."},
                    {"role": "user", "content": prompt}
                ]
            )
            explanation = response.choices[0].message.content.strip()
            return Response({'explanation': explanation})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
