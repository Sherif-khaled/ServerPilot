from django.shortcuts import render
from django.http import HttpRequest, HttpResponse


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
