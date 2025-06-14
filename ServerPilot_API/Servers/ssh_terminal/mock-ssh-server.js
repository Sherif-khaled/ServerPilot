const net = require('net');
const PORT = 2222;

// SSH protocol constants
const SSH_MSG_CHANNEL_DATA = 94;
const SSH_MSG_CHANNEL_REQUEST = 98;

const server = net.createServer((socket) => {
  console.log('Mock SSH server: client connected');
  
  // Immediate SSH banner
  socket.write('SSH-2.0-MockSSH_1.0\r\n');
  
  socket.on('data', (data) => {
    const str = data.toString();
    
    // Immediate authentication success
    if (str.includes('ssh-userauth')) {
      socket.write(Buffer.from([0x00, 0x00, 0x00, 0x0C, 0x06, 0x00, 0x00, 0x00, 0x00]));
      return;
    }
    
    // Immediate command response
    if (str.includes('exec')) {
      const response = 'Test successful\n';
      const packet = Buffer.alloc(13 + response.length);
      packet.writeUInt32BE(9 + response.length, 0);
      packet.writeUInt8(SSH_MSG_CHANNEL_DATA, 4); 
      packet.writeUInt32BE(0, 5);
      packet.writeUInt32BE(response.length, 9);
      packet.write(response, 13);
      socket.write(packet);
    }
  });
  
  socket.on('end', () => {
    console.log('Mock SSH server: client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Mock SSH server ready on port ${PORT}`);
});
