from django.shortcuts import render
from django.http import HttpRequest, HttpResponse, JsonResponse


def custom_404(request: HttpRequest, exception=None) -> HttpResponse:
    """Custom 404 handler rendering branded template."""
    response = render(request, 'errors/404.html', status=404)
    return response


def error_502(request: HttpRequest) -> HttpResponse:
    """Preview or manual route to a 502 page. Note: Django does not have a builtin handler name for 502."""
    return render(request, 'errors/502.html', status=502)


def error_503(request: HttpRequest) -> HttpResponse:
    """Preview or manual route to a 503 page. Useful during maintenance windows."""
    return render(request, 'errors/503.html', status=503)


def client_ip(request: HttpRequest) -> JsonResponse:
    """Return the client's IP address. Honors X-Forwarded-For if present."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # In case of multiple IPs, take the first one
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return JsonResponse({"ip": ip})
