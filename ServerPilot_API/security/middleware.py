from datetime import timedelta
from .models import SecuritySettings
import logging
from django.db import connections
from django.db.utils import OperationalError
from django.http import JsonResponse
from django.shortcuts import render

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


class DatabaseAvailabilityMiddleware:
    """Return 503 Service Unavailable when the database is down.

    - For API paths (starting with /api/), return a JSON 503 payload
    - For non-API paths, render the branded templates/errors/503.html
    Place this early in the stack, after CommonMiddleware.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Try to ensure the default DB is reachable
        try:
            connections['default'].cursor()
        except OperationalError as e:
            logger.error(f"Database unavailable: {e}")
            if request.path.startswith('/api/'):
                return JsonResponse(
                    {
                        'detail': 'Service temporarily unavailable',
                        'error': 'database_unavailable',
                    },
                    status=503,
                )
            # Render branded 503 HTML page
            return render(request, 'errors/503.html', status=503)

        # DB OK, continue
        return self.get_response(request)
