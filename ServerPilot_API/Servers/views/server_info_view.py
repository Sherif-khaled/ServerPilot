"""
Django ViewSet for retrieving comprehensive server information.

This module provides functionality to gather system information including
CPU usage, memory stats, disk usage, I/O metrics, network bandwidth, and more
from remote servers via SSH connections.
"""

import logging
import asyncio
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass

import asyncssh
from asgiref.sync import async_to_sync, sync_to_async
from django.http import Http404
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.request import Request

from ServerPilot_API.Servers.models import Server
from ServerPilot_API.Servers.permissions import IsOwnerOrAdmin
from ServerPilot_API.Servers.utli import _parse_bandwidth, _parse_disk_io

logger = logging.getLogger(__name__)

# Constants
BYTES_PER_GB = 1024 ** 3
BYTES_PER_MB = 1024 ** 2
KB_TO_GB = 1024 * 1024
CPU_STATS_INTERVAL = 1.0  # seconds
IOSTAT_SAMPLE_COUNT = 2
CPU_IDLE_INDEX = 3


@dataclass
class SystemMetrics:
    """Container for all system metrics."""
    os_info: str
    cpu: Dict[str, Any]
    memory: Dict[str, float]
    swap: Dict[str, Any]
    disks: List[Dict[str, Any]]
    disk_io: Dict[str, Any]
    bandwidth: Dict[str, Any]
    uptime: str
    thresholds: Dict[str, float]


class ServerInfoViewSet(viewsets.ViewSet):
    """
    ViewSet for retrieving comprehensive server information.
    
    Provides detailed system metrics including:
    - Operating system information
    - CPU usage and core count
    - Memory and swap usage
    - Disk usage and I/O statistics
    - Network bandwidth metrics
    - System uptime
    """
    
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        """Return empty queryset as this ViewSet doesn't use standard model operations."""
        return Server.objects.none()

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
        server_pk = self.kwargs.get('pk')

        if not customer_pk or not server_pk:
            logger.error("Missing customer_pk or server_pk in URL parameters")
            raise Http404("Missing customer or server identifier")

        try:
            logger.info(f"Fetching server pk={server_pk}, customer_pk={customer_pk}")
            server = Server.objects.select_related('customer__owner').get(
                pk=server_pk, 
                customer__pk=customer_pk
            )
            self.check_object_permissions(self.request, server)
            logger.info(f"Successfully retrieved server: {server.server_name}")
            return server
        except Server.DoesNotExist:
            logger.error(f"Server not found: pk={server_pk}, customer_pk={customer_pk}")
            raise Http404("Server not found")

    @sync_to_async
    def _get_server_async(self, server_pk: int, customer_pk: Optional[int] = None) -> Server:
        """
        Asynchronously retrieve server by primary key with optional customer check.
        
        Args:
            server_pk: Primary key of the server
            customer_pk: Optional customer primary key for validation
            
        Returns:
            Server: The server instance
            
        Raises:
            Server.DoesNotExist: If server is not found or doesn't belong to customer
        """
        try:
            query = Server.objects.select_related('customer')
            if customer_pk is not None:
                query = query.filter(customer_id=customer_pk)
            server = query.get(pk=server_pk)
            
            # Check permissions
            self.check_object_permissions(self.request, server)
            return server
            
        except Server.DoesNotExist as e:
            logger.error(f"Server not found: id={server_pk}, customer_id={customer_pk}")
            raise



    def _get_system_info_commands(self) -> List[str]:
        """
        Get list of commands for gathering system information.
        
        Returns:
            List of shell commands
        """
        return [
            'lsb_release -a | grep Description | cut -f2-',  # OS info
            "grep 'cpu ' /proc/stat",                        # CPU stats (first reading)
            'free -b',                                       # Memory info
            'df -B1',                                        # Disk usage
            'nproc',                                         # CPU core count
            f'iostat -d -k 1 {IOSTAT_SAMPLE_COUNT}',         # Disk I/O
            'cat /proc/net/dev',                             # Network stats (first reading)
            'uptime -p',                                     # System uptime
            'cat /proc/swaps',                               # Swap information
        ]

    def _get_follow_up_commands(self) -> List[str]:
        """
        Get commands that need to be run after initial data collection.
        
        Returns:
            List of shell commands for second reading
        """
        return [
            "grep 'cpu ' /proc/stat",  # CPU stats (second reading)
            'cat /proc/net/dev',       # Network stats (second reading)
        ]

    async def _gather_initial_system_data(self, conn: asyncssh.SSHClientConnection) -> Tuple:
        """
        Gather initial system information from the server.
        
        Args:
            conn: SSH connection
            
        Returns:
            Tuple of command results
        """
        commands = self._get_system_info_commands()
        return await asyncio.gather(*[conn.run(cmd) for cmd in commands])

    async def _gather_follow_up_data(self, conn: asyncssh.SSHClientConnection) -> Tuple:
        """
        Gather follow-up system data after sleep interval.
        
        Args:
            conn: SSH connection
            
        Returns:
            Tuple of follow-up command results
        """
        await asyncio.sleep(CPU_STATS_INTERVAL)
        commands = self._get_follow_up_commands()
        return await asyncio.gather(*[conn.run(cmd) for cmd in commands])

    def _parse_cpu_usage(self, cpu_result1: str, cpu_result2: str) -> float:
        """
        Calculate CPU usage percentage from two readings.
        
        Args:
            cpu_result1: First CPU stats reading
            cpu_result2: Second CPU stats reading
            
        Returns:
            CPU usage percentage
        """
        if not cpu_result1 or not cpu_result2:
            return 0.0
            
        try:
            cpu_stats1 = list(map(int, cpu_result1.split()[1:]))
            cpu_stats2 = list(map(int, cpu_result2.split()[1:]))
            
            total_diff = sum(cpu_stats2) - sum(cpu_stats1)
            idle_diff = cpu_stats2[CPU_IDLE_INDEX] - cpu_stats1[CPU_IDLE_INDEX]
            
            if total_diff == 0:
                return 0.0
                
            cpu_usage = 100 * (total_diff - idle_diff) / total_diff
            return round(cpu_usage, 2)
            
        except (IndexError, ValueError) as e:
            logger.warning(f"Failed to parse CPU usage: {e}")
            return 0.0

    def _parse_cpu_data(self, cpu_result1: str, cpu_result2: str, nproc_result: str) -> Dict[str, Any]:
        """
        Parse CPU information including usage and core count.
        
        Args:
            cpu_result1: First CPU reading
            cpu_result2: Second CPU reading
            nproc_result: Number of processors
            
        Returns:
            Dictionary containing CPU information
        """
        try:
            cores = int(nproc_result.strip())
        except (ValueError, AttributeError):
            logger.warning("Failed to parse CPU core count")
            cores = 1
            
        cpu_usage = self._parse_cpu_usage(cpu_result1, cpu_result2)
        
        return {
            'cores': cores,
            'cpu_usage_percent': cpu_usage
        }

    def _parse_memory_data(self, mem_result: str) -> Dict[str, float]:
        """
        Parse memory usage information.
        
        Args:
            mem_result: Memory command output
            
        Returns:
            Dictionary containing memory statistics
        """
        try:
            lines = mem_result.strip().split('\n')
            mem_parts = lines[1].split()
            
            return {
                'total_gb': round(int(mem_parts[1]) / BYTES_PER_GB, 2),
                'used_gb': round(int(mem_parts[2]) / BYTES_PER_GB, 2),
                'available_gb': round(int(mem_parts[6]) / BYTES_PER_GB, 2),
            }
        except (IndexError, ValueError) as e:
            logger.error(f"Failed to parse memory data: {e}")
            return {'total_gb': 0, 'used_gb': 0, 'available_gb': 0}

    def _parse_swap_data_from_free(self, mem_result: str) -> Dict[str, float]:
        """
        Parse swap information from 'free' command output.
        
        Args:
            mem_result: Memory command output containing swap info
            
        Returns:
            Dictionary containing swap statistics
        """
        try:
            lines = mem_result.strip().split('\n')
            swap_parts = lines[2].split()
            
            return {
                'total_gb': round(int(swap_parts[1]) / BYTES_PER_GB, 2),
                'used_gb': round(int(swap_parts[2]) / BYTES_PER_GB, 2),
            }
        except (IndexError, ValueError) as e:
            logger.error(f"Failed to parse swap data from free command: {e}")
            return {'total_gb': 0, 'used_gb': 0}

    def _parse_swap_data_from_swaps(self, swap_result: str) -> Dict[str, Any]:
        """
        Parse detailed swap information from /proc/swaps.
        
        Args:
            swap_result: Contents of /proc/swaps
            
        Returns:
            Dictionary containing detailed swap information
        """
        default_swap = {
            'enabled': False,
            'total_gb': 0,
            'used_gb': 0,
            'free_gb': 0
        }
        
        if not swap_result:
            return default_swap
            
        try:
            lines = swap_result.strip().split('\n')
            if len(lines) <= 1:  # Only header line
                return default_swap
                
            # Parse first swap device
            parts = lines[1].split()
            if len(parts) < 4:
                return default_swap
                
            total_kb = int(parts[2])
            used_kb = int(parts[3])
            
            total_gb = round(total_kb / KB_TO_GB, 2)
            used_gb = round(used_kb / KB_TO_GB, 2)
            free_gb = round(total_gb - used_gb, 2)
            
            return {
                'enabled': True,
                'total_gb': total_gb,
                'used_gb': used_gb,
                'free_gb': free_gb
            }
            
        except (IndexError, ValueError) as e:
            logger.warning(f"Failed to parse swap data: {e}")
            return default_swap

    def _parse_disk_data(self, disk_result: str) -> List[Dict[str, Any]]:
        """
        Parse disk usage information.
        
        Args:
            disk_result: Disk usage command output
            
        Returns:
            List of dictionaries containing disk information
        """
        disks_data = []
        
        try:
            lines = disk_result.strip().split('\n')[1:]  # Skip header
            
            for line in lines:
                parts = line.split()
                if len(parts) >= 6 and parts[0].startswith('/dev/'):
                    disk_info = {
                        'filesystem': parts[0],
                        'total_gb': round(int(parts[1]) / BYTES_PER_GB, 2),
                        'used_gb': round(int(parts[2]) / BYTES_PER_GB, 2),
                        'available_gb': round(int(parts[3]) / BYTES_PER_GB, 2),
                        'use_percent': int(parts[4].replace('%', '')),
                        'mountpoint': parts[5],
                    }
                    disks_data.append(disk_info)
                    
        except (IndexError, ValueError) as e:
            logger.error(f"Failed to parse disk data: {e}")
            
        return disks_data

    def _create_response_data(
        self,
        server: Server,
        os_info: str,
        cpu_data: Dict[str, Any],
        memory_data: Dict[str, float],
        swap_data: Dict[str, Any],
        disks_data: List[Dict[str, Any]],
        disk_io_data: Dict[str, Any],
        bandwidth_data: Dict[str, Any],
        uptime: str
    ) -> Dict[str, Any]:
        """
        Create the final response data structure.
        
        Args:
            server: Server instance
            os_info: Operating system information
            cpu_data: CPU metrics
            memory_data: Memory metrics
            swap_data: Swap metrics
            disks_data: Disk usage data
            disk_io_data: Disk I/O metrics
            bandwidth_data: Network bandwidth metrics
            uptime: System uptime
            
        Returns:
            Complete server information dictionary
        """
        return {
            'serverName': server.server_name,
            'data': {
                'os_info': os_info.strip(),
                'cpu': cpu_data,
                'memory': memory_data,
                'swap': swap_data,
                'disks': disks_data,
                'disk_io': disk_io_data,
                'bandwidth': bandwidth_data,
                'uptime': uptime.strip(),
                'thresholds': {
                    'cpu': server.cpu_threshold,
                    'memory': server.memory_threshold,
                    'disk': server.disk_threshold,
                }
            }
        }

    async def _collect_and_process_metrics(
        self, 
        conn: asyncssh.SSHClientConnection
    ) -> SystemMetrics:
        """
        Collect and process all system metrics from the server.
        
        Args:
            conn: SSH connection to the server
            
        Returns:
            SystemMetrics containing all processed data
        """
        # Gather initial data
        (os_result, cpu_result1, mem_result, disk_result, nproc_result, 
         iostat_result, net_dev_result1, uptime_result, swap_result) = await self._gather_initial_system_data(conn)
        
        # Gather follow-up data
        cpu_result2, net_dev_result2 = await self._gather_follow_up_data(conn)
        
        # Process all the collected data
        cpu_data = self._parse_cpu_data(
            cpu_result1.stdout, 
            cpu_result2.stdout, 
            nproc_result.stdout
        )
        
        memory_data = self._parse_memory_data(mem_result.stdout)
        
        # Use detailed swap data from /proc/swaps if available, otherwise fall back to 'free'
        swap_data = self._parse_swap_data_from_swaps(swap_result.stdout)
        if not swap_data['enabled']:
            swap_data.update(self._parse_swap_data_from_free(mem_result.stdout))
        
        disks_data = self._parse_disk_data(disk_result.stdout)
        disk_io_data = _parse_disk_io(iostat_result.stdout)
        bandwidth_data = _parse_bandwidth(net_dev_result1.stdout, net_dev_result2.stdout)
        
        return SystemMetrics(
            os_info=os_result.stdout,
            cpu=cpu_data,
            memory=memory_data,
            swap=swap_data,
            disks=disks_data,
            disk_io=disk_io_data,
            bandwidth=bandwidth_data,
            uptime=uptime_result.stdout,
            thresholds={}  # Will be set in create_response_data
        )

    async def _retrieve_server_info_async(
        self, 
        request: Request, 
        server_pk: Optional[int] = None, 
        customer_pk: Optional[int] = None
    ) -> Response:
        """
        Asynchronously retrieve comprehensive server information.
        
        Args:
            request: HTTP request object
            server_pk: Server primary key
            customer_pk: Customer primary key
            
        Returns:
            Response containing server information and metrics
        """
        try:
            # Get server asynchronously with customer check
            server = await self._get_server_async(server_pk, customer_pk)
            
            # Log server info without triggering __str__ which does database access
            logger.info(f"Successfully retrieved server: id={server.id}, name={server.server_name}")
            
            # Get customer info directly from the already selected related customer
            logger.info(f"Customer: id={server.customer_id}, name={server.customer.company_name or server.customer.first_name}")
            
        except Server.DoesNotExist:
            logger.error(f"Server not found: id={server_pk}")
            return Response(
                {"error": "Server not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Collect server metrics
        try:
            # Create SSH connection using the Server model's async_connect_ssh
            logger.info(f"Connecting to server {server.id} at {server.server_ip}:{server.ssh_port}")
            
            try:
                async with await Server.async_connect_ssh(server) as ssh_conn:
                    metrics = await self._collect_and_process_metrics(ssh_conn)
            except Exception as e:
                logger.error(f"Error during SSH connection or metrics collection: {str(e)}")
                raise
                
            response_data = self._create_response_data(
                server=server,
                os_info=metrics.os_info,
                cpu_data=metrics.cpu,
                memory_data=metrics.memory,
                swap_data=metrics.swap,
                disks_data=metrics.disks,
                disk_io_data=metrics.disk_io,
                bandwidth_data=metrics.bandwidth,
                uptime=metrics.uptime
            )
            
            return Response(response_data, status=status.HTTP_200_OK)

        except (asyncio.TimeoutError, OSError) as e:
            # Handle network/timeout errors explicitly (e.g., Errno 110)
            logger.warning(
                f"SSH connection timeout or network error for server {server.id} at {server.server_ip}:{server.ssh_port}: {e}",
                exc_info=False
            )
            return Response(
                {
                    "error": "SSH connection timed out",
                    "host": str(server.server_ip),
                    "port": server.ssh_port,
                },
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except asyncssh.Error as e:
            logger.error(f"SSH connection failed for server {server.id}: {e}", exc_info=True)
            return Response(
                {"error": f"SSH connection failed: {str(e)}"}, 
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            logger.error(f"Unexpected error retrieving info for server {server.id}: {e}", exc_info=True)
            return Response(
                {"error": "An unexpected error occurred during server info retrieval"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request: Request, pk: Optional[int] = None, **kwargs) -> Response:
        """
        Retrieve comprehensive server information.
        
        This is the main endpoint that clients will call to get server metrics.
        It handles the sync-to-async conversion and delegates to the async implementation.
        
        Args:
            request: HTTP request object
            pk: Server primary key from URL (passed by the router)
            **kwargs: Additional keyword arguments (including customer_pk from the URL)
            
        Returns:
            Response containing server information and metrics
        """
        # Get the server_pk from the URL parameters
        server_pk = kwargs.get('server_pk', pk)
        customer_pk = kwargs.get('customer_pk')
        
        # If we're in a nested route, the server_pk might be in the URL parameters
        if server_pk is None:
            server_pk = request.parser_context['kwargs'].get('server_pk')
            
        if not server_pk:
            return Response(
                {"error": "Server ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        return async_to_sync(self._retrieve_server_info_async)(request, server_pk, customer_pk)

    @action(detail=True, methods=['get'])
    def metrics(self, request: Request, pk: Optional[int] = None, **kwargs) -> Response:
        """
        Alternative endpoint to retrieve server metrics.
        
        This provides the same functionality as retrieve() but as a custom action.
        Accessible at /servers/{server_pk}/server-info/metrics/
        
        Args:
            request: HTTP request object
            pk: Server primary key from URL
            **kwargs: Additional URL parameters
            
        Returns:
            Response containing server information and metrics
        """
        # Get the server_pk from the URL parameters
        server_pk = kwargs.get('server_pk', pk)
        
        # If we're in a nested route, the server_pk might be in the URL parameters
        if server_pk is None:
            server_pk = request.parser_context['kwargs'].get('server_pk')
            
        if not server_pk:
            return Response(
                {"error": "Server ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        return self.retrieve(request, server_pk, **kwargs)

    @action(detail=True, methods=['get'], url_path='health')
    def health_check(self, request: Request, pk: Optional[int] = None) -> Response:
        """
        Quick health check endpoint for server connectivity.
        
        This performs a lightweight check to see if the server is reachable
        without gathering full metrics.
        
        Args:
            request: HTTP request object
            pk: Server primary key from URL
            
        Returns:
            Response indicating server connectivity status
        """
        try:
            server = self.get_object()
            
            async def check_connectivity():
                try:
                    async with await Server.async_connect_ssh(server) as conn:
                        result = await conn.run('echo "OK"', check=False)
                        return result.exit_status == 0
                except Exception:
                    return False
            
            is_connected = async_to_sync(check_connectivity)()
            
            return Response({
                'server_name': server.server_name,
                'status': 'online' if is_connected else 'offline',
                'reachable': is_connected
            }, status=status.HTTP_200_OK)
            
        except Http404:
            return Response(
                {"error": "Server not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except (asyncio.TimeoutError, OSError) as e:
            logger.warning(f"Health check timeout or network error for server {pk}: {e}")
            try:
                server = self.get_object()
                host, port = str(server.server_ip), server.ssh_port
            except Exception:
                host, port = None, None
            return Response(
                {"error": "SSH connection timed out", "host": host, "port": port},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )
        except asyncssh.Error as e:
            logger.error(f"Health check SSH error for server {pk}: {e}", exc_info=True)
            return Response(
                {"error": f"SSH connection failed: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            logger.error(f"Health check failed for server {pk}: {e}", exc_info=True)
            return Response(
                {"error": "Health check failed"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )