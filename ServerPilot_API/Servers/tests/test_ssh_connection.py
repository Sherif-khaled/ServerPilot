import asyncio
import asyncssh
import os
from dotenv import load_dotenv
import pytest

# Load environment variables
load_dotenv()

# Get SSH credentials from environment variables with defaults from user input
SSH_HOST = os.getenv('SSH_HOST', '167.86.76.14')
SSH_USER = os.getenv('SSH_USER', 'root')
SSH_PASS = os.getenv('SSH_PASS', '2P8KVdli7i1R8w21m2we01')
SSH_PORT = int(os.getenv('SSH_PORT', '22'))

async def test_ssh_connection():
    """Test SSH connection with provided credentials."""
    print(f"\nTesting SSH connection to {SSH_USER}@{SSH_HOST}:{SSH_PORT}...")
    
    try:
        # Connect to the SSH server
        async with asyncssh.connect(
            host=SSH_HOST,
            port=SSH_PORT,
            username=SSH_USER,
            password=SSH_PASS,
            known_hosts=None,  # Disable host key checking for testing
            connect_timeout=10
        ) as conn:
            print("✓ Successfully connected to SSH server")
            
            # Test basic command execution
            result = await conn.run('uname -a')
            print(f"\nSystem Info: {result.stdout.strip()}")
            
            # Test disk space
            result = await conn.run('df -h')
            print("\nDisk Usage:")
            print(result.stdout)
            
            # Test memory usage
            result = await conn.run('free -h')
            print("\nMemory Usage:")
            print(result.stdout)
            
            return True
            
    except Exception as e:
        print(f"\n✗ SSH Connection failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(test_ssh_connection())
