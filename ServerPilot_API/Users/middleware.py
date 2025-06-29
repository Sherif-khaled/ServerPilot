from django.utils import timezone
from .models import UserSession
from django.conf import settings
import logging
import requests

logger = logging.getLogger(__name__)

class UserSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            session_key = request.session.session_key
            if not session_key:
                request.session.save()
                session_key = request.session.session_key

            ip_address = self.get_client_ip(request)
            user_agent = request.headers.get('User-Agent', '')[:255]

            try:
                session, created = UserSession.objects.get_or_create(
                    user=request.user,
                    session_key=session_key,
                    defaults={
                        'ip_address': ip_address,
                        'user_agent': user_agent,
                    }
                )

                if created:
                    session.location = self.get_location(ip_address)
                    session.save()
                else:
                    session.last_activity = timezone.now()
                    if session.ip_address != ip_address or session.user_agent != user_agent:
                        session.ip_address = ip_address
                        session.user_agent = user_agent
                        session.location = self.get_location(ip_address)
                    session.save()

            except Exception as e:
                logger.error(f"Error in UserSessionMiddleware: {e}")

        response = self.get_response(request)
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def get_location(self, ip):
        if not ip or ip == '127.0.0.1':
            return 'Localhost'
        try:
            response = requests.get(f'https://ipapi.co/{ip}/json/', timeout=2)
            response.raise_for_status()
            data = response.json()
            city = data.get('city')
            country = data.get('country_name')
            if city and country:
                return f"{city}, {country}"
            elif country:
                return country
            return 'Unknown Location'
        except requests.RequestException as e:
            logger.warning(f"Could not get location for IP {ip}: {e}")
            return 'Location lookup failed'
