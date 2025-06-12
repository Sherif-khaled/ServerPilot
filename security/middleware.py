from django.http import JsonResponse
from django.urls import reverse

# A list of URLs that should be accessible even if the password has expired.
# This is crucial to allow users to log out or change their password.
EXEMPT_URLS = [
    # We will add the name of the password change URL here once it's created.
    # e.g., reverse('password_change_view')
]

# It's also good practice to have the names of URLs to avoid hardcoding paths.
EXEMPT_URL_NAMES = [
    'logout', # Assuming the logout URL has the name 'logout'
    'password_change', # Assuming the password change URL has the name 'password_change'
]

class PasswordExpirationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated and hasattr(request.user, 'is_password_expired'):
            # Check if the user's password has expired.
            if request.user.is_password_expired:
                # Get the path of the current request.
                current_path = request.path_info
                # Get the name of the resolved URL.
                url_name = request.resolver_match.url_name if request.resolver_match else None

                # Allow access if the URL is in the exemption list.
                if current_path in EXEMPT_URLS or url_name in EXEMPT_URL_NAMES:
                    return self.get_response(request)

                # For API requests, return a JSON response indicating the password has expired.
                if request.path.startswith('/api/'):
                    return JsonResponse(
                        {'error': 'password_expired', 'detail': 'Your password has expired. Please change it.'},
                        status=403  # Forbidden
                    )

        # If the password is not expired or the user is not authenticated, continue as normal.
        return self.get_response(request)
