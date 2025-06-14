# This file will typically be used if Servers had their own top-level, non-nested routes.
# For nested routes under Customers, the primary registration happens in the main API urls.py
# or in the Customers app's urls.py if using includes for nesting.

# However, if you want to define non-nested server routes (e.g., /api/servers/ to list all servers a user has access to across their customers),
# you could register a router here.

from django.urls import path, include
from rest_framework_nested import routers
from .views import ServerViewSet
from ServerPilot_API.Customers.views import CustomerViewSet

# Using drf-nested-routers to create nested URLs like /customers/{customer_pk}/servers/
# The main router is for customers
router = routers.DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')

# The nested router is for servers, under customers
servers_router = routers.NestedDefaultRouter(router, r'customers', lookup='customer')
servers_router.register(r'servers', ServerViewSet, basename='customer-servers')

# The basename 'customer-servers' is important for URL reversing.

urlpatterns = [
    path('', include(router.urls)),
    path('', include(servers_router.urls)),
    
    # Add the credentials endpoint to the nested router
    path('customers/<int:customer_pk>/servers/<int:pk>/credentials/', 
         ServerViewSet.as_view({'get': 'get_credentials'}), 
         name='server-credentials'),
]

# For now, we will primarily focus on nested routes defined in the main API urls.py.
# This file can be left empty or used for standalone server routes if needed later.
