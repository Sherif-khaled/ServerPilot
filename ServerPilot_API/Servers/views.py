import logging
import asyncssh
import asyncio
from asgiref.sync import sync_to_async
from django.http import Http404
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from .models import Server
from ServerPilot_API.Customers.models import Customer
from .serializers import ServerSerializer
from .permissions import IsOwnerOrAdmin, AsyncSessionAuthentication
from rest_framework import exceptions

logger = logging.getLogger(__name__)



class ServerViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows servers to be viewed or edited.
    Provides actions for CRUD operations on servers, typically nested under a customer.
    e.g., /api/customers/<customer_pk>/servers/
    """
    queryset = Server.objects.all()
    serializer_class = ServerSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    
    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """
        context = super().get_serializer_context()
        context['customer_id'] = self.kwargs.get('customer_pk')
        return context

    def get_queryset(self):
        """
        This view should return a list of all the servers.
        - Admins see all servers (or filtered by customer if nested).
        - Regular users see only servers belonging to their customers.
        """
        user = self.request.user
        customer_pk = self.kwargs.get('parent_lookup_customer') or self.kwargs.get('customer_pk')

        if user.is_staff:
            queryset = Server.objects.all()
            if customer_pk:
                queryset = queryset.filter(customer__pk=customer_pk)
            return queryset.order_by('-created_at')
        
        # For non-staff users
        queryset = Server.objects.filter(customer__owner=user)
        if customer_pk:
            queryset = queryset.filter(customer__pk=customer_pk)
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        """
        Associate the server with the customer specified in the URL.
        Ensures the customer is owned by the requesting user.
        """
        request = self.request
        customer_pk = self.kwargs.get('customer_pk')
        
        logger.info(f"Attempting to create server. Customer PK: {customer_pk}, User: {request.user.id}")
        logger.debug(f"Request data: {request.data}")
        
        if not customer_pk:
            error_msg = "Customer ID is required in the URL."
            logger.error(error_msg)
            raise serializers.ValidationError({"customer": [error_msg]})
        
        try:
            # Verify the customer exists and is owned by the current user
            customer = Customer.objects.get(pk=customer_pk, owner=request.user)
            logger.debug(f"Found customer: {customer.id}")
            
            # Save the server with the customer
            try:
                server = serializer.save(customer=customer)
                logger.info(f"Successfully created server: {server.id}")
            except Exception as save_error:
                logger.error(f"Error saving server: {str(save_error)}", exc_info=True)
                raise
            
        except Customer.DoesNotExist:
            error_msg = f"Customer not found (ID: {customer_pk}) or not owned by user {request.user.id}"
            logger.error(error_msg)
            raise serializers.ValidationError({"customer": [error_msg]})
            
        except serializers.ValidationError as ve:
            logger.error(f"Validation error: {str(ve)}")
            raise
            
        except Exception as e:
            error_msg = f"Unexpected error creating server: {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise serializers.ValidationError({"non_field_errors": [error_msg]})
    
    def create(self, request, *args, **kwargs):
        """Handle server creation with better request/response logging."""
        logger.info(f"Create server request - User: {request.user.id}")
        logger.debug(f"Request headers: {dict(request.headers)}")
        logger.debug(f"Request data: {request.data}")
        
        try:
            response = super().create(request, *args, **kwargs)
            logger.info(f"Server created successfully - Status: {response.status_code}")
            return response
        except Exception as e:
            logger.error(f"Error in create: {str(e)}", exc_info=True)
            raise

    @action(detail=True, methods=['post'])
    def test_connection(self, request, *args, **kwargs):
        """
        Tests the SSH connection to a server.
        Accepts an optional 'command' in the request body.
        """
        server = self.get_object()
        command = request.data.get('command', 'echo "Connection successful!"')

        logger.info(f"Testing connection for server: {server.id} ({server.server_name})")
        
        try:
            success, output = server.connect_ssh(command=command)

            if success:
                logger.info(f"Connection test successful for server {server.id}.")
                return Response({
                    'status': 'success',
                    'message': 'Connection test successful.',
                    'output': output
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"Connection test failed for server {server.id}: {output}")
                return Response({
                    'status': 'error',
                    'message': 'Connection test failed.',
                    'details': output
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error during connection test for server {server.id}: {str(e)}", exc_info=True)
            return Response({
                'status': 'error',
                'message': 'An unexpected error occurred.',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Optional: Override other methods like perform_update, perform_destroy if specific logic is needed.
    # For example, to prevent changing the 'customer' field during an update:
    # def perform_update(self, serializer):
    #     serializer.save(customer=self.get_object().customer) # Ensure customer is not changed


class AsyncAPIView(APIView):
    """
    A custom APIView that is fully async-aware, overriding dispatch
    to correctly handle async authentication and request handlers.
    """
    async def dispatch(self, request, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        request = self.initialize_request(request, *args, **kwargs)
        self.request = request
        self.headers = self.default_response_headers

        try:
            await self.initial(request, *args, **kwargs)

            if request.method.lower() in self.http_method_names:
                handler = getattr(self, request.method.lower(), self.http_method_not_allowed)
            else:
                handler = self.http_method_not_allowed
            
            response = await handler(request, *args, **kwargs)

        except Exception as exc:
            response = self.handle_exception(exc)

        self.response = self.finalize_response(request, response, *args, **kwargs)
        return self.response

    async def initial(self, request, *args, **kwargs):
        self.format_kwarg = self.get_format_suffix(**kwargs)
        neg = self.perform_content_negotiation(request)
        request.accepted_renderer, request.accepted_media_type = neg
        version, scheme = self.determine_version(request, *args, **kwargs)
        request.version, request.versioning_scheme = version, scheme
        
        await self.perform_authentication(request)
        
        self.check_permissions(request)
        self.check_throttles(request)

    async def perform_authentication(self, request):
        authenticators = self.get_authenticators()
        if not authenticators:
            request.user = None
            request.auth = None
            return

        for authenticator in authenticators:
            try:
                user_auth_tuple = await authenticator.authenticate(request)
                if user_auth_tuple is not None:
                    request.user, request.auth = user_auth_tuple
                    return
            except exceptions.APIException as exc:
                raise exc
        
        request.user = None
        request.auth = None


class ServerInfoView(AsyncAPIView):
    """
    An async-native API view to get live server information.
    """
    authentication_classes = [AsyncSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @sync_to_async(thread_sensitive=True)
    def _get_server_and_check_perms(self, pk, customer_pk, user):
        try:
            server = Server.objects.select_related('customer__owner').get(pk=pk, customer__pk=customer_pk)
            if server.customer.owner != user:
                raise PermissionDenied("You do not have permission to access this server.")
            return server
        except Server.DoesNotExist:
            raise Http404("Server not found.")

    async def get(self, request, customer_pk=None, pk=None):
        # Authentication is now handled correctly by the async dispatch method.
        try:
            server = await self._get_server_and_check_perms(pk, customer_pk, request.user)
        except PermissionDenied as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Http404:
            return Response({"error": "Server not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            conn_options = {'known_hosts': None}
            if server.ssh_key:
                conn_options['client_keys'] = [asyncssh.import_private_key(server.ssh_key)]

            if server.login_using_root:
                conn_options['username'] = 'root'
                if hasattr(server, 'ssh_root_password') and server.ssh_root_password:
                    conn_options['password'] = server.ssh_root_password
            else:
                conn_options['username'] = server.ssh_user
                if hasattr(server, 'ssh_password') and server.ssh_password:
                    conn_options['password'] = server.ssh_password

            async with asyncssh.connect(
                str(server.server_ip), port=server.ssh_port, **conn_options
            ) as conn:
                os_result = await conn.run('uname -a', check=True)
                cpu_result1 = await conn.run("grep 'cpu ' /proc/stat", check=True)
                await asyncio.sleep(1)
                cpu_result2 = await conn.run("grep 'cpu ' /proc/stat", check=True)
                mem_result = await conn.run('free -m', check=True)
                disk_result = await conn.run('df -h /', check=True)

                cpu_line1 = list(map(int, cpu_result1.stdout.split()[1:]))
                cpu_line2 = list(map(int, cpu_result2.stdout.split()[1:]))
                total_diff = sum(cpu_line2) - sum(cpu_line1)
                idle_diff = cpu_line2[3] - cpu_line1[3]
                cpu_usage = 100 * (total_diff - idle_diff) / total_diff if total_diff else 0

                mem_lines = mem_result.stdout.strip().split('\n')
                mem_parts = mem_lines[1].split()
                total_mem, used_mem = int(mem_parts[1]), int(mem_parts[2])
                mem_usage = (used_mem / total_mem) * 100 if total_mem else 0

                disk_lines = disk_result.stdout.strip().split('\n')
                disk_parts = disk_lines[1].split()
                total_disk, used_disk, disk_percent = disk_parts[1], disk_parts[2], disk_parts[4]

                data = {
                    'os': os_result.stdout.strip(),
                    'cpu_usage': f'{cpu_usage:.2f}%',
                    'memory_usage': f'{mem_usage:.2f}% ({used_mem}MB / {total_mem}MB)',
                    'disk_usage': f'{disk_percent} ({used_disk} / {total_disk})'
                }
                return Response(data)

        except asyncssh.Error as e:
            logger.error(f"SSH connection failed for server {server.id}: {e}", exc_info=True)
            return Response({"error": f"SSH connection failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"An unexpected error occurred in get_info for server {server.id}: {e}", exc_info=True)
            return Response({"error": "An unexpected error occurred during server info retrieval."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
