from django.urls import path, include
from rest_framework.routers import SimpleRouter
from rest_framework_nested.routers import NestedSimpleRouter
from . import views as customer_views
from ServerPilot_API.Servers import views as server_views
from ServerPilot_API.Servers.views.installed_applications_view import InstalledApplicationViewSet
from ServerPilot_API.Servers.views.firewall_rules_view import FirewallRuleViewSet
from ServerPilot_API.Servers.views.security_advisor_view import SecurityAdvisorViewSet
from ServerPilot_API.Servers.views.server_info_view import ServerInfoViewSet
from rest_framework_nested import routers

# --- Parent Router for Customers ---
router = SimpleRouter()
router.register(r'types', customer_views.CustomerTypeViewSet, basename='customertype')
router.register(r'', customer_views.CustomerViewSet, basename='customer')

# --- Nested Router for Servers ---
# This creates URLs like: /customers/<customer_pk>/servers/
servers_router = NestedSimpleRouter(router, r'', lookup='customer')
servers_router.register(r'servers', server_views.ServerViewSet, basename='customer-servers')

# --- Nested Router for Applications --- 
applications_router = NestedSimpleRouter(servers_router, r'servers', lookup='server')
applications_router.register(r'installed-applications', InstalledApplicationViewSet, basename='server-applications')

# --- Nested Router for Firewall Rules ---
firewall_rules_router = NestedSimpleRouter(servers_router, r'servers', lookup='server')
firewall_rules_router.register(r'firewall', FirewallRuleViewSet, basename='server-firewall-rules')

# --- Nested Router for Security Advisor ---
security_advisor_router = NestedSimpleRouter(servers_router, r'servers', lookup='server')
security_advisor_router.register(r'security-advisor', SecurityAdvisorViewSet, basename='server-security-advisor')

# --- Nested Router for Server Info ---
servers_info_router = NestedSimpleRouter(servers_router, r'servers', lookup='server')
servers_info_router.register(r'server-info', ServerInfoViewSet, basename='server-info')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(servers_router.urls)),
    path('', include(servers_info_router.urls)),
    path('', include(applications_router.urls)),
    path('', include(firewall_rules_router.urls)),
    path('', include(security_advisor_router.urls)),
]
