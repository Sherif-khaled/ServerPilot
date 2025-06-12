from datetime import timedelta
from .models import SecuritySettings
import logging

logger = logging.getLogger(__name__)

class SessionExpirationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            try:
                settings = SecuritySettings.get_settings()
                expiration_hours = settings.session_expiration_hours
                request.session.set_expiry(timedelta(hours=expiration_hours))
            except Exception as e:
                # Log the error instead of failing silently.
                logger.error(f"Could not set session expiration: {e}")
        
        response = self.get_response(request)
        return response
