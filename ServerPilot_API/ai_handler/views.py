from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import AISettings
from .serializers import AISettingsSerializer
from openai import OpenAI
import json
import logging

logger = logging.getLogger(__name__)

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

class GenerateAppInfoView(APIView):
    """
    API view to generate an application description and icon URL using an AI model.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        app_name = request.data.get('app_name')
        if not app_name:
            return Response({'error': 'Application name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            settings = AISettings.objects.get(pk=1)
            if not settings.api_key or not settings.model:
                return Response({'error': 'AI settings are not fully configured.'}, status=status.HTTP_400_BAD_REQUEST)
        except AISettings.DoesNotExist:
            return Response({'error': 'AI settings are not configured.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = OpenAI(api_key=settings.api_key)
            
            # Generate description
            description_prompt = f"Provide a brief, one-sentence marketing description for an application named '{app_name}'."
            description_response = client.chat.completions.create(
                model=settings.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that writes concise application descriptions."},
                    {"role": "user", "content": description_prompt}
                ],
                max_tokens=60
            )
            description = description_response.choices[0].message.content.strip()
            

            # For the icon, we'll use a service that generates an image from text.
            icon_url = f"https://ui-avatars.com/api/?name={app_name.replace(' ', '+')}&background=random&color=fff"

            return Response({
                'description': description,
                'icon_url': icon_url
            })
        except Exception as e:
            return Response({'error': f'Failed to generate app info: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AnalyzeLogView(APIView):
    """
    API view to analyze application logs and provide a fix recommendation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        logger.info("Received request to analyze logs.")
        logs = request.data.get('logs')
        app_name = request.data.get('app_name')

        if not logs or not app_name:
            logger.warning("Missing 'logs' or 'app_name' in the request.")
            return Response({'error': 'Logs and app_name are required for analysis.'}, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"Analyzing logs for app: {app_name}")
        # Truncate logs to the last 50,000 characters (approx. 12.5k tokens) to avoid context length errors.
        # Truncate logs to a safer limit (e.g., 15,000 chars) to avoid context length errors.
        # A common token-to-char ratio is ~1:4, so this is roughly 3750 tokens.
        LOG_CHAR_LIMIT = 15000
        if len(logs) > LOG_CHAR_LIMIT:
            logs = logs[-LOG_CHAR_LIMIT:]
            logger.info(f"Log content was too long, truncated to the last {LOG_CHAR_LIMIT} characters.")

        try:
            settings = AISettings.objects.get(pk=1)
            if not settings.api_key or not settings.model:
                logger.error("AI settings are not fully configured.")
                return Response({'error': 'AI settings are not fully configured.'}, status=status.HTTP_400_BAD_REQUEST)
            logger.info(f"Using AI model: {settings.model}")
        except AISettings.DoesNotExist:
            logger.error("AI settings not found.")
            return Response({'error': 'AI settings are not configured.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            logger.info("Initializing OpenAI client.")
            client = OpenAI(api_key=settings.api_key)
            
            system_prompt = f"""
            You are an expert sysadmin. Analyze the following logs for an application named '{app_name}' and provide a solution.
            The user is not an expert, so explain the issue and your proposed solution clearly.
            Format your response as a valid JSON object with four keys:
            1. "recommendation": A markdown-formatted string explaining the issue and the fix. This is for the human user.
            2. "commands": A JSON array of strings. Each string MUST be a complete, non-interactive, and directly executable shell command.
            3. "error_code": A short, machine-readable string identifying the specific error (e.g., "port_conflict", "permission_denied", "out_of_memory"). If the error is generic or cannot be identified, return an empty string.
            4. "doc_link": A fully qualified URL to a relevant documentation page that helps explain the error or solution. If no relevant link is found, return an empty string.

            IMPORTANT RULES FOR THE 'recommendation' FIELD:
            - Structure your explanation as a step-by-step guide. If using a numbered list, ensure each item is on a new line (e.g., '1. First, do this.\n2. Then, do that.').
            - For each step that involves a command, present the command in a markdown code block (```bash...```).
            - The commands in the recommendation's code blocks should be the *exact* same executable commands as in the 'commands' array.
            - Add a concluding summary or note if necessary.

            IMPORTANT RULES FOR THE 'commands' ARRAY:
            - DO NOT include any placeholders like <PID>, <PORT>, etc. Instead, generate commands that find the required information dynamically. For example, to kill a process on a port, use `sudo kill $(sudo lsof -t -i :PORT)`.
            - DO NOT include any human-readable text, explanations, or comments. All explanations must go in the 'recommendation' field.
            - Use modern, commonly available tools. Prefer `ss -tuln` or `lsof -i` over `netstat`.
            - Ensure the commands are non-interactive. For example, use `apt-get install -y` instead of `apt-get install`.
            - Your final output must be a single, valid JSON object and nothing else.
            """
            prompt = f"Logs:\n```\n{logs}\n```"

            logger.info("Sending request to OpenAI API...")
            response = client.chat.completions.create(
                model=settings.model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2048,
                timeout=120  # Set a 120-second timeout
            )
            logger.info("Received response from OpenAI API.")

            content = response.choices[0].message.content.strip()
            logger.info(f"AI response content: {content[:500]}...") # Log first 500 chars

            try:
                data = json.loads(content)
                recommendation = data.get('recommendation', '')
                commands = data.get('commands', [])
                error_code = data.get('error_code', '') # Extract the error code
                doc_link = data.get('doc_link', '') # Extract the documentation link
                logger.info(f"Successfully parsed AI response. Error code: {error_code}, Doc Link: {doc_link}")
                return Response({'recommendation': recommendation, 'commands': commands, 'error_code': error_code, 'doc_link': doc_link})
            except json.JSONDecodeError:
                logger.error(f"AI returned invalid JSON: {content}")
                return Response({'recommendation': 'The AI returned an invalid response. Please try again.', 'commands': []}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"An error occurred during OpenAI API call: {str(e)}", exc_info=True)
            return Response({'error': f'Failed to analyze logs: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
