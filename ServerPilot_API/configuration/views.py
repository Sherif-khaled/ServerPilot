from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import EmailSettings
from .serializers import EmailSettingsSerializer
import smtplib

class EmailSettingsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        settings = EmailSettings.load()
        serializer = EmailSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = EmailSettings.load()
        serializer = EmailSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TestEmailConnectionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        data = request.data or {}
        # Use provided data or fallback to saved settings
        settings = EmailSettings.load()
        smtp_server = data.get('smtp_server', settings.smtp_server)
        smtp_port = data.get('smtp_port', settings.smtp_port)
        use_tls = data.get('use_tls', settings.use_tls)
        use_ssl = data.get('use_ssl', settings.use_ssl)
        username = data.get('username', settings.username)
        password = data.get('password', settings.password)
        try:
            if use_ssl:
                server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
                if use_tls:
                    server.starttls()
            if username and password:
                server.login(username, password)
            server.quit()
            return Response({'success': True, 'message': 'Connection successful.'})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)
