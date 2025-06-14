import React, { useState, useRef, useEffect } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { Box, Button, TextField, Paper, Typography } from '@mui/material';

export default function App() {
  const terminalRef = useRef(null);
  const [terminal, setTerminal] = useState(null);
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState({
    host: '',
    port: 22,
    username: '',
    password: ''
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '\'Courier New\', monospace',
      fontSize: 14,
      theme: {
        background: '#1e1e1e',
        foreground: '#f0f0f0'
      }
    });
    
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    
    term.onData(data => {
      if (ws && connected) {
        ws.send(JSON.stringify({ type: 'command', command: data }));
      }
    });
    
    setTerminal(term);
    
    return () => {
      term.dispose();
      if (ws) ws.close();
    };
  }, []);

  const connect = () => {
    setConnectionStatus('connecting');
    console.log(`Connecting to WebSocket (attempt ${retryCount + 1})`);
    
    const websocket = new WebSocket(`ws://${window.location.hostname}:5000/ws/servers/3/ssh/`);
    
    websocket.onopen = () => {
      setConnectionStatus('connected');
      setRetryCount(0);
      console.log('WebSocket connected');
      websocket.send(JSON.stringify({
        type: 'connect',
        ...connectionDetails
      }));
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      terminal.writeln('\x1B[31mConnection error. Retrying...\x1B[0m');
      setConnectionStatus('error');
      
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(retryCount + 1);
          connect();
        }, 2000);
      } else {
        terminal.writeln('\x1B[31mMax retries reached. Please check connection.\x1B[0m');
      }
    };
    
    websocket.onclose = () => {
      if (connectionStatus !== 'disconnected') {
        setConnectionStatus('disconnected');
        console.log('WebSocket disconnected');
        terminal.writeln('\x1B[31mDisconnected from server\x1B[0m');
      }
    };
    
    websocket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      if (data.type === 'connected') {
        setConnected(true);
        terminal.writeln('Connected to server!');
      } else if (data.type === 'output') {
        terminal.write(data.data);
      } else if (data.type === 'error') {
        terminal.writeln(`\x1B[31m${data.message || data.data}\x1B[0m`);
      } else if (data.type === 'disconnected') {
        terminal.writeln('\x1B[31mDisconnected from server\x1B[0m');
        setConnected(false);
      }
    };
    
    setWs(websocket);
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
    setConnected(false);
    setConnectionStatus('disconnected');
  };

  const handleInputChange = (e) => {
    setConnectionDetails({
      ...connectionDetails,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Web SSH Terminal
      </Typography>
      
      {!connected ? (
        <Paper sx={{ p: 3, mb: 3 }}>
          <TextField
            label="Host"
            name="host"
            value={connectionDetails.host}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Port"
            name="port"
            type="number"
            value={connectionDetails.port}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Username"
            name="username"
            value={connectionDetails.username}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={connectionDetails.password}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={connect}
            disabled={!connectionDetails.host || !connectionDetails.username}
          >
            Connect
          </Button>
          {connectionStatus === 'connecting' && <Typography variant="body2">Connecting...</Typography>}
          {connectionStatus === 'error' && <Typography variant="body2" color="error">Connection error. Retrying...</Typography>}
        </Paper>
      ) : (
        <Button
          variant="contained"
          color="error"
          onClick={disconnect}
          sx={{ mb: 2 }}
        >
          Disconnect
        </Button>
      )}
      
      <Paper sx={{ p: 1 }}>
        <div
          ref={terminalRef}
          style={{ width: '100%', height: '500px', backgroundColor: '#1e1e1e' }}
        />
      </Paper>
    </Box>
  );
}
