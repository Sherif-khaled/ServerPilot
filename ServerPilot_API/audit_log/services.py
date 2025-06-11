from .models import Log

def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def log_action(user, action, request=None, details=''):
    """A helper function to create a log entry."""
    ip_address = get_client_ip(request) if request else None
    Log.objects.create(
        user=user,
        action=action,
        ip_address=ip_address,
        details=details
    )
