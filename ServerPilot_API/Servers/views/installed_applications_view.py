"""
Django ViewSet for managing installed applications on remote servers.

This module provides functionality to list, manage, monitor, and view logs
of applications installed on remote servers via SSH connections.
"""

import logging
import re
import shlex
import asyncio
from typing import List, Dict, Any, Optional, Tuple

import asyncssh
from asgiref.sync import async_to_sync, sync_to_async
from django.http import Http404
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.request import Request

from ServerPilot_API.Servers.models import Server
from ServerPilot_API.server_applications.models import Application
from ServerPilot_API.Servers.permissions import IsOwnerOrAdmin

logger = logging.getLogger(__name__)

# Constants
VALID_ACTIONS = ['start', 'stop', 'restart']
MAX_LOG_LINES = 200
VERSION_UNSUPPORTED_MESSAGES = ['invalid option', 'unrecognized option', 'unknown option']
VERSION_PATTERN = r'(\d+\.\d+(?:\.\d+)*)'


class InstalledApplicationViewSet(viewsets.ViewSet):
    """
    ViewSet for managing installed applications on servers.
    
    Provides endpoints for:
    - Listing installed applications with their status
    - Managing application lifecycle (start/stop/restart)
    - Monitoring application resource usage
    - Retrieving application logs
    - Executing fix commands
    """
    
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        """Return empty queryset as this ViewSet doesn't use standard model operations."""
        return Application.objects.none()

    def get_object(self) -> Server:
        """
        Retrieve and validate the server object from URL parameters.
        
        Returns:
            Server: The server instance if found and accessible
            
        Raises:
            Http404: If server is not found or access is denied
        """
        logger.debug(f"Retrieving server object with kwargs: {self.kwargs}")
        
        customer_pk = self.kwargs.get('customer_pk')
        server_pk = self.kwargs.get('server_pk')

        if not customer_pk or not server_pk:
            logger.error("Missing customer_pk or server_pk in URL parameters")
            raise Http404("Missing customer or server identifier")

        try:
            logger.info(f"Fetching server pk={server_pk}, customer_pk={customer_pk}")
            server = Server.objects.get(pk=server_pk, customer__pk=customer_pk)
            self.check_object_permissions(self.request, server)
            logger.info(f"Successfully retrieved server: {server.server_name}")
            return server
        except Server.DoesNotExist:
            logger.error(f"Server not found: pk={server_pk}, customer_pk={customer_pk}")
            raise Http404("Server not found")

    @sync_to_async
    def _get_server_async(self, server_pk: int) -> Server:
        """
        Asynchronously retrieve server by primary key.
        
        Args:
            server_pk: Primary key of the server
            
        Returns:
            Server: The server instance
        """
        return Server.objects.get(pk=server_pk)

    @sync_to_async
    def _get_applications_with_checks(self) -> List[Application]:
        """
        Retrieve all applications that have defined check commands.
        
        Returns:
            List[Application]: Applications with non-empty check commands
        """
        return list(
            Application.objects
            .exclude(check_command__isnull=True)
            .exclude(check_command__exact='')
        )

    async def _determine_application_status(self, app: Application, command_output: str) -> str:
        """
        Parse command output to determine application status.
        
        Args:
            app: Application instance
            command_output: Output from the check command
            
        Returns:
            str: Application status ('active', 'inactive', 'found', 'not found')
        """
        if 'systemctl status' in app.check_command:
            return self._parse_systemctl_status(command_output)
        else:
            return self._parse_binary_status(app.name, command_output)
    
    def _parse_systemctl_status(self, output: str) -> str:
        """Parse systemctl status output."""
        if 'Active: active (running)' in output:
            return 'active'
        elif 'Active: inactive' in output:
            return 'inactive'
        else:
            return 'not found'
    
    def _parse_binary_status(self, app_name: str, output: str) -> str:
        """Parse binary location command output."""
        common_paths = ['usr/bin', 'usr/sbin', 'bin']
        for path in common_paths:
            if f'/{path}/{app_name}' in output:
                return 'found'
        return 'found' if output.strip() else 'not found'

    async def _detect_application_version(self, conn: asyncssh.SSHClientConnection, app_name: str) -> str:
        """
        Detect application version using various command line options.
        
        Args:
            conn: SSH connection
            app_name: Name of the application
            
        Returns:
            str: Detected version or 'N/A' if detection fails
        """
        try:
            # Try --version first
            version_output = await self._run_version_command(conn, f"{app_name} --version")
            
            # Check if --version is unsupported and try -v instead
            if any(msg in version_output.lower() for msg in VERSION_UNSUPPORTED_MESSAGES):
                version_output = await self._run_version_command(conn, f"{app_name} -v")

            return self._extract_version_from_output(version_output)
            
        except Exception as e:
            logger.warning(f"Version detection failed for {app_name}: {e}")
            return 'N/A'
    
    async def _run_version_command(self, conn: asyncssh.SSHClientConnection, command: str) -> str:
        """Run version command and return output."""
        result = await conn.run(command, check=False)
        return result.stdout or result.stderr
    
    def _extract_version_from_output(self, output: str) -> str:
        """Extract version number from command output."""
        match = re.search(VERSION_PATTERN, output)
        if match:
            return match.group(1)
        elif output:
            return output.strip().split('\n')[0]
        return 'N/A'

    def _build_application_check_commands(self, applications: List[Application]) -> Tuple[Dict[str, Application], List[str]]:
        """
        Build a map of applications and their combined check commands.
        
        Args:
            applications: List of applications to check
            
        Returns:
            Tuple containing application map and list of commands
        """
        app_map = {}
        commands = []

        for app in applications:
            if app.check_command:
                app_map[app.name] = app
                commands.append(f"echo '===APP:{app.name}===' && {app.check_command}")

        return app_map, commands

    async def _process_application_results(
        self, 
        conn: asyncssh.SSHClientConnection,
        command_output: str, 
        app_map: Dict[str, Application]
    ) -> List[Dict[str, Any]]:
        """
        Process the combined command output and extract application information.
        
        Args:
            conn: SSH connection for version detection
            command_output: Combined output from all check commands
            app_map: Mapping of app names to Application objects
            
        Returns:
            List of application information dictionaries
        """
        results = []
        output_blocks = re.split(r'===APP:(.+?)===\n', command_output)[1:]

        for i in range(0, len(output_blocks), 2):
            app_name = output_blocks[i]
            app_output = output_blocks[i + 1].strip()
            app = app_map.get(app_name)

            if not app:
                continue

            try:
                app_info = await self._create_application_info(conn, app, app_output)
                if app_info['status'] not in ['unknown', 'not found']:
                    results.append(app_info)
                    
            except Exception as e:
                logger.error(f"Error processing app '{app_name}': {e}", exc_info=True)
                results.append(self._create_error_application_info(app, str(e)))

        return results

    async def _create_application_info(
        self, 
        conn: asyncssh.SSHClientConnection, 
        app: Application, 
        app_output: str
    ) -> Dict[str, Any]:
        """
        Create application information dictionary.
        
        Args:
            conn: SSH connection for version detection
            app: Application instance
            app_output: Command output for the application
            
        Returns:
            Dictionary containing application information
        """
        app_status = await self._determine_application_status(app, app_output)
        version = await self._get_application_version(conn, app, app_status)

        return {
            'id': app.id,
            'name': app.name,
            'check_command': app.check_command,
            'status': app_status,
            'version': version,
            'icon': app.icon,
            'description': app.description,
            'details': app_output
        }

    async def _get_application_version(
        self, 
        conn: asyncssh.SSHClientConnection, 
        app: Application, 
        app_status: str
    ) -> str:
        """Get application version based on configuration and status."""
        if app.detect_version and app_status in ['active', 'found']:
            return await self._detect_application_version(conn, app.name)
        elif app.version:
            return app.version
        return 'N/A'

    def _create_error_application_info(self, app: Application, error_message: str) -> Dict[str, Any]:
        """Create application info dictionary for error cases."""
        return {
            'id': app.id,
            'name': app.name,
            'status': 'error',
            'version': 'N/A',
            'details': error_message
        }

    async def _list_applications_async(
        self, 
        request: Request, 
        customer_pk: Optional[int] = None, 
        server_pk: Optional[int] = None
    ) -> Response:
        """
        Asynchronously list all installed applications on the server.
        
        Args:
            request: HTTP request object
            customer_pk: Customer primary key
            server_pk: Server primary key
            
        Returns:
            Response containing list of applications with their status
        """
        try:
            server = await self._get_server_async(server_pk)
            applications = await self._get_applications_with_checks()
            
            if not applications:
                return Response([], status=status.HTTP_200_OK)

            app_map, commands = self._build_application_check_commands(applications)
            if not commands:
                return Response([], status=status.HTTP_200_OK)

            combined_command = "\n".join(commands)

            async with await Server.async_connect_ssh(server) as conn:
                result = await conn.run(combined_command, check=False)
                results = await self._process_application_results(conn, result.stdout, app_map)

            return Response(results, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Failed to list applications: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to retrieve applications'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def list(self, request: Request, customer_pk: Optional[int] = None, server_pk: Optional[int] = None) -> Response:
        """
        List all installed applications on the server.
        
        Args:
            request: HTTP request object
            customer_pk: Customer primary key
            server_pk: Server primary key
            
        Returns:
            Response containing list of applications with their status
        """
        return async_to_sync(self._list_applications_async)(request, customer_pk, server_pk)

    def _validate_application_action(self, action: str) -> Optional[str]:
        """
        Validate application management action.
        
        Args:
            action: Action to validate
            
        Returns:
            Error message if invalid, None if valid
        """
        if not action:
            return 'Action is required'
        
        if action not in VALID_ACTIONS:
            return f'Invalid action. Must be one of: {", ".join(VALID_ACTIONS)}'
        
        return None

    @action(detail=True, methods=['post'], url_path='manage-application')
    def manage_application(
        self, 
        request: Request, 
        pk: Optional[int] = None, 
        customer_pk: Optional[int] = None, 
        server_pk: Optional[int] = None
    ) -> Response:
        """
        Manage application lifecycle (start, stop, restart).
        
        Args:
            request: HTTP request containing action
            pk: Application primary key
            customer_pk: Customer primary key
            server_pk: Server primary key
            
        Returns:
            Response indicating success or failure of the operation
        """
        server = self.get_object()
        
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response(
                {'error': 'Application not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        action_name = request.data.get('action')
        error_message = self._validate_application_action(action_name)
        
        if error_message:
            return Response(
                {'error': error_message}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        return self._execute_systemctl_command(server, application.name, action_name)

    def _execute_systemctl_command(self, server: Server, app_name: str, action: str) -> Response:
        """Execute systemctl command on the server."""
        command = f"sudo systemctl {action} {app_name}"
        success, output, exit_status = server.connect_ssh(command=command)

        if success and exit_status == 0:
            return Response(
                {
                    'status': f'Application {action}ed successfully',
                    'details': output
                }, 
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {
                    'error': f'Failed to {action} application',
                    'details': output
                }, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _build_process_monitoring_command(self, app_name: str) -> str:
        """
        Build a command to monitor process CPU and memory usage.
        
        Args:
            app_name: Name of the application to monitor
            
        Returns:
            Command string for process monitoring
        """
        sanitized_name = shlex.quote(app_name)
        # Use bracket notation to avoid matching the grep command itself
        return (
            f"ps aux | grep '[{sanitized_name[0]}]{sanitized_name[1:]}' | "
            f"head -n 1 | awk '{{print $3, $4}}'"
        )

    def _parse_resource_usage(self, output: str, app_name: str) -> Tuple[float, float]:
        """
        Parse CPU and memory usage from ps command output.
        
        Args:
            output: Command output
            app_name: Application name for error reporting
            
        Returns:
            Tuple of (cpu_usage, memory_usage)
            
        Raises:
            ValueError: If output cannot be parsed
        """
        parts = output.strip().split()
        if len(parts) < 2:
            raise ValueError("Insufficient data in command output")
        
        try:
            cpu_usage = float(parts[0])
            memory_usage = float(parts[1])
            return cpu_usage, memory_usage
        except (ValueError, IndexError) as e:
            raise ValueError(f"Could not parse CPU and Memory usage: {e}")

    @action(detail=True, methods=['post'], url_path='monitor-application')
    def monitor_application(
        self, 
        request: Request, 
        pk: Optional[int] = None, 
        customer_pk: Optional[int] = None, 
        server_pk: Optional[int] = None
    ) -> Response:
        """
        Monitor application resource usage (CPU and Memory).
        
        Args:
            request: HTTP request object
            pk: Application primary key
            customer_pk: Customer primary key
            server_pk: Server primary key
            
        Returns:
            Response containing CPU and memory usage statistics
        """
        server = self.get_object()
        
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response(
                {'error': 'Application not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        command = self._build_process_monitoring_command(application.name)
        success, output, exit_status = server.connect_ssh(command=command)

        if not success or not output.strip():
            return Response(
                {
                    'error': f'Failed to get stats for {application.name}. '
                            'The process might not be running or is inaccessible'
                }, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            cpu_usage, memory_usage = self._parse_resource_usage(output, application.name)
            
            return Response({
                'app_name': application.name,
                'cpu_usage': cpu_usage,
                'memory_usage': memory_usage
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {'error': f'Error parsing stats for {application.name}: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _build_log_retrieval_commands(self, app_name: str) -> List[str]:
        """
        Build commands to retrieve application logs from systemd journal.
        
        Args:
            app_name: Name of the application
            
        Returns:
            List of commands to try for log retrieval
        """
        safe_name = shlex.quote(app_name)
        return [
            f"sudo journalctl -u {safe_name}.service -n {MAX_LOG_LINES} --no-pager",
            f"sudo journalctl -u {safe_name} -n {MAX_LOG_LINES} --no-pager"
        ]

    async def _retrieve_application_logs_async(
        self, 
        request: Request, 
        pk: Optional[int] = None, 
        customer_pk: Optional[int] = None, 
        server_pk: Optional[int] = None
    ) -> Response:
        """
        Asynchronously retrieve application logs from systemd journal.
        
        Args:
            request: HTTP request containing application name
            pk: Application primary key (unused)
            customer_pk: Customer primary key
            server_pk: Server primary key
            
        Returns:
            Response containing application logs or error message
        """
        server = await sync_to_async(self.get_object)()
        app_name = request.data.get("name")

        if not app_name:
            return Response(
                {"error": "Application name is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            async with await Server.async_connect_ssh(server) as conn:
                last_error = ""
                
                for command in self._build_log_retrieval_commands(app_name):
                    result = await conn.run(command, check=False)
                    
                    if result.exit_status == 0 and result.stdout.strip():
                        return Response({"logs": result.stdout})
                    
                    last_error = result.stderr or result.stdout or "No output"

                logger.error(f"No logs found for {app_name} on server {server.id}. Last error: {last_error}")
                return Response(
                    {"error": f"No logs found. Server response: {last_error}"}, 
                    status=status.HTTP_404_NOT_FOUND
                )

        except Exception as e:
            logger.error(f"Error fetching logs for {app_name} on server {server.id}: {e}", exc_info=True)
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='application-logs')
    def application_logs(
        self, 
        request: Request, 
        pk: Optional[int] = None, 
        customer_pk: Optional[int] = None, 
        server_pk: Optional[int] = None
    ) -> Response:
        """
        Retrieve application logs from systemd journal.
        
        Args:
            request: HTTP request containing application name
            pk: Application primary key
            customer_pk: Customer primary key
            server_pk: Server primary key
            
        Returns:
            Response containing application logs or error message
        """
        return async_to_sync(self._retrieve_application_logs_async)(request, pk, customer_pk, server_pk)

    def get_server_object(self, **kwargs) -> Server:
        """
        Helper method to get server object from kwargs.
        
        Args:
            **kwargs: Keyword arguments containing server and customer IDs
            
        Returns:
            Server: The server instance
        """
        # This method seems to be missing from the original code but is referenced
        # Implementing based on the pattern used in other methods
        customer_pk = kwargs.get('customer_pk')
        server_pk = kwargs.get('server_pk')
        
        return Server.objects.get(pk=server_pk, customer__pk=customer_pk)

    async def _execute_commands_on_server(self, server: Server, commands: List[str]) -> List[Dict[str, Any]]:
        """
        Execute multiple commands on a server via SSH.
        
        Args:
            server: Server instance to connect to
            commands: List of commands to execute
            
        Returns:
            List of command execution results
        """
        async with await Server.async_connect_ssh(server) as conn:
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

    @action(detail=False, methods=['post'], url_path='execute-fix')
    def execute_fix(self, request: Request, *args, **kwargs) -> Response:
        """
        Execute a series of fix commands on the server.
        
        Args:
            request: HTTP request containing list of commands
            *args: Variable length argument list
            **kwargs: Arbitrary keyword arguments
            
        Returns:
            Response containing execution results for all commands
        """
        server = self.get_server_object(**kwargs)
        commands = request.data.get('commands', [])
        
        if not commands:
            return Response(
                {'error': 'Commands are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            results = asyncio.run(self._execute_commands_on_server(server, commands))
            return Response({'results': results})
            
        except Exception as e:
            logger.error(f"Error executing fix on server {server.id}: {e}", exc_info=True)
            return Response(
                {'error': f'Failed to execute commands: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )