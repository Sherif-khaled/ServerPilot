import re
import logging
from django.http import Http404
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from ServerPilot_API.Servers.models import Server
from ServerPilot_API.Servers.permissions import IsOwnerOrAdmin
from ServerPilot_API.audit_log.services import log_action

logger = logging.getLogger(__name__)


class FirewallRuleViewSet(viewsets.ViewSet):
    """
    API endpoint for managing firewall rules for a specific server.
    """
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def _get_server_object(self, pk_or_server_pk):
        """
        Helper method to retrieve a Server object by its primary key.
        It also performs permission checks for the retrieved server's customer.

        Args:
            pk_or_server_pk (int): The primary key of the server.

        Returns:
            Server: The server object if found and permissions are met.

        Raises:
            Http404: If the server does not exist.
        """
        try:
            server = Server.objects.get(pk=pk_or_server_pk)
            self.check_object_permissions(self.request, server.customer)
            return server
        except Server.DoesNotExist:
            logger.warning(f"Server with PK {pk_or_server_pk} not found.")
            raise Http404("Server not found.")

    def _execute_ssh_command(self, server, command):
        """
        Helper method to execute an SSH command on a given server.
        It encapsulates the `connect_ssh` call and provides structured error handling.

        Args:
            server (Server): The server object to connect to.
            command (str): The SSH command to execute.

        Returns:
            tuple: A tuple containing (output, error_message).
                   output (str) is the command's stdout if successful, None otherwise.
                   error_message (str) is a descriptive error string if failed, None otherwise.
        """
        success, output, exit_status = server.connect_ssh(command=command)
        if not success:
            error_msg = (
                f"Failed to execute SSH command on server '{server.server_name}' (ID: {server.id}). "
                f"Command: '{command}'. Exit status: {exit_status}. Output: {output}"
            )
            logger.error(error_msg)
            return None, output  # Return output for specific error message to user
        return output, None

    def _handle_ssh_response(self, output, error_message):
        """
        Helper method to create a DRF Response based on SSH command execution result.
        """
        if error_message:
            return Response({"error": f"Operation failed: {error_message}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return None # No error, continue processing

    def _build_ufw_rule_command(self, action, port, protocol=None, source=None):
        """
        Helper method to construct a UFW command for adding/editing rules.

        Args:
            action (str): 'allow', 'deny', 'reject'.
            port (str): The port number or service name.
            protocol (str, optional): The protocol (e.g., 'tcp', 'udp'). Defaults to None.
            source (str, optional): The source IP address or subnet. Defaults to None.

        Returns:
            str: The constructed UFW command.
        """
        command = f'sudo ufw {action} '
        if source and source.lower() not in ['anywhere', 'any', '0.0.0.0/0', '']:
            command += f'from {source} to any port {port}'
            if protocol and not protocol.startswith('custom'):
                command += f' proto {protocol}'
        else:
            command += f'{port}'
            if protocol and not protocol.startswith('custom'):
                command += f'/{protocol}'
        return command

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle_firewall(self, request, pk=None, customer_pk=None, server_pk=None):
        """
        Toggles the firewall status (enable/disable) for a specific server.
        """
        server_id = server_pk if server_pk is not None else pk
        server = self._get_server_object(server_id)

        # Determine the action and corresponding command
        action_text = "disable" if server.firewall_enabled else "enable"
        command = f'sudo ufw {action_text}'
        if action_text == "enable":
            command = f'echo y | {command}'

        output, error = self._execute_ssh_command(server, command)
        response_error = self._handle_ssh_response(output, error)
        if response_error:
            return response_error

        # Update server model and log action
        server.firewall_enabled = not server.firewall_enabled
        server.save(update_fields=['firewall_enabled'])

        status_message = "enabled" if server.firewall_enabled else "disabled"
        log_action(
            user=request.user,
            action=f'Firewall {status_message}',
            request=request,
            details=f"Firewall for server '{server.server_name}' was {status_message}."
        )
        return Response(
            {'status': f'Firewall {status_message}', 'firewall_enabled': server.firewall_enabled},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='rules')
    def get_ufw_rules(self, request, pk=None, customer_pk=None, server_pk=None):
        """
        Retrieves the numbered UFW rules for a specific server.
        Parses the output of 'sudo ufw status numbered' command.
        """
        server_id = server_pk if server_pk is not None else pk
        server = self._get_server_object(server_id)

        output, error = self._execute_ssh_command(server, 'sudo ufw status numbered')
        response_error = self._handle_ssh_response(output, error)
        if response_error:
            return response_error

        try:
            rules = []
            lines = output.strip().split('\n')
            # Find the line that separates header from rules (e.g., '----')
            rules_start_index = next(i for i, line in enumerate(lines) if '----' in line) + 1

            for line in lines[rules_start_index:]:
                # Regex to parse UFW rule lines: [ID] TO ACTION IN FROM
                match = re.match(r'\s*\[\s*(\d+)\]\s+(.*?)\s+(ALLOW|DENY|REJECT)\s+IN\s+(.*)', line)
                if match:
                    rule_id, port_protocol_str, action, source = match.groups()
                    port_protocol_str = port_protocol_str.strip()
                    
                    # Split port and protocol, handling cases where protocol might be missing
                    parts = port_protocol_str.split('/')
                    port = parts[0]
                    protocol = parts[1] if len(parts) > 1 else None

                    rules.append({
                        'id': rule_id,
                        'port': port,
                        'protocol': protocol,
                        'action': action.strip(),
                        'source': source.strip(),
                    })
            return Response(rules, status=status.HTTP_200_OK)
        except StopIteration:
            # No rules found or '----' separator not present, return empty list
            return Response([], status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error parsing UFW rules for server {server.id}: {e}", exc_info=True)
            return Response({"error": "Failed to parse UFW rules output."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='rules/add')
    def add_ufw_rule(self, request, pk=None, customer_pk=None, server_pk=None):
        """
        Adds a new UFW rule to a specific server.
        Requires 'port', 'action' (default 'allow'), 'protocol', and 'source' in request data.
        """
        server_id = server_pk if server_pk is not None else pk
        server = self._get_server_object(server_id)

        port = request.data.get('port')
        action_type = request.data.get('action', 'allow')
        protocol = request.data.get('protocol')
        source = request.data.get('source')

        if not port:
            return Response({"error": "Port is required to add a rule."}, status=status.HTTP_400_BAD_REQUEST)

        command = self._build_ufw_rule_command(action_type, port, protocol, source)
        
        output, error = self._execute_ssh_command(server, command)
        response_error = self._handle_ssh_response(output, error)
        if response_error:
            return response_error

        return Response({"status": "Rule added successfully"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='rules/delete')
    def delete_ufw_rule(self, request, pk=None, customer_pk=None, server_pk=None):
        """
        Deletes a UFW rule by its ID from a specific server.
        Requires 'id' in request data.
        """
        server_id = server_pk if server_pk is not None else pk
        server = self._get_server_object(server_id)
        rule_id = request.data.get('id')

        if not rule_id:
            return Response({"error": "Rule ID is required to delete a rule."}, status=status.HTTP_400_BAD_REQUEST)

        command = f'echo y | sudo ufw delete {rule_id}'
        
        output, error = self._execute_ssh_command(server, command)
        response_error = self._handle_ssh_response(output, error)
        if response_error:
            return response_error

        return Response({"status": "Rule deleted successfully"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='rules/edit')
    def edit_ufw_rule(self, request, pk=None, customer_pk=None, server_pk=None):
        """
        Edits an existing UFW rule by deleting the old one and adding a new one.
        Requires 'id', 'port', 'action', and 'protocol' in request data.
        """
        server_id = server_pk if server_pk is not None else pk
        server = self._get_server_object(server_id)

        rule_id = request.data.get('id')
        new_port = request.data.get('port')
        new_action = request.data.get('action')
        new_protocol = request.data.get('protocol')
        new_source = request.data.get('source') # Allow editing source as well

        if not all([rule_id, new_port, new_action]):
            return Response({"error": "Missing required data (id, port, action) for rule edit."}, status=status.HTTP_400_BAD_REQUEST)

        # Step 1: Delete the old rule
        delete_command = f'echo y | sudo ufw delete {rule_id}'
        output, delete_error = self._execute_ssh_command(server, delete_command)
        response_error = self._handle_ssh_response(output, delete_error)
        if response_error:
            return Response({"error": f"Failed to delete old rule: {delete_error}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Step 2: Add the new rule with updated parameters
        add_command = self._build_ufw_rule_command(new_action, new_port, new_protocol, new_source)
        
        output, add_error = self._execute_ssh_command(server, add_command)
        response_error = self._handle_ssh_response(output, add_error)
        if response_error:
            # Consider logging a warning here if the deletion succeeded but addition failed,
            # as the server might be in an inconsistent state.
            logger.warning(
                f"UFW rule deletion succeeded for server {server.id} (Rule ID: {rule_id}), "
                f"but addition of new rule failed: {add_error}"
            )
            return Response({"error": f"Failed to add new rule: {add_error}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"status": "Rule updated successfully"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='status')
    def get_firewall_status(self, request, pk=None, customer_pk=None, server_pk=None):
        """
        Retrieves the current firewall status (active/inactive) for a specific server.
        Also synchronizes the `firewall_enabled` field in the Server model if it differs.
        """
        server_id = server_pk if server_pk is not None else pk
        server = self._get_server_object(server_id)

        output, error = self._execute_ssh_command(server, 'sudo ufw status')
        response_error = self._handle_ssh_response(output, error)
        if response_error:
            return response_error

        is_active = 'Status: active' in output

        # Update the model only if the status has changed to avoid unnecessary DB writes.
        if server.firewall_enabled != is_active:
            server.firewall_enabled = is_active
            server.save(update_fields=['firewall_enabled'])

        return Response({'firewall_enabled': is_active}, status=status.HTTP_200_OK)