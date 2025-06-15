from django.db import models
from django.conf import settings
from ServerPilot_API.Customers.models import Customer
import paramiko # Added import
import io      # Added import

class Server(models.Model):
    customer = models.ForeignKey(Customer, related_name='servers', on_delete=models.CASCADE)
    server_name = models.CharField(max_length=255)
    server_ip = models.GenericIPAddressField()
    ssh_port = models.PositiveIntegerField(default=22)

    login_using_root = models.BooleanField(default=False)

    ssh_user = models.CharField(max_length=100, blank=True, null=True)
    # TODO: Storing passwords in plain text is insecure. Consider using encryption or a secrets manager.
    ssh_password = models.CharField(max_length=255, blank=True, null=True)

    ssh_root_password = models.CharField(max_length=255, blank=True, null=True)

    ssh_key = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.server_name} ({self.server_ip}) for {self.customer.first_name or self.customer.company_name}"

    def connect_ssh(self, command='ls -la', timeout=10):
        """
        Attempts to connect to the server via SSH and execute a command.
        Returns a tuple: (success: bool, output: str or Exception message)
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
            return False, "SSH username is not configured for the selected login type."

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
                        return False, "Failed to load SSH private key. Ensure it's a valid unencrypted key of a supported type (RSA, Ed25519, ECDSA)."
                    
                    connection_args['pkey'] = loaded_key
                    connection_args['password'] = None 
                except Exception as e:
                    return False, f"Error processing SSH key: {str(e)}"
            
            elif password_to_use:
                connection_args['password'] = password_to_use
            else:
                return False, "No SSH key or password provided for the selected login type."

            client.connect(**connection_args)
            
            stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
            output = stdout.read().decode('utf-8', errors='replace') 
            error_output = stderr.read().decode('utf-8', errors='replace')
            
            exit_status = stdout.channel.recv_exit_status()

            if exit_status != 0:
                full_error_message = f"Command exited with status {exit_status}."
                if output.strip(): full_error_message += f"\nSTDOUT: {output.strip()}"
                if error_output.strip(): full_error_message += f"\nSTDERR: {error_output.strip()}"
                return False, full_error_message
            if error_output.strip() and exit_status == 0 : 
                 output += f"\nSTDERR (Warning): {error_output.strip()}"
                
            return True, output.strip()

        except paramiko.AuthenticationException as e:
            return False, f"Authentication failed: {str(e)}"
        except paramiko.SSHException as e: 
            return False, f"SSH connection error: {str(e)}"
        except TimeoutError: 
             return False, f"Connection timed out after {timeout} seconds."
        except Exception as e: 
            return False, f"An unexpected error occurred during SSH operation: {str(e)}"
        finally:
            if client:
                client.close()

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
        command = f"echo '{username_to_change}:{escaped_password}' | sudo chpasswd"

        success, output = self.connect_ssh(command=command)

        if success:
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
