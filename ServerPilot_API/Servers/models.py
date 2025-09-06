from django.db import models
from django.conf import settings
from ServerPilot_API.Customers.models import Customer
import paramiko # Added import
import io      # Added import
import asyncssh

class SecurityScan(models.Model):
    server = models.ForeignKey('Server', related_name='security_scans', on_delete=models.CASCADE)
    scanned_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('completed', 'Completed'), ('failed', 'Failed')], default='completed')

    def __str__(self):
        return f"Scan for {self.server.server_name} at {self.scanned_at.strftime('%Y-%m-%d %H:%M')}"

    class Meta:
        ordering = ['-scanned_at']

class SecurityRecommendation(models.Model):
    scan = models.ForeignKey(SecurityScan, related_name='recommendations', on_delete=models.CASCADE)
    RISK_LEVELS = (
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    )
    risk_level = models.CharField(max_length=10, choices=RISK_LEVELS)
    title = models.CharField(max_length=255)
    description = models.TextField()
    solution = models.TextField(default='')
    command_solution = models.TextField(blank=True, null=True)
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
        ('ignored', 'Ignored'),
        ('in_progress', 'In Progress'),
        ('acknowledged', 'Acknowledged'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    def __str__(self):
        return self.title


class FirewallRule(models.Model):
    server = models.ForeignKey('Server', related_name='firewall_rules', on_delete=models.CASCADE)
    port = models.CharField(max_length=255, help_text="Port or port range (e.g., '22', '80,443', '1000-2000')")
    protocol = models.CharField(max_length=10, choices=[('tcp', 'TCP'), ('udp', 'UDP'), ('any', 'Any')], default='tcp')
    source_ip = models.CharField(max_length=255, default='0.0.0.0/0', help_text="Source IP or CIDR (e.g., '192.168.1.1', '10.0.0.0/8')")
    action = models.CharField(max_length=10, choices=[('allow', 'Allow'), ('block', 'Block')], default='allow')
    description = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_action_display()} {self.protocol.upper()} on port {self.port} from {self.source_ip} for {self.server.server_name}"

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Firewall Rule'
        verbose_name_plural = 'Firewall Rules'


class Server(models.Model):
    customer = models.ForeignKey(Customer, related_name='servers', on_delete=models.CASCADE)
    server_name = models.CharField(max_length=255)
    server_ip = models.GenericIPAddressField()
    firewall_enabled = models.BooleanField(default=False)
    ssh_port = models.PositiveIntegerField(default=22)

    login_using_root = models.BooleanField(default=False)

    ssh_user = models.CharField(max_length=100, blank=True, null=True)
    # TODO: Storing passwords in plain text is insecure. Consider using encryption or a secrets manager.
    ssh_password = models.CharField(max_length=255, blank=True, null=True)

    ssh_root_password = models.CharField(max_length=255, blank=True, null=True)

    ssh_key = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    # Monitoring thresholds
    cpu_threshold = models.PositiveIntegerField(default=80, help_text="CPU usage threshold percentage.")
    memory_threshold = models.PositiveIntegerField(default=80, help_text="Memory usage threshold percentage.")
    disk_threshold = models.PositiveIntegerField(default=80, help_text="Disk usage threshold percentage.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.server_name} ({self.server_ip}) for {self.customer.first_name or self.customer.company_name}"

    def connect_ssh(self, command='ls -la', timeout=10):
        """
        Attempts to connect to the server via SSH and execute a command.
        Returns a tuple: (success: bool, output: str, exit_status: int)
        `success` is False only if the connection itself fails.
        `exit_status` is the command's exit code, or -1 on connection failure.
        """
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        username_to_use = None
        password_to_use = None
        
        if self.login_using_root:
            username_to_use = 'root'
            password_to_use = self.ssh_root_password
        else:
            username_to_use = self.ssh_user
            password_to_use = self.ssh_password
        
        if not username_to_use:
            return False, "SSH username is not configured for the selected login type.", -1

        try:
            connection_args = {
                'hostname': str(self.server_ip),
                'port': self.ssh_port,
                'username': username_to_use,
                'timeout': timeout,
                'look_for_keys': False, 
                'allow_agent': False    
            }

            if self.ssh_key:
                try:
                    key_file_obj = io.StringIO(self.ssh_key)
                    loaded_key = None
                    key_types_to_try = [
                        paramiko.RSAKey, 
                        paramiko.Ed25519Key, 
                        paramiko.ECDSAKey,
                    ]
                    
                    for key_type in key_types_to_try:
                        try:
                            key_file_obj.seek(0) 
                            loaded_key = key_type.from_private_key(key_file_obj, password=None) 
                            break 
                        except paramiko.SSHException:
                            continue 
                    
                    if not loaded_key:
                        return False, "Failed to load SSH private key. Ensure it's a valid unencrypted key of a supported type (RSA, Ed25519, ECDSA).", -1
                    
                    connection_args['pkey'] = loaded_key
                    connection_args['password'] = None 
                except Exception as e:
                    return False, f"Error processing SSH key: {str(e)}", -1
            
            elif password_to_use:
                connection_args['password'] = password_to_use
            else:
                return False, "No SSH key or password provided for the selected login type.", -1

            connection_args['timeout'] = timeout
            client.connect(**connection_args)

            # --- Sudo Handling --- #
            # If the command uses sudo, we need to handle it specially.
            if command.strip().startswith('sudo'):
                # Use -S to read password from stdin. get_pty is often needed for sudo.
                stdin, stdout, stderr = client.exec_command(command, timeout=timeout, get_pty=True)
                # We need to write the password to stdin for sudo.
                # Note: This assumes the ssh user's password is the sudo password.
                if password_to_use:
                    stdin.write(password_to_use + '\n')
                    stdin.flush()
            else:
                stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
            output = stdout.read().decode('utf-8', errors='replace').strip()
            error_output = stderr.read().decode('utf-8', errors='replace').strip()
            
            exit_status = stdout.channel.recv_exit_status()

            # Combine stdout and stderr for the final output, as both can be relevant
            full_output = output
            if error_output:
                full_output += f"\n{error_output}"

            return True, full_output, exit_status

        except paramiko.AuthenticationException as e:
            return False, f"Authentication failed: {str(e)}", -1
        except paramiko.SSHException as e: 
            return False, f"SSH connection error: {str(e)}", -1
        except TimeoutError: 
             return False, f"Connection timed out after {timeout} seconds.", -1
        except Exception as e: 
            return False, f"An unexpected error occurred during SSH operation: {str(e)}", -1
        finally:
            if client:
                client.close()
    
    @staticmethod
    def async_connect_ssh(server):
        """
        Reusable method to establish an SSH connection.
        """
        if server.login_using_root:
            return asyncssh.connect(server.server_ip, username='root', password=server.ssh_root_password)
        elif server.ssh_key:
            return asyncssh.connect(server.server_ip, username=server.ssh_user, pkey=server.ssh_key)
        else:
            return asyncssh.connect(server.server_ip, username=server.ssh_user, password=server.ssh_password)


    def change_user_password(self, new_password):
        """
        Changes the password for the relevant user on the server via SSH and updates the model.
        """
        if self.login_using_root:
            username_to_change = 'root'
        else:
            username_to_change = self.ssh_user

        if not username_to_change:
            return False, "SSH user is not configured."

        # Escape single quotes in the password to prevent shell injection issues with the echo command.
        escaped_password = new_password.replace("'", "'\\''")
        # Use sudo only for non-root users. If already logging in as root, call chpasswd directly.
        chpasswd_prefix = "sudo " if not self.login_using_root else ""
        command = f"echo '{username_to_change}:{escaped_password}' | {chpasswd_prefix}chpasswd"

        # connect_ssh returns (success: bool, output: str, exit_status: int)
        success, output, exit_status = self.connect_ssh(command=command)

        if success and exit_status == 0:
            # If the command was successful, update the password in the database.
            if self.login_using_root:
                self.ssh_root_password = new_password
            else:
                self.ssh_password = new_password
            self.save(update_fields=['ssh_root_password' if self.login_using_root else 'ssh_password', 'updated_at'])
            return True, "Password changed successfully."
        else:
            return False, f"Failed to change password on the remote server. Details: {output}"

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Server'
        verbose_name_plural = 'Servers'
