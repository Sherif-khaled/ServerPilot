from django.urls import path, include
from rest_framework.routers import SimpleRouter # Use SimpleRouter or DefaultRouter for the parent
from rest_framework_nested.routers import NestedSimpleRouter
from . import views as customer_views
from ServerPilot_API.Servers import views as server_views
from ServerPilot_API.Servers.views import ServerInfoView

# Create a router for the parent resource (Customers and CustomerTypes)
router = SimpleRouter()
router.register(r'types', customer_views.CustomerTypeViewSet, basename='customertype')
router.register(r'', customer_views.CustomerViewSet, basename='customer') # Register customers at the root of this app's URLs

# Create a nested router for Servers, linked to the 'customer' router
# The first argument to NestedSimpleRouter is the parent router.
# The second argument is the parent_prefix (the URL part for customers, which is r'' here).
# The third argument is the lookup kwarg that will be used to get the parent's PK (e.g., customer_pk).
servers_router = NestedSimpleRouter(router, r'', lookup='customer')
servers_router.register(r'servers', server_views.ServerViewSet, basename='customer-servers')
# Note: The ServerViewSet will receive 'customer_pk' in self.kwargs due to the 'lookup' parameter.

urlpatterns = [
    path('', include(router.urls)),
    path('', include(servers_router.urls)), # Include the nested router's URLs
    path('<int:customer_pk>/servers/<int:pk>/get-info/', ServerInfoView.as_view(), name='customer-servers-get-info'),
]
