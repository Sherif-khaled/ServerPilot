const WebSocket = require('ws');
const { exec } = require('child_process');

// Test configuration
const CONFIG = {
  WS_URL: 'ws://localhost:5000',
  TEST_SSH: {
    host: process.env.SSH_HOST || '167.86.76.14',
    port: process.env.SSH_PORT || 22,
    username: process.env.SSH_USER || 'root',
    password: process.env.SSH_PASS || '2P8KVdli7i1R8w21m2we01',
    command: 'echo "Test successful"'
  },
  TIMEOUT: 10000 // Longer timeout for public server
};

// Start server if not running
function startServer() {
  return new Promise((resolve) => {
    exec('node server.js', (error) => {
      if (error) {
        console.log('ℹ️ Server already running');
      }
      resolve();
    });
  });
}

// Start mock SSH server
function startMockSSH() {
  return new Promise((resolve) => {
    exec('node mock-ssh-server.js', (error) => {
      if (error) console.log('Mock SSH server already running');
      resolve();
    });
  });
}

// WebSocket test
async function testConnection() {
  console.log('🔌 Testing WebSocket connection...');
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CONFIG.WS_URL);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      ws.send(JSON.stringify({
        type: 'connect',
        ...CONFIG.TEST_SSH
      }));
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      
      if (msg.type === 'connected') {
        console.log('✅ SSH connection established');
        ws.send(JSON.stringify({
          type: 'command',
          command: CONFIG.TEST_SSH.command
        }));
      }
      
      if (msg.type === 'output') {
        console.log('✅ Command output:', msg.data.trim());
        ws.close();
        resolve();
      }
      
      if (msg.type === 'error') {
        console.error('❌ SSH error:', msg.message || msg.data);
        ws.close();
        reject(new Error(msg.message || msg.data));
      }
    });
    
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), CONFIG.TIMEOUT);
  });
}

// Run all tests
async function runTests() {
  try {
    await startMockSSH();
    await testConnection();
    console.log('🎉 All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

async function run() {
  try {
    await testConnection();
    console.log('🎉 All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

run();
