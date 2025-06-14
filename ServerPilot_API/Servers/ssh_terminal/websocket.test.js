const WebSocket = require('ws');

// Test configuration
const TEST_CONFIG = {
  host: 'localhost',
  port: 5000,
  // Set to true to test with real SSH server
  testRealSSH: true,
  sshConfig: {
    host: '167.86.76.14', // Change this
    username: 'root',    // Change this
    password: '2P8KVdli7i1R8w21m2we01'     // Change this
  }
};

console.log('🔍 Starting WebSocket connection test...');

// Create WebSocket connection
const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}`);

// Test WebSocket connection only
ws.on('open', () => {
  console.log('✅ WebSocket connection established');
  
  if (TEST_CONFIG.testRealSSH) {
    // Test with real SSH server
    ws.send(JSON.stringify({
      type: 'connect',
      ...TEST_CONFIG.sshConfig
    }));
    
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'command',
        command: 'echo "WebSocket test successful"'
      }));
    }, 2000);
  } else {
    // Just test WebSocket connection
    console.log('ℹ️ WebSocket connection test complete (SSH not tested)');
    ws.close();
    process.exit(0);
  }
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  if (message.type === 'connected') {
    console.log('✅ SSH connection established');
  } else if (message.type === 'output') {
    console.log('✅ Command output:', message.data);
    console.log('🎉 All tests passed!');
    ws.close();
    process.exit(0);
  } else if (message.type === 'error') {
    console.error('❌ Error:', message.message || message.data);
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket connection failed:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
});
