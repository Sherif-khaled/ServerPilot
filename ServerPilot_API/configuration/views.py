from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, parsers
from .models import EmailSettings, Favicon
from .serializers import EmailSettingsSerializer, FaviconSerializer
import smtplib

class FaviconView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_permissions(self):
        # Allow anyone to GET the favicon, restrict modifications to admins
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get(self, request):
        favicon = Favicon.load()
        serializer = FaviconSerializer(favicon, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        favicon = Favicon.load()
        serializer = FaviconSerializer(favicon, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
