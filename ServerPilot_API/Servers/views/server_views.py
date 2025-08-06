import logging
import re
import shlex
import asyncio
import asyncssh
from asgiref.sync import async_to_sync, sync_to_async
from django.core.mail import send_mail
from django.http import Http404
from django.conf import settings
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from ServerPilot_API.Servers.models import Server, FirewallRule
from ServerPilot_API.Customers.models import Customer
from ServerPilot_API.Servers.serializers import (
    ServerSerializer, SecurityScanSerializer, 
    SecurityRecommendationSerializer, FirewallRuleSerializer, 
    InstalledApplicationSerializer
)
from ServerPilot_API.Servers.models import SecurityScan, SecurityRecommendation
from ServerPilot_API.Servers.permissions import IsOwnerOrAdmin, AsyncSessionAuthentication
from ServerPilot_API.audit_log.services import log_action
from ServerPilot_API.security.models import SecurityRisk

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

    @action(detail=True, methods=['get'], url_path='credentials', url_name='server-credentials',
            permission_classes=[])
    def get_credentials(self, request, pk=None, customer_pk=None):
        """
        Retrieve server credentials.
        Only the server owner or admin can view the credentials.
        """
        # Check authentication first
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        try:
            # First check if the server exists and belongs to the specified customer
            try:
                server = Server.objects.get(pk=pk, customer__pk=customer_pk)
            except Server.DoesNotExist:
                return Response(
                    {"detail": "Server not found for the specified customer."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if the user has permission to view these credentials
            if not (request.user.is_staff or server.customer.owner == request.user):
                # Return 404 for security reasons to not leak information about server existence
                return Response(
                    {"detail": "Server not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Prepare the response with sensitive information
            response_data = {
                'id': server.id,
                'server_name': server.server_name,
                'server_ip': server.server_ip,
                'ssh_port': server.ssh_port,
                'login_using_root': server.login_using_root,
                'ssh_user': server.ssh_user if not server.login_using_root else 'root',
                'ssh_password': server.ssh_root_password if server.login_using_root else server.ssh_password,
                'ssh_key_available': bool(server.ssh_key),
                'created_at': server.created_at,
                'updated_at': server.updated_at
            }
            
            # Log the access to credentials
            log_action(
                user=request.user,
                action='server_credentials_viewed',
                request=request,
                details=f'Viewed credentials for server {server.server_name} (ID: {server.id}) from IP {request.META.get("REMOTE_ADDR")}'
            )
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error retrieving server credentials: {str(e)}", exc_info=True)
            return Response(
                {"detail": "An error occurred while retrieving server credentials."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
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
                log_action(
                    self.request.user,
                    'server_create',
                    self.request,
                    f'Created server {server.server_name} (ID: {server.id}) for customer {customer.first_name} {customer.last_name} (ID: {customer.id})'
                )
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
            success, output, exit_status = server.connect_ssh(command=command)

            if success and exit_status == 0:
                logger.info(f"Connection test successful for server {server.id}.")
                log_action(
                    request.user,
                    'server_test_connection',
                    request,
                    f'Successfully tested connection to server {server.server_name} (ID: {server.id})'
                )
                return Response({
                    'status': 'success',
                    'message': 'Connection test successful.',
                    'output': output
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"Connection test failed for server {server.id}: {output}")
                log_action(
                    request.user,
                    'server_test_connection_failed',
                    request,
                    f'Failed to test connection to server {server.server_name} (ID: {server.id}). Error: {output}'
                )
                return Response({
                    'status': 'error',
                    'message': 'Connection test failed.',
                    'details': output
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error during connection test for server {server.id}: {str(e)}", exc_info=True)
            log_action(
                request.user,
                'server_test_connection_error',
                request,
                f'Error testing connection to server {server.server_name} (ID: {server.id}). Error: {str(e)}'
            )
            return Response({
                'status': 'error',
                'message': 'An unexpected error occurred.',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_update(self, serializer):
        server = serializer.save()
        log_action(
            self.request.user,
            'server_update',
            self.request,
            f'Updated server {server.server_name} (ID: {server.id})'
        )

    def perform_destroy(self, instance):
        server_name = instance.server_name
        server_id = instance.id
        instance.delete()
        log_action(
            self.request.user,
            'server_delete',
            self.request,
            f'Deleted server {server_name} (ID: {server_id})'
        )

    @action(detail=True, methods=['post'], url_path='change_password')
    def change_password(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            success, output = server.change_user_password(password)
            if success:
                log_action(request.user, 'server_password_change', request, f'Changed password for server {server.server_name}')
                return Response({'status': 'success', 'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)
            else:
                log_action(request.user, 'server_password_change_failed', request, f'Failed to change password for server {server.server_name}: {output}')
                return Response({'status': 'error', 'message': 'Failed to change password.', 'details': output}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f'Error changing password for server {server.id}: {e}', exc_info=True)
            return Response({'status': 'error', 'message': 'An unexpected error occurred.', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




