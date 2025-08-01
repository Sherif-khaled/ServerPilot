import logging
import re
import shlex
import asyncio
import asyncssh
from asgiref.sync import async_to_sync, sync_to_async
from django.http import Http404
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from .models import Server, FirewallRule
from ServerPilot_API.Customers.models import Customer
from .serializers import (
    ServerSerializer, SecurityScanSerializer, 
    SecurityRecommendationSerializer, FirewallRuleSerializer, 
    InstalledApplicationSerializer
)
from .models import SecurityScan, SecurityRecommendation
from .permissions import IsOwnerOrAdmin, AsyncSessionAuthentication
from ServerPilot_API.audit_log.services import log_action
from ServerPilot_API.security.models import SecurityRisk
from ServerPilot_API.server_applications.models import Application

logger = logging.getLogger(__name__)


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

    @action(detail=True, methods=['post'], url_path='execute-fix')
    def execute_fix(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        commands = request.data.get('commands', [])
        if not commands:
            return Response({'error': 'Commands are required.'}, status=status.HTTP_400_BAD_REQUEST)

        async def run_commands():
            async with asyncssh.connect(
                server.server_ip,
                port=server.ssh_port,
                username='root',
                password=server.ssh_root_password,
                known_hosts=None
            ) as conn:
                results = []
                for command in commands:
                    result = await conn.run(command, check=False)
                    results.append({
                        'command': command,
                        'stdout': result.stdout,
                        'stderr': result.stderr,
                        'exit_code': result.exit_status
                    })
                return results

        try:
            results = asyncio.run(run_commands())
            return Response({'results': results})
        except Exception as e:
            logger.error(f"Error executing fix on server {server.id}: {e}", exc_info=True)
            return Response({'error': f'Failed to execute commands: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='latest-security-scan')
    def latest_security_scan(self, request, *args, **kwargs):
        server = self.get_object()
        latest_scan = SecurityScan.objects.filter(server=server).order_by('-scanned_at').first()
        if not latest_scan:     
            return Response({'message': 'No security scans found for this server.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = SecurityScanSerializer(latest_scan)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='toggle-firewall')
    def toggle_firewall(self, request, pk=None, customer_pk=None):
        """
        Toggles the firewall for a server.
        """
        server = self.get_object()
        if server.firewall_enabled:
            success, output, exit_status = server.connect_ssh(command='sudo ufw disable')
            if not success:
                return Response({"error": f"Failed to disable firewall: {output}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            success, output, exit_status = server.connect_ssh(command='echo y | sudo ufw enable')
            if not success:
                return Response({"error": f"Failed to enable firewall: {output}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        server.firewall_enabled = not server.firewall_enabled
        server.save()
        status_text = "enabled" if server.firewall_enabled else "disabled"
        log_action(user=request.user, action=f'Firewall {status_text}', request=request, details=f"Firewall for server '{server.server_name}' was {status_text}.")
        return Response({'status': f'Firewall {status_text}', 'firewall_enabled': server.firewall_enabled}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='ufw-rules')
    def get_ufw_rules(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        success, output, exit_status = server.connect_ssh(command='sudo ufw status numbered')

        if not success:
            return Response({"error": f"Failed to connect to server: {output}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # A non-zero exit status might not be an error if UFW is just inactive, but we can check the output.
        # We proceed and let the parser handle cases where rules are not present.

        try:
            rules = []
            lines = output.strip().split('\n')
            # Find the start of the rules table
            rules_start_index = next(i for i, line in enumerate(lines) if '----' in line) + 1

            for line in lines[rules_start_index:]:
                # This regex is designed to be more robust for UFW's output format.
                match = re.match(r'\s*\[\s*(\d+)\]\s+(.*?)\s+(ALLOW|DENY|REJECT)\s+IN\s+(.*)', line)
                if match:
                    port_protocol_str = match.group(2).strip()
                    port, protocol = (port_protocol_str.split('/') + [None])[:2]
                    rules.append({
                        'id': match.group(1),
                        'port': port,
                        'protocol': protocol,
                        'action': match.group(3).strip(),
                        'source': match.group(4).strip(),
                    })
            return Response(rules, status=status.HTTP_200_OK)
        except StopIteration:
            # This means the '----' line wasn't found, which is normal if UFW is inactive or has no rules.
            return Response([], status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error parsing UFW rules for server {server.id}: {e}", exc_info=True)
            return Response({"error": "Failed to parse UFW rules."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='add-ufw-rule')
    def add_ufw_rule(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        port = request.data.get('port')
        action = request.data.get('action', 'allow')
        protocol = request.data.get('protocol')
        source = request.data.get('source')

        # Start building the command
        command = f'sudo ufw {action} '

        # Check if a specific source IP is provided
        if source and source.lower() not in ['anywhere', 'any', '0.0.0.0/0', '']:
            command += f'from {source} to any port {port}'
            if protocol and not protocol.startswith('custom'):
                command += f' proto {protocol}'
        else:
            # No specific source, so use the simpler format
            command += f'{port}'
            if protocol and not protocol.startswith('custom'):
                command += f'/{protocol}'

        success, output, _ = server.connect_ssh(command=command)
        if not success:
            return Response({"error": f"Failed to add rule: {output}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"status": "Rule added successfully"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='delete-ufw-rule')
    def delete_ufw_rule(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        rule_id = request.data.get('id')

        if not rule_id:
            return Response({"error": "Rule ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        command = f'echo y | sudo ufw delete {rule_id}'
        success, output, _ = server.connect_ssh(command=command)
        if not success:
            return Response({"error": f"Failed to delete rule: {output}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"status": "Rule deleted successfully"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='edit-ufw-rule')
    def edit_ufw_rule(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        rule_id = request.data.get('id')
        new_port = request.data.get('port')
        new_action = request.data.get('action')
        new_protocol = request.data.get('protocol')

        if not all([rule_id, new_port, new_action]):
            return Response({"error": "Missing rule data for edit."}, status=status.HTTP_400_BAD_REQUEST)

        # UFW doesn't have a direct edit command. The process is to delete the old rule and add a new one.
        # First, delete the old rule by its number.
        delete_command = f'echo y | sudo ufw delete {rule_id}'
        success, output, _ = server.connect_ssh(command=delete_command)
        if not success:
            return Response({"error": f"Failed to delete old rule: {output}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Second, add the new rule.
        add_command = f'sudo ufw {new_action} {new_port}'
        if new_protocol and not new_protocol.startswith('custom'):
            add_command += f'/{new_protocol}'
            
        success, output, _ = server.connect_ssh(command=add_command)
        if not success:
            # Attempt to roll back by re-adding the original rule might be complex, so we just report the error.
            return Response({"error": f"Failed to add new rule: {output}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"status": "Rule updated successfully"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='firewall-status')
    def get_firewall_status(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        # The command needs sudo to read the firewall status correctly.
        success, output, exit_status = server.connect_ssh(command='sudo ufw status')

        if not success:
            # Log the actual error output for debugging
            logger.error(f"SSH command failed for server {server.id}. Exit status: {exit_status}, Output: {output}")
            return Response({"error": f"Failed to execute command on server: {output}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        is_active = 'Status: active' in output

        # Sync the database with the live status
        if server.firewall_enabled != is_active:
            server.firewall_enabled = is_active
            server.save(update_fields=['firewall_enabled'])

        return Response({'firewall_enabled': is_active})

    @action(detail=True, methods=['post'], url_path='add-ufw-rule')
    def add_ufw_rule(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        # Basic validation
        port = request.data.get('port')
        action = request.data.get('action', 'allow').lower()
        if not port or action not in ['allow', 'deny', 'reject']:
            return Response({'error': 'Port and a valid action (allow, deny, reject) are required.'}, status=status.HTTP_400_BAD_REQUEST)

        command = f"sudo ufw {action} {port}"
        success, output, exit_status = server.connect_ssh(command=command)

        if not success or exit_status != 0:
            error_message = f"Failed to add rule on server. Exit code: {exit_status}, Output: {output}"
            logger.error(error_message)
            return Response({'error': error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        log_action(user=request.user, action=f'Firewall rule added', request=request, details=f"Added rule '{command}' to server '{server.server_name}'.")
        return Response({'status': 'success', 'message': 'Rule added successfully.'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='delete-ufw-rule')
    def delete_ufw_rule(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        rule_number = request.data.get('id')
        if not rule_number:
            return Response({'error': 'Rule number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # UFW's delete command can be non-interactive with --force or by echoing 'y'.
        command = f"echo 'y' | sudo ufw delete {rule_number}"
        success, output, exit_status = server.connect_ssh(command=command)

        if not success or exit_status != 0:
            error_message = f"Failed to delete rule on server. Exit code: {exit_status}, Output: {output}"
            logger.error(error_message)
            return Response({'error': error_message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        log_action(user=request.user, action=f'Firewall rule deleted', request=request, details=f"Deleted rule number '{rule_number}' from server '{server.server_name}'.")
        return Response({'status': 'success', 'message': 'Rule deleted successfully.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='installed-applications')
    def get_installed_applications(self, request, pk=None, customer_pk=None):
        """
        Retrieves a list of installed applications from the server.
        """
        return async_to_sync(self._get_installed_applications_async)(request, pk, customer_pk)

    async def _get_installed_applications_async(self, request, pk, customer_pk):
        server = await sync_to_async(self.get_object)()

        is_allowed = await sync_to_async(self.get_queryset().filter(pk=server.pk).exists)()
        if not is_allowed:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        try:
            # Determine credentials based on login method
            username = 'root' if server.login_using_root else server.ssh_user
            password = server.ssh_root_password if server.login_using_root else server.ssh_password
            client_keys = [server.ssh_key] if server.ssh_key else None

            async with asyncssh.connect(
                server.server_ip,
                port=server.ssh_port,
                username=username,
                password=password,
                client_keys=client_keys,
                known_hosts=None
            ) as conn:
                cmd = "systemctl list-units --type=service --all --no-pager"
                result = await conn.run(cmd, check=True)
                output = result.stdout.strip()

                services = []
                lines = output.split('\n')
                # Skip header and footer lines
                for line in lines[1:]:
                    if not line.strip() or line.startswith('LEGEND:') or 'loaded units listed' in line:
                        continue
                    
                    # Handle the optional leading dot character
                    if line.startswith(('●', '○')):
                        line = line[2:].strip()

                    parts = re.split(r'\s{2,}', line, maxsplit=4)
                    # Ensure we have exactly 5 parts and the unit name is not blank
                    if len(parts) == 5 and parts[0].strip():
                        services.append({
                            'unit': parts[0].strip(),
                            'load': parts[1].strip(),
                            'active': parts[2].strip(),
                            'sub': parts[3].strip(),
                            'description': parts[4].strip()
                        })

                serializer = InstalledApplicationSerializer(data=services, many=True)
                serializer.is_valid(raise_exception=True)
                return Response(serializer.data)

        except asyncssh.Error as e:
            logger.error(f"SSH connection failed for server {server.id}: {e}", exc_info=True)
            return Response({"error": f"SSH connection failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"An unexpected error occurred for server {server.id}: {e}", exc_info=True)
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='scan-applications')
    def scan_applications(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        defined_apps = Application.objects.all()
        results = []

        for app in defined_apps:
            if not app.check_command:
                continue

            success, output, exit_status = server.connect_ssh(command=app.check_command)
            version = 'N/A'
            if app.detect_version:
                if success and ('/usr/bin/' in output or '/usr/sbin/' in output or '/bin/' in output):
                    ver_success, ver_output, ver_exit_status = server.connect_ssh(command=f'{output.strip()} --version')
                    if ver_success and ver_output:
                        # Use regex to find version numbers like X.Y.Z
                        match = re.search(r'(\d+\.\d+(\.\d+)*)', ver_output)
                        if match:
                            version = match.group(1)
                        else:
                            # Fallback to the first line of output if no specific version pattern is found
                            version = ver_output.strip().split('\n')[0]
            else:
                version = app.version or 'N/A'

            if 'systemctl status' in app.check_command:
                # Exit code 0: active, 3: inactive, 4: not found
                if success:
                    if exit_status == 0:
                        status_val = 'active'
                    elif exit_status == 3:
                        status_val = 'inactive'
                    elif exit_status == 4:
                        continue  # Service not found, skip
                    else:
                        status_val = 'unknown'

                    results.append({
                        'id': app.id,
                        'name': app.name,
                        'check_command': app.check_command,
                        'status': status_val,
                        'version': version,
                        'icon': app.icon,
                        'description': app.description,
                        'details': output.strip()
                    })

            else:
                # Generic: exit_status 0 = found (e.g., path or binary exists)
                if success and exit_status == 0:
                    results.append({
                        'id': app.id,
                        'name': app.name,
                        'check_command': app.check_command,
                        'status': 'found',
                        'version': version,
                        'icon': app.icon,
                        'description': app.description,
                        'details': output.strip()
                    })

        return Response(results, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='monitor-application')
    def monitor_application(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        app_name = request.data.get('name')

        if not app_name:
            return Response({'error': 'Application name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # The app_name can be 'nginx', 'mysql', etc. We use a grep trick to avoid matching the grep process itself.
        # For example, for 'nginx', the command becomes: ps aux | grep '[n]ginx' | awk '{print $3, $4}'
        if len(app_name) < 1:
            return Response({'error': 'Invalid application name.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Sanitize app_name to prevent command injection
        
        sanitized_app_name = shlex.quote(app_name)
        
        # Construct a more robust grep pattern
        # This finds the process without matching the 'grep' command itself.
        command = f"ps aux | grep '[{sanitized_app_name[0]}]{sanitized_app_name[1:]}' | head -n 1 | awk '{{print $3, $4}}'"

        success, output, exit_status = server.connect_ssh(command=command)

        if not success or not output.strip():
            return Response({'error': f'Failed to get stats for {app_name}. The process might not be running or is inaccessible.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            parts = output.strip().split()
            if len(parts) >= 2:
                cpu_usage = float(parts[0])
                memory_usage = float(parts[1])
            else:
                raise ValueError("Could not parse CPU and Memory usage from command output.")
        except (ValueError, IndexError) as e:
            return Response({'error': f'Error parsing stats for {app_name}: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'app_name': app_name,
            'cpu_usage': cpu_usage,
            'memory_usage': memory_usage
        }, status=status.HTTP_200_OK)

# ... (rest of the code remains the same)
    @action(detail=True, methods=['post'], url_path='manage-application')
    def manage_application(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        application_name = request.data.get('name')
        action = request.data.get('action') # 'start', 'stop', 'restart'

        if not all([application_name, action]):
            return Response({'error': 'Application name and action are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if action not in ['start', 'stop', 'restart']:
            return Response({'error': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)

        # We assume the application name corresponds to a systemd service name
        command = f"sudo systemctl {action} {application_name}"

        success, output, exit_status = server.connect_ssh(command=command)

        if success and exit_status == 0:
            return Response({'status': f'Application {action}ed successfully.', 'details': output}, status=status.HTTP_200_OK)
        else:
            return Response({'error': f'Failed to {action} application.', 'details': output}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='application-logs')
    def application_logs(self, request, pk=None, customer_pk=None):
        server = self.get_object()
        app_name = request.data.get('name')

        if not app_name:
            return Response({"error": "Application name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            safe_app_name = shlex.quote(app_name)
            commands_to_try = [
                f"sudo journalctl -u {safe_app_name}.service -n 200 --no-pager",
                f"sudo journalctl -u {safe_app_name} -n 200 --no-pager"
            ]

            last_error = ""
            for command in commands_to_try:
                success, output, exit_status = server.connect_ssh(command=command)
                if success and exit_status == 0 and output.strip():
                    return Response({"logs": output})
                elif success and exit_status != 0:
                    last_error = output

            error_message = f"No logs found for '{app_name}'."
            if last_error:
                error_message += f" Server response: {last_error}"
            
            logger.error(f"Failed to fetch logs for {app_name} on server {server.id}: {error_message}")
            return Response({"error": error_message}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"An unexpected error occurred while fetching logs for {app_name} on server {server.id}: {e}", exc_info=True)
            return Response({"error": f"An unexpected error occurred: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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


class InstalledApplicationViewSet(viewsets.ViewSet):
    """
    API endpoint for listing installed applications on a server.
    """
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    serializer_class = InstalledApplicationSerializer

    def get_queryset(self):
        # This method is required for DRF's generic views, but we're overriding list.
        # We don't have a model, so we return an empty queryset.
        return None

    @async_to_sync
    async def list(self, request, *args, **kwargs):
        server_pk = self.kwargs.get('server_pk')
        try:
            server = await sync_to_async(Server.objects.get)(pk=server_pk)
        except Server.DoesNotExist:
            raise Http404("Server not found.")

        # Reuse the permission checking logic from ServerViewSet
        self.check_object_permissions(self.request, server)

        try:
            async with asyncssh.connect(
                server.server_ip, 
                port=server.ssh_port,
                username='root' if server.login_using_root else server.ssh_user,
                password=server.ssh_root_password if server.login_using_root else server.ssh_password,
                client_keys=[server.ssh_key] if server.ssh_key else None,
                known_hosts=None
            ) as conn:
                cmd = "systemctl list-units --type=service --all --no-pager"
                result = await conn.run(cmd, check=True)
                output = result.stdout.strip()
                print(output)

                services = []
                lines = output.split('\n')
                # Skip header and footer lines
                for line in lines[1:]:
                    print(line)
                    if not line.strip() or line.startswith('LEGEND:') or 'loaded units listed' in line:
                        continue
                    
                    # Handle the optional leading dot character
                    if line.startswith(('●', '○')):
                        line = line[2:].strip()

                    # Split into parts, being careful about the description
                    parts = line.split(None, 4)
                    if len(parts) == 5 and parts[0].strip():
                        services.append({
                            'unit': parts[0],
                            'load': parts[1],
                            'active': parts[2],
                            'sub': parts[3],
                            'description': parts[4]
                        })

                serializer = self.serializer_class(data=services, many=True)
                serializer.is_valid(raise_exception=True)
                return Response(serializer.data)

        except asyncssh.Error as e:
            logger.error(f"SSH connection failed for server {server.id} while fetching apps: {e}", exc_info=True)
            return Response({"error": f"SSH connection failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"An unexpected error occurred while fetching apps for server {server.id}: {e}", exc_info=True)
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FirewallRuleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing firewall rules for a specific server.
    """
    serializer_class = FirewallRuleSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        """
        This view should return a list of all the firewall rules
        for the server specified in the URL.
        """
        server_pk = self.kwargs.get('server_pk')
        try:
            server = Server.objects.get(pk=server_pk)
        except Server.DoesNotExist:
            raise Http404("Server not found.")

        # Check if the user has permission to access this server
        if not self.request.user.is_staff and server.customer.owner != self.request.user:
            raise PermissionDenied("You do not have permission to access this server's firewall rules.")

        return FirewallRule.objects.filter(server=server)



    def perform_create(self, serializer):
        """
        Associate the firewall rule with the server from the URL.
        """
        server_pk = self.kwargs.get('server_pk')
        try:
            server = Server.objects.get(pk=server_pk)
        except Server.DoesNotExist:
            raise Http404("Server not found.")

        # Check permissions before creating
        if not self.request.user.is_staff and server.customer.owner != self.request.user:
            raise PermissionDenied("You do not have permission to create firewall rules for this server.")
        
        serializer.save(server=server)
        log_action(self.request.user, 'Created firewall rule', f"Rule '{serializer.instance}' was created for server '{server.server_name}'.")

    def perform_update(self, serializer):
        serializer.save()
        log_action(self.request.user, 'Updated firewall rule', f"Rule '{serializer.instance}' was updated for server '{serializer.instance.server.server_name}'.")


    def perform_destroy(self, instance):
        server = instance.server
        log_action(self.request.user, 'Deleted firewall rule', f"Rule '{instance}' was deleted from server '{server.server_name}'.")
        instance.delete()
