from django.urls import path
from .ssh_terminal.consumers import SshConsumer

websocket_urlpatterns = [
    path('ws/servers/<int:server_id>/ssh/', SshConsumer.as_asgi()),
]
