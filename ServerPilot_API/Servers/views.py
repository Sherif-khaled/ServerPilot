import logging
import re
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
from .serializers import ServerSerializer, SecurityScanSerializer, SecurityRecommendationSerializer
from .models import SecurityScan, SecurityRecommendation
from .permissions import IsOwnerOrAdmin, AsyncSessionAuthentication
from rest_framework import exceptions
from rest_framework.decorators import action
from ServerPilot_API.audit_log.services import log_action
from ServerPilot_API.security.models import SecurityRisk


def _parse_bandwidth(net_dev_start, net_dev_end):
    """Parse the output of /proc/net/dev to get bandwidth in Mbps."""
    def get_bytes(output):
        rx_total, tx_total = 0, 0
        lines = output.strip().split('\n')[2:]  # Skip header lines
        for line in lines:
            if ':' in line:
                parts = line.split(':')[1].split()
                rx_total += int(parts[0])
                tx_total += int(parts[8])
        return rx_total, tx_total

    try:
        rx_start, tx_start = get_bytes(net_dev_start)
        rx_end, tx_end = get_bytes(net_dev_end)

        # Bytes per second, then convert to Megabits per second
        rx_mbps = (rx_end - rx_start) * 8 / (1024 * 1024)
        tx_mbps = (tx_end - tx_start) * 8 / (1024 * 1024)

        return {'rx_mbps': round(rx_mbps, 2), 'tx_mbps': round(tx_mbps, 2)}
    except (IndexError, ValueError) as e:
        logger.warning(f"Could not parse /proc/net/dev output: {e}")
        return {'rx_mbps': 0, 'tx_mbps': 0}

def _parse_disk_io(iostat_output):
    """Parse the output of iostat to get disk I/O stats in MB/s."""
    lines = iostat_output.strip().split('\n')
    read_mbps, write_mbps = 0.0, 0.0
    # The second report is the one we want, so find the second 'Device' header
    try:
        device_header_index = [i for i, line in enumerate(lines) if line.startswith('Device')][1]
        stats_lines = lines[device_header_index + 1:]
        for line in stats_lines:
            parts = line.split()
            if parts:
                # kBytes_read/s is at index 2, kBytes_wrtn/s is at index 3
                read_mbps += float(parts[2]) / 1024
                write_mbps += float(parts[3]) / 1024
    except (IndexError, ValueError) as e:
        logger.warning(f"Could not parse iostat output: {e}")
        return {'read_mbps': 0, 'write_mbps': 0}

    return {'read_mbps': round(read_mbps, 2), 'write_mbps': round(write_mbps, 2)}

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

    @action(detail=True, methods=['post'], url_path='run-security-scan')
    def run_security_scan(self, request, pk=None, customer_pk=None):
        """
        Initiates a security scan on the server based on predefined security risks.
        """
        server = self.get_object()
        scan = None  # Initialize scan to None
        try:
            risks = SecurityRisk.objects.filter(is_enabled=True)
            scan = SecurityScan.objects.create(server=server)

            for risk in risks:
                logger.info(f"[Security Scan] Checking risk Pattern: '{risk.match_pattern}' for server: {server.id}")
                logger.info(f"[Security Scan] Checking risk: '{risk.title}' for server: {server.id}")
                logger.debug(f"[Security Scan] Executing command: {risk.check_command}")
                
                # connect_ssh now returns (success, output, exit_status)
                conn_success, output, exit_status = server.connect_ssh(command=risk.check_command)

                if not conn_success:
                    logger.warning(f"[Security Scan] SSH connection failed for risk '{risk.title}': {output}")
                    continue

                logger.debug(f"[Security Scan] Command for '{risk.title}' executed with exit code {exit_status}. Output:\n{output}")

                # For normal checks, a non-zero exit code means the command failed, so we skip it.
                # If expect_non_zero_exit is True, we proceed regardless of the exit code, 
                # as the command is expected to 'fail' to indicate a risk.
                if not risk.expect_non_zero_exit and exit_status != 0:
                    logger.warning(f"[Security Scan] Command for risk '{risk.title}' failed with exit code {exit_status}. Skipping pattern match.")
                    continue

                logger.debug(f"[Security Scan] Proceeding to match pattern: '{risk.match_pattern}'")
                match_found = bool(re.search(risk.match_pattern, output))
                logger.info(f"[Security Scan] Match found for '{risk.title}': {match_found}")

                if match_found:
                    logger.info(f"[Security Scan] Creating recommendation for risk: '{risk.title}'")
                    SecurityRecommendation.objects.create(
                        scan=scan,
                        risk_level=risk.risk_level,
                        title=risk.title,
                        description=risk.description,
                        solution=risk.fix_command,
                        status='pending'  # Explicitly set status for found risks
                    )
                else:
                    # If no match was found, it means the check passed.
                    logger.info(f"[Security Scan] Check passed for: '{risk.title}'")
                    SecurityRecommendation.objects.create(
                        scan=scan,
                        risk_level='low',  # Passed checks are considered low risk/informational
                        title=f"{risk.title}",
                        description='This security check passed successfully.',
                        solution='No action required.',
                        status='passed'
                    )
            
            scan.status = 'completed'
            scan.save()
            scan.refresh_from_db()  # Reload the scan object to include recommendations

            serializer = SecurityScanSerializer(scan)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            # If the scan was created but an error occurred, mark it as failed.
            if scan and scan.pk:
                scan.status = 'failed'
                scan.save()
            logger.error(f'Error running security scan for server {server.id}: {e}', exc_info=True)
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def fix_recommendation(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        recommendation_id = request.data.get('recommendation_id')
        if not recommendation_id:
            return Response({'error': 'recommendation_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recommendation = SecurityRecommendation.objects.get(pk=recommendation_id, scan__server=server)

            if not recommendation.solution:
                return Response({'error': 'No solution command available for this recommendation.'}, status=status.HTTP_400_BAD_REQUEST)

            command_to_run = recommendation.solution
            # For commands that require interactive confirmation, run them non-interactively.
            if 'ufw enable' in command_to_run:
                command_to_run = f'echo y | {command_to_run}'

            success, output, exit_status = server.connect_ssh(command=command_to_run, timeout=60)

            if success:
                recommendation.status = 'fixed'
                recommendation.save()
                log_action(request.user, 'recommendation_fix', request, f'Successfully fixed recommendation "{recommendation.title}" on server {server.server_name}')
                return Response({'status': 'success', 'message': 'Recommendation fixed successfully.'}, status=status.HTTP_200_OK)
            else:
                log_action(request.user, 'recommendation_fix_failed', request, f'Failed to fix recommendation "{recommendation.title}" on server {server.server_name}: {output}')
                return Response({'status': 'error', 'message': 'Failed to apply fix.', 'details': output}, status=status.HTTP_400_BAD_REQUEST)

        except SecurityRecommendation.DoesNotExist:
            return Response({'error': 'Recommendation not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f'Error fixing recommendation {recommendation_id} for server {pk}: {e}', exc_info=True)
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='latest-security-scan')
    def latest_security_scan(self, request, *args, **kwargs):
        server = self.get_object()
        latest_scan = SecurityScan.objects.filter(server=server).order_by('-scanned_at').first()
        if not latest_scan:     
            return Response({'message': 'No security scans found for this server.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = SecurityScanSerializer(latest_scan)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='recommendations/update-status')
    def update_recommendation_status(self, request, *args, **kwargs):
        server = self.get_object()
        recommendation_id = request.data.get('recommendation_id')
        new_status = request.data.get('status')

        if not recommendation_id or not new_status:
            return Response({'error': 'recommendation_id and status are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recommendation = SecurityRecommendation.objects.get(id=recommendation_id, scan__server=server)
            recommendation.status = new_status
            recommendation.save()
            return Response(SecurityRecommendationSerializer(recommendation).data)
        except SecurityRecommendation.DoesNotExist:
            return Response({'error': 'Recommendation not found.'}, status=status.HTTP_404_NOT_FOUND)


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

            BYTES_PER_GB = 1024**3

            async with asyncssh.connect(
                str(server.server_ip), port=server.ssh_port, **conn_options
            ) as conn:
                # --- Concurrently run all commands --- #
                # --- Concurrently run all commands (first reading) --- #
                results1 = await asyncio.gather(
                    conn.run('lsb_release -a | grep Description | cut -f2-'),
                    conn.run("grep 'cpu ' /proc/stat"),
                    conn.run('free -b'),
                    conn.run('df -B1'),
                    conn.run('nproc'),
                    conn.run('iostat -d -k 1 2'), # For disk I/O
                    conn.run('cat /proc/net/dev'), # For bandwidth
                    conn.run('uptime -p'),
                    conn.run('cat /proc/swaps'),
                )

                await asyncio.sleep(1)

                # --- Concurrently run all commands (second reading) --- #
                results2 = await asyncio.gather(
                    conn.run("grep 'cpu ' /proc/stat"),
                    conn.run('cat /proc/net/dev'),
                )

                # After sleep, get the second CPU stat
                cpu_result2 = await conn.run("grep 'cpu ' /proc/stat")

                os_result, cpu_result1, mem_result, disk_result, nproc_result, iostat_result, net_dev_result1, uptime_result, swap_result = results1
                cpu_result2, net_dev_result2, *_ = results2

                # --- Process SWAP Info --- #
                swap_data = {
                    'enabled': False,
                    'total_gb': 0,
                    'used_gb': 0,
                    'free_gb': 0
                }
                if swap_result.stdout:
                    lines = swap_result.stdout.strip().split('\n')
                    if len(lines) > 1:
                        parts = lines[1].split()
                        if len(parts) >= 4:
                            total_kb = int(parts[2])
                            used_kb = int(parts[3])
                            
                            total_gb = total_kb / (1024 * 1024)
                            used_gb = used_kb / (1024 * 1024)
                            free_gb = total_gb - used_gb
                            
                            swap_data = {
                                'enabled': True,
                                'total_gb': round(total_gb, 2),
                                'used_gb': round(used_gb, 2),
                                'free_gb': round(free_gb, 2)
                            }

                # --- Process CPU Usage --- #
                cpu_usage = 0
                if cpu_result1.stdout and cpu_result2.stdout:
                    cpu_line1 = list(map(int, cpu_result1.stdout.split()[1:]))
                    cpu_line2 = list(map(int, cpu_result2.stdout.split()[1:]))
                    total_diff = sum(cpu_line2) - sum(cpu_line1)
                    idle_diff = cpu_line2[3] - cpu_line1[3]
                    cpu_usage = 100 * (total_diff - idle_diff) / total_diff if total_diff else 0

                cpu_data = {
                    'cores': int(nproc_result.stdout.strip()),
                    'cpu_usage_percent': round(cpu_usage, 2),
                }

                # --- Process Memory and Swap --- #
                mem_lines = mem_result.stdout.strip().split('\n')
                mem_parts = mem_lines[1].split()
                swap_parts = mem_lines[2].split()
                memory_data = {
                    'total_gb': round(int(mem_parts[1]) / BYTES_PER_GB, 2),
                    'used_gb': round(int(mem_parts[2]) / BYTES_PER_GB, 2),
                    'available_gb': round(int(mem_parts[6]) / BYTES_PER_GB, 2),
                }
                swap_data = {
                    'total_gb': round(int(swap_parts[1]) / BYTES_PER_GB, 2),
                    'used_gb': round(int(swap_parts[2]) / BYTES_PER_GB, 2),
                }

                # --- Process Disk Usage --- #
                disk_lines = disk_result.stdout.strip().split('\n')[1:]
                disks_data = []
                for line in disk_lines:
                    parts = line.split()
                    if parts[0].startswith('/dev/'): # Filter for physical devices
                        total_gb = round(int(parts[1]) / BYTES_PER_GB, 2)
                        used_gb = round(int(parts[2]) / BYTES_PER_GB, 2)
                        available_gb = round(int(parts[3]) / BYTES_PER_GB, 2)
                        disks_data.append({
                            'filesystem': parts[0],
                            'total_gb': total_gb,
                            'used_gb': used_gb,
                            'available_gb': available_gb,
                            'use_percent': int(parts[4].replace('%', '')),
                            'mountpoint': parts[5],
                        })

                # --- Final Data Structure --- #
                # --- Process Disk I/O ---
                disk_io_data = _parse_disk_io(iostat_result.stdout)

                # --- Final Data Structure --- #
                # --- Process Bandwidth ---
                bandwidth_data = _parse_bandwidth(net_dev_result1.stdout, net_dev_result2.stdout)

                # --- Final Data Structure --- #
                data = {
                    'os_info': os_result.stdout.strip(),
                    'cpu': cpu_data,
                    'memory': memory_data,
                    'swap': swap_data,
                    'disks': disks_data,
                    'disk_io': disk_io_data,
                    'bandwidth': bandwidth_data,
                    'uptime': uptime_result.stdout.strip(),
                    'swap': swap_data,
                    'thresholds': {
                        'cpu': server.cpu_threshold,
                        'memory': server.memory_threshold,
                        'disk': server.disk_threshold,
                    }
                }
                return Response({"serverName": server.server_name, "data": data})

        except asyncssh.Error as e:
            logger.error(f"SSH connection failed for server {server.id}: {e}", exc_info=True)
            return Response({"error": f"SSH connection failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"An unexpected error occurred in get_info for server {server.id}: {e}", exc_info=True)
            return Response({"error": "An unexpected error occurred during server info retrieval."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
