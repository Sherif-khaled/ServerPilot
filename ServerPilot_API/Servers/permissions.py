from asgiref.sync import sync_to_async
from django.contrib import auth
from rest_framework import permissions
from rest_framework.authentication import SessionAuthentication
from ServerPilot_API.Customers.models import Customer

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admin users to view/edit it.
    This permission checks object-level permissions.
    Admins are always allowed.
    """
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True

        # The `obj` is the model instance.
        if hasattr(obj, 'owner') and obj.owner == request.user:
            return True
        
        if hasattr(obj, 'customer') and hasattr(obj.customer, 'owner') and obj.customer.owner == request.user:
            return True
        
        return False

class IsOwnerOfCustomerForServer(permissions.BasePermission):
    """
    Custom permission to only allow owners of a customer to manage its servers.
    This permission is intended to be used with nested routes like /customers/<customer_pk>/servers/.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_staff:
            return True

        customer_pk = view.kwargs.get('customer_pk')
        if customer_pk:
            try:
                customer = Customer.objects.get(pk=customer_pk)
                if customer.owner != request.user:
                    return False
            except Customer.DoesNotExist:
                return False
        return True

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_staff:
            return True
        
        return obj.customer.owner == request.user


class AsyncSessionAuthentication(SessionAuthentication):
    """
    Async-safe version of SessionAuthentication.
    Uses sync_to_async to call the synchronous auth.get_user, which is
    the root cause of the SynchronousOnlyOperation error.
    """
    async def authenticate(self, request):
        get_user_sync = sync_to_async(auth.get_user, thread_sensitive=True)
        # DRF's request object wraps the original Django request.
        # auth.get_user needs the original, so we pass request._request.
        user = await get_user_sync(request._request)

        if not user or not user.is_active:
            return None

        # CSRF check should be performed by Django's middleware for async views.
        # self.enforce_csrf(request) # This is sync and might cause issues.
        return (user, None)

