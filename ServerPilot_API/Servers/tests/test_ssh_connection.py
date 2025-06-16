import asyncio
import asyncssh
import os
from dotenv import load_dotenv
import pytest

# Load environment variables
load_dotenv()

# Get SSH credentials from environment variables with defaults from user input
SSH_HOST = os.getenv('SSH_HOST', '192.168.1.1')
SSH_USER = os.getenv('SSH_USER', 'testuser')
SSH_PASS = os.getenv('SSH_PASS', 'testpass123')
SSH_PORT = int(os.getenv('SSH_PORT', '22'))

@pytest.mark.asyncio
async def test_ssh_connection():
    """Test SSH connection to server"""
    try:
        async with asyncssh.connect(
            host=SSH_HOST,
            port=SSH_PORT,
            username=SSH_USER,
            password=SSH_PASS,
            known_hosts=None,  # Disable host key checking for testing
            connect_timeout=10
        ) as conn:
            # Test basic commands
            result = await conn.run('uname -a')
            print(f"\nOS Info: {result.stdout}")
            
            result = await conn.run('free -h')
            print("\nMemory Usage:")
            print(result.stdout)
            
            assert True
            
    except Exception as e:
        print(f"\n✗ SSH Connection failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(test_ssh_connection())
