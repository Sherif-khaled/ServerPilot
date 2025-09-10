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
from ServerPilot_API.Servers.models import Server, FirewallRule, ServerCredential
from ServerPilot_API.Customers.models import Customer
from ServerPilot_API.Servers.serializers import (
    ServerSerializer, SecurityScanSerializer, 
    SecurityRecommendationSerializer, FirewallRuleSerializer, 
    InstalledApplicationSerializer,
    ServerCredentialListSerializer, ServerCredentialCreateSerializer,
)
from ServerPilot_API.Servers.models import SecurityScan, SecurityRecommendation
from ServerPilot_API.Servers.permissions import IsOwnerOrAdmin, AsyncSessionAuthentication
from ServerPilot_API.audit_log.services import log_action
from ServerPilot_API.security.models import SecurityRisk
from ServerPilot_API.security.crypto import encrypt_secret, decrypt_secret

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

    @action(detail=True, methods=['get', 'post'], url_path='credentials')
    def credentials(self, request, pk=None, customer_pk=None):
        """
        GET: List stored credentials metadata for the server.
        POST: Create a new encrypted credential for the server.

        RBAC: Only admins or server owners can list or add credentials.
        """
        # Authentication check
        if not request.user or not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)

        # Fetch server and verify ownership
        try:
            server = Server.objects.get(pk=pk, customer__pk=customer_pk)
        except Server.DoesNotExist:
            return Response({"detail": "Server not found for the specified customer."}, status=status.HTTP_404_NOT_FOUND)

        if not (request.user.is_staff or server.customer.owner == request.user):
            # Hide existence
            return Response({"detail": "Server not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method.lower() == 'get':
            creds = ServerCredential.objects.filter(server=server).order_by('-created_at')
            data = ServerCredentialListSerializer(creds, many=True).data
            return Response(data, status=status.HTTP_200_OK)

        # POST create
        serializer = ServerCredentialCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data['username']
        secret = serializer.validated_data['secret']

        try:
            enc = encrypt_secret(secret.encode('utf-8'))
            cred = ServerCredential.objects.create(
                server=server,
                username=username,
                ciphertext=enc['ciphertext'],
                nonce=enc['nonce'],
                encrypted_dek=enc['encrypted_dek'],
            )
            log_action(
                request.user,
                'server_credential_created',
                request,
                f'Created credential for user {username} on server {server.server_name} (ID: {server.id})'
            )
            return Response(ServerCredentialListSerializer(cred).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error("Error creating server credential", exc_info=True)
            return Response({"detail": "Failed to store credential."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='credentials/(?P<cred_id>[^/.]+)/reveal')
    def reveal_credential(self, request, pk=None, customer_pk=None, cred_id=None):
        """
        Reveal plaintext secret for a specific credential.
        RBAC: Only admins or server owners (operator) may access.
        """
        if not request.user or not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            server = Server.objects.get(pk=pk, customer__pk=customer_pk)
        except Server.DoesNotExist:
            return Response({"detail": "Server not found for the specified customer."}, status=status.HTTP_404_NOT_FOUND)

        if not (request.user.is_staff or server.customer.owner == request.user):
            return Response({"detail": "Server not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            cred = ServerCredential.objects.get(pk=cred_id, server=server)
        except ServerCredential.DoesNotExist:
            return Response({"detail": "Credential not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            plaintext = decrypt_secret({
                'ciphertext': bytes(cred.ciphertext),
                'nonce': bytes(cred.nonce),
                'encrypted_dek': bytes(cred.encrypted_dek),
            })
            # Return as UTF-8 if possible, else base64
            try:
                value = plaintext.decode('utf-8')
                encoding = 'utf-8'
            except UnicodeDecodeError:
                import base64
                value = base64.b64encode(plaintext).decode('ascii')
                encoding = 'base64'

            log_action(
                request.user,
                'server_credential_revealed',
                request,
                f'Revealed credential for user {cred.username} on server {server.server_name} (ID: {server.id})'
            )
            return Response({'id': cred.id, 'username': cred.username, 'secret': value, 'encoding': encoding}, status=status.HTTP_200_OK)
        except Exception:
            logger.error("Error decrypting credential", exc_info=True)
            return Response({"detail": "Failed to decrypt credential."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # For non-staff users
        queryset = Server.objects.filter(customer__owner=user)
        if customer_pk:
            queryset = queryset.filter(customer__pk=customer_pk)
        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='credentials/(?P<cred_id>[^/.]+)/test_connection')
    def test_connection_with_credential(self, request, pk=None, customer_pk=None, cred_id=None):
        """
        Test SSH connection using a stored encrypted credential.

        Tries to detect whether the secret is a password or an SSH private key.
        Does not log plaintext. Returns status and output.
        """
        if not request.user or not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            server = Server.objects.get(pk=pk, customer__pk=customer_pk)
        except Server.DoesNotExist:
            return Response({"detail": "Server not found for the specified customer."}, status=status.HTTP_404_NOT_FOUND)

        if not (request.user.is_staff or server.customer.owner == request.user):
            return Response({"detail": "Server not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            cred = ServerCredential.objects.get(pk=cred_id, server=server)
        except ServerCredential.DoesNotExist:
            return Response({"detail": "Credential not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            secret_bytes = decrypt_secret({
                'ciphertext': bytes(cred.ciphertext),
                'nonce': bytes(cred.nonce),
                'encrypted_dek': bytes(cred.encrypted_dek),
            })
        except Exception:
            logger.error("Error decrypting credential for test_connection", exc_info=True)
            return Response({"detail": "Failed to decrypt credential."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Attempt SSH using paramiko without persisting secret
        import paramiko, io
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            username = cred.username
            hostname = str(server.server_ip)
            port = server.ssh_port
            # Try interpreting secret as private key first
            secret_str = None
            try:
                secret_str = secret_bytes.decode('utf-8')
            except Exception:
                secret_str = None

            connection_args = {
                'hostname': hostname,
                'port': port,
                'username': username,
                'timeout': 10,
                'look_for_keys': False,
                'allow_agent': False,
            }

            used_key = False
            if secret_str:
                key_types = [paramiko.RSAKey, paramiko.Ed25519Key, paramiko.ECDSAKey]
                for kt in key_types:
                    try:
                        key_file_obj = io.StringIO(secret_str)
                        pkey = kt.from_private_key(key_file_obj, password=None)
                        connection_args['pkey'] = pkey
                        connection_args['password'] = None
                        used_key = True
                        break
                    except paramiko.SSHException:
                        continue

            if not used_key:
                # Fallback: use as password
                connection_args['password'] = secret_bytes.decode('utf-8', errors='ignore')

            client.connect(**connection_args)
            stdin, stdout, stderr = client.exec_command('echo "Connection successful!"', timeout=10)
            output = stdout.read().decode('utf-8', errors='replace').strip()
            error_out = stderr.read().decode('utf-8', errors='replace').strip()
            if error_out:
                output += f"\n{error_out}"
            log_action(request.user, 'server_test_connection_with_credential', request, f'Tested connection with credential id={cred.id} on server {server.server_name} (ID: {server.id})')
            return Response({'status': 'success', 'message': 'Connection test successful.', 'output': output}, status=status.HTTP_200_OK)
        except paramiko.AuthenticationException as e:
            return Response({'status': 'error', 'message': 'Authentication failed.', 'details': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error("Error testing connection with credential", exc_info=True)
            return Response({'status': 'error', 'message': 'Connection test failed.', 'details': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            try:
                client.close()
            except Exception:
                pass

        
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

    @action(detail=False, methods=['post'], url_path='test_connection')
    def test_connection_with_payload(self, request, *args, **kwargs):
        """
        Tests SSH connection using credentials provided in the request body.
        Uses direct paramiko connection (no legacy Server fields).
        Expected payload fields:
          - server_ip (str)
          - ssh_port (int, optional, default 22)
          - username (str, required)
          - secret (str, required)  # password or PEM private key
          - command (str, optional)
        """
        # Basic validation of presence
        server_ip = request.data.get('server_ip')
        if not server_ip:
            return Response({'status': 'error', 'message': 'Validation error.', 'details': 'server_ip is required.'}, status=status.HTTP_400_BAD_REQUEST)

        ssh_port = int(request.data.get('ssh_port', 22))
        username = request.data.get('username')
        secret = request.data.get('secret')
        command = request.data.get('command', 'echo "Connection successful!"')

        if not username or not secret:
            return Response({'status': 'error', 'message': 'Validation error.', 'details': 'username and secret are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Attempt paramiko connection
        import paramiko, io
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            connection_args = {
                'hostname': str(server_ip),
                'port': ssh_port,
                'username': username,
                'timeout': 10,
                'look_for_keys': False,
                'allow_agent': False,
            }

            # Try PEM key first
            used_key = False
            try:
                if 'BEGIN' in secret and 'KEY' in secret:
                    key_types = [paramiko.RSAKey, paramiko.Ed25519Key, paramiko.ECDSAKey]
                    for kt in key_types:
                        try:
                            key_file_obj = io.StringIO(secret)
                            pkey = kt.from_private_key(key_file_obj, password=None)
                            connection_args['pkey'] = pkey
                            connection_args['password'] = None
                            used_key = True
                            break
                        except paramiko.SSHException:
                            continue
            except Exception:
                used_key = False

            if not used_key:
                connection_args['password'] = secret

            client.connect(**connection_args)
            stdin, stdout, stderr = client.exec_command(command, timeout=10)
            output = stdout.read().decode('utf-8', errors='replace').strip()
            error_out = stderr.read().decode('utf-8', errors='replace').strip()
            if error_out:
                output += f"\n{error_out}"

            log_action(request.user, 'server_test_connection', request, f'Successfully tested connection to server IP {server_ip} (transient)')
            return Response({'status': 'success', 'message': 'Connection test successful.', 'output': output}, status=status.HTTP_200_OK)
        except paramiko.AuthenticationException as e:
            log_action(request.user, 'server_test_connection_failed', request, f'Authentication failed testing server IP {server_ip}: {str(e)}')
            return Response({'status': 'error', 'message': 'Authentication failed.', 'details': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error during transient connection test for IP {server_ip}: {str(e)}", exc_info=True)
            log_action(request.user, 'server_test_connection_error', request, f'Error testing connection to server IP {server_ip}. Error: {str(e)}')
            return Response({'status': 'error', 'message': 'An unexpected error occurred.', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            try:
                client.close()
            except Exception:
                pass

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




