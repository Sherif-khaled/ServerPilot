import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'serverpilot_project.settings')

# Get the default Django ASGI application to handle HTTP requests
django_asgi_app = get_asgi_application()

import ServerPilot_API.Servers.routing # Import the routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                ServerPilot_API.Servers.routing.websocket_urlpatterns
            )
        )
    ),
})
