import logging
import re

# Third-party imports
import asyncssh  # Although not directly used in the ViewSet, kept as it was in original imports
from django.http import Http404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

# Local application imports
from ServerPilot_API.Servers.models import Server, SecurityRecommendation, SecurityScan
from ServerPilot_API.Servers.permissions import IsOwnerOrAdmin
from ServerPilot_API.Servers.serializers import (
    SecurityRecommendationSerializer,
    SecurityScanSerializer,
)
from ServerPilot_API.audit_log.services import log_action
from ServerPilot_API.security.models import SecurityRisk

logger = logging.getLogger(__name__)


class SecurityAdvisorViewSet(viewsets.ViewSet):
    """
    API endpoint that allows security advisors to be viewed or edited.
    Provides actions for CRUD operations on security advisors, typically nested under a customer.
    e.g., /api/customers/<customer_pk>/security-advisors/
    """

    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_server_object(self, **kwargs) -> Server:
        """
        Fetches the server object based on 'pk' or 'server_pk' from kwargs.
        Ensures the requesting user has permissions for the server's customer.

        Raises:
            Http404: If the server ID is missing, server is not found, or permissions fail.
        """
        server_pk = kwargs.get('pk') or kwargs.get('server_pk')
        if not server_pk:
            logger.error("Server ID is required but not provided.")
            raise Http404("Server ID is required")

        try:
            server = Server.objects.get(pk=server_pk)
        except Server.DoesNotExist:
            logger.error(f"Server with ID {server_pk} not found.")
            raise Http404("Server not found")
        except Exception as e:
            # Catch any other unexpected errors during server retrieval
            logger.error(f"Unexpected error retrieving server {server_pk}: {e}", exc_info=True)
            raise Http404("Error retrieving server")

        # Check permissions after fetching the object
        self.check_object_permissions(self.request, server.customer)
        return server

    def _prepare_fix_command(self, command: str) -> str:
        """
        Modifies a given command to run non-interactively if necessary.
        Currently handles 'ufw enable' by piping 'y' to it.

        Args:
            command (str): The original command string.

        Returns:
            str: The modified command string.
        """
        if 'ufw enable' in command:
            logger.debug(f"Modifying command for non-interactive UFW enable: '{command}'")
            return f'echo y | {command}'
        return command

    def _check_for_risk(self, risk: SecurityRisk, output: str, exit_status: int) -> bool:
        """
        Determines if a security risk is found based on the command's output
        and its exit status, considering the risk's expected exit behavior.

        Args:
            risk (SecurityRisk): The security risk object.
            output (str): The command's standard output.
            exit_status (int): The command's exit status.

        Returns:
            bool: True if the risk is found, False otherwise.
        """
        # If the risk does NOT expect a non-zero exit, and the command failed (non-zero exit),
        # then we skip pattern matching as the command itself failed to execute as expected.
        if not risk.expect_non_zero_exit and exit_status != 0:
            logger.warning(
                f"Command for risk '{risk.title}' failed with exit code {exit_status}. "
                "Skipping pattern match as it was not expected to fail."
            )
            return False

        match_found = bool(re.search(risk.match_pattern, output))
        logger.debug(f"Pattern '{risk.match_pattern}' match found for '{risk.title}': {match_found}")
        return match_found

    def _process_single_risk(self, server: Server, scan: SecurityScan, risk: SecurityRisk):
        """
        Processes a single security risk: executes its check command on the server,
        analyzes the output, and creates a SecurityRecommendation based on the findings.

        Args:
            server (Server): The server object being scanned.
            scan (SecurityScan): The current security scan object.
            risk (SecurityRisk): The specific security risk to process.
        """
        logger.info(f"[Security Scan] Checking risk: '{risk.title}' for server: {server.id}")
        logger.debug(f"[Security Scan] Executing command: {risk.check_command}")

        # connect_ssh now returns (success, output, exit_status)
        conn_success, output, exit_status = server.connect_ssh(command=risk.check_command)

        if not conn_success:
            logger.warning(f"[Security Scan] SSH connection failed for risk '{risk.title}': {output}")
            # Do not create a recommendation if SSH connection itself failed
            return

        logger.debug(
            f"[Security Scan] Command for '{risk.title}' executed with exit code {exit_status}. "
            f"Output:\n{output[:500]}..." # Log first 500 chars of output
        )

        is_risk_found = self._check_for_risk(risk, output, exit_status)

        if is_risk_found:
            logger.info(f"[Security Scan] Risk '{risk.title}' found. Creating pending recommendation.")
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
            logger.info(f"[Security Scan] Check passed for: '{risk.title}'. Creating 'passed' recommendation.")
            SecurityRecommendation.objects.create(
                scan=scan,
                risk_level='low',  # Passed checks are considered low risk/informational
                title=f"Check Passed: {risk.title}",
                description='This security check passed successfully. No action required.',
                solution='',  # Provide empty string instead of None
                status='passed'
            )

    @action(detail=False, methods=['post'], url_path='run-security-scan')
    def run_security_scan(self, request, *args, **kwargs) -> Response:
        """
        Initiates a security scan on the server based on predefined security risks.
        Iterates through enabled risks, executes checks, and creates recommendations.
        """
        server = self.get_server_object(**kwargs)
        scan = None  # Initialize scan to None

        try:
            risks = SecurityRisk.objects.filter(is_enabled=True).order_by('id') # Order for consistent processing
            scan = SecurityScan.objects.create(server=server, status='running') # Set status to running initially

            for risk in risks:
                self._process_single_risk(server, scan, risk)

            scan.status = 'completed'
            scan.save()
            # Reload the scan object to include newly created recommendations
            scan.refresh_from_db()

            serializer = SecurityScanSerializer(scan)
            logger.info(f"Security scan completed successfully for server {server.id}.")
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            # If the scan was created but an error occurred, mark it as failed.
            if scan and scan.pk:
                scan.status = 'failed'
                scan.save()
            logger.error(f'Error running security scan for server {server.id}: {e}', exc_info=True)
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='fix_recommendation')
    def fix_recommendation(self, request, *args, **kwargs) -> Response:
        """
        Applies the solution command for a specific security recommendation on the server.
        """
        server = self.get_server_object(**kwargs)
        recommendation_id = request.data.get('recommendation_id')

        if not recommendation_id:
            logger.warning("Attempted to fix recommendation without providing 'recommendation_id'.")
            return Response({'error': 'recommendation_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Ensure the recommendation belongs to the specified server
            recommendation = SecurityRecommendation.objects.get(pk=recommendation_id, scan__server=server)

            if not recommendation.solution:
                logger.warning(f"No solution command available for recommendation ID {recommendation_id}.")
                return Response(
                    {'error': 'No solution command available for this recommendation.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            command_to_run = self._prepare_fix_command(recommendation.solution)
            
            # Use a reasonable timeout for SSH commands
            success, output, exit_status = server.connect_ssh(command=command_to_run, timeout=60)

            if success:
                recommendation.status = 'fixed'
                recommendation.save()
                log_action(
                    request.user, 
                    'recommendation_fix', 
                    request, 
                    f'Successfully fixed recommendation "{recommendation.title}" on server {server.server_name}'
                )
                logger.info(f"Recommendation {recommendation_id} fixed successfully on server {server.id}.")
                return Response({'status': 'success', 'message': 'Recommendation fixed successfully.'}, status=status.HTTP_200_OK)
            else:
                log_action(
                    request.user, 
                    'recommendation_fix_failed', 
                    request, 
                    f'Failed to fix recommendation "{recommendation.title}" on server {server.server_name}: {output}'
                )
                logger.error(
                    f"Failed to apply fix for recommendation {recommendation_id} on server {server.id}. "
                    f"Output: {output}, Exit Status: {exit_status}"
                )
                return Response(
                    {'status': 'error', 'message': 'Failed to apply fix.', 'details': output},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except SecurityRecommendation.DoesNotExist:
            logger.warning(f"Recommendation with ID {recommendation_id} not found for server {server.id}.")
            return Response({'error': 'Recommendation not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(
                f'Error fixing recommendation {recommendation_id} for server {server.id}: {e}', 
                exc_info=True
            )
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='latest-security-scan')
    def latest_security_scan(self, request, *args, **kwargs) -> Response:
        """
        Retrieves the latest security scan for a given server.
        """
        server = self.get_server_object(**kwargs)
        latest_scan = SecurityScan.objects.filter(server=server).order_by('-scanned_at').first()

        if not latest_scan:
            logger.info(f"No security scans found for server {server.id}.")
            return Response({'message': 'No security scans found for this server.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SecurityScanSerializer(latest_scan)
        logger.debug(f"Returning latest security scan for server {server.id}.")
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['patch'], url_path='update-recommendation-status')
    def update_recommendation_status(self, request, *args, **kwargs) -> Response:
        """
        Updates the status of a specific security recommendation.
        """
        server = self.get_server_object(**kwargs)
        recommendation_id = request.data.get('recommendation_id')
        new_status = request.data.get('status')

        if not recommendation_id or not new_status:
            logger.warning("Attempted to update recommendation status without 'recommendation_id' or 'status'.")
            return Response(
                {'error': 'recommendation_id and status are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Ensure the recommendation belongs to the specified server
            recommendation = SecurityRecommendation.objects.get(id=recommendation_id, scan__server=server)
            
            # Validate new_status against allowed choices if applicable in your model
            # e.g., if recommendation.status has choices defined:
            # if new_status not in [choice[0] for choice in SecurityRecommendation.STATUS_CHOICES]:
            #     return Response({'error': 'Invalid status provided.'}, status=status.HTTP_400_BAD_REQUEST)

            recommendation.status = new_status
            recommendation.save()
            logger.info(f"Recommendation {recommendation_id} status updated to '{new_status}' for server {server.id}.")
            return Response(SecurityRecommendationSerializer(recommendation).data, status=status.HTTP_200_OK)
        except SecurityRecommendation.DoesNotExist:
            logger.warning(f"Recommendation with ID {recommendation_id} not found for server {server.id}.")
            return Response({'error': 'Recommendation not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(
                f'Error updating recommendation {recommendation_id} status for server {server.id}: {e}', 
                exc_info=True
            )
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

