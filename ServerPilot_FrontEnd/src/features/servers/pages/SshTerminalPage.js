import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const SshTerminalPage = () => {
    const { serverId } = useParams();
    const terminalRef = useRef(null); // Ref for the container div
    const term = useRef(null); // Ref for the Terminal instance
    const socketRef = useRef(null);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [connectionDetails, setConnectionDetails] = useState({
      host: '167.86.76.14',
      port: 22,
      username: 'root',
      password: '2P8KVdli7i1R8w21m2we01'
    });

    useEffect(() => {
        if (!terminalRef.current || term.current) {
            return; // Don't re-initialize
        }

        // Initialize Terminal
        term.current = new Terminal({ cursorBlink: true, theme: { background: '#1e1e1e' } });
        const fitAddon = new FitAddon();
        term.current.loadAddon(fitAddon);
        term.current.open(terminalRef.current);

        const handleResize = () => {
            try {
                fitAddon.fit();
            } catch (e) {
                console.error("Error fitting terminal:", e);
            }
        };

        // Setup WebSocket with reconnection
        const connectWebSocket = async () => {
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${protocol}//${window.location.hostname}:5000/ws/servers/${serverId}/ssh`;
                console.log('Connecting to:', wsUrl);
                
                socketRef.current = new WebSocket(wsUrl);
                
                socketRef.current.onopen = async () => {
                    console.log('WebSocket connected');
                    term.current.writeln('\x1B[1;32mConnected to terminal server\x1B[0m');
                    
                    // Send connection details
                    socketRef.current.send(JSON.stringify({
                        host: connectionDetails.host,
                        port: connectionDetails.port,
                        username: connectionDetails.username,
                        password: connectionDetails.password
                    }));
                };
                
                socketRef.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    term.current.writeln('\x1B[1;31mConnection error. Retrying...\x1B[0m');
                    setTimeout(connectWebSocket, 2000);
                };
                
                socketRef.current.onclose = () => {
                    console.log('WebSocket closed');
                    term.current.writeln('\x1B[1;33mConnection closed. Reconnecting...\x1B[0m');
                    setTimeout(connectWebSocket, 2000);
                };
                
                socketRef.current.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'output') {
                            term.current.write(data.output);
                        } else if (data.type === 'error') {
                            term.current.writeln(`\x1B[1;31m[ERROR]: ${data.message}\x1B[0m`);
                        }
                    } catch (e) {
                        console.error('Error processing message:', e);
                    }
                };

                // Handle terminal input
                const onDataDisposable = term.current.onData(data => {
                    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                        // After initial handshake (connection details sent in onopen),
                        // subsequent data from xterm.js is raw input to be sent directly.
                        socketRef.current.send(data);
                    }
                });

                // Handle terminal resize
                window.addEventListener('resize', handleResize);

                const onResizeDisposable = term.current.onResize(size => {
                    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                        const message = { action: 'resize', data: { cols: size.cols, rows: size.rows } };
                        socketRef.current.send(JSON.stringify(message));
                    }
                });

                // Cleanup on component unmount
                return () => {
                    window.removeEventListener('resize', handleResize);
                    onDataDisposable.dispose();
                    onResizeDisposable.dispose();
                    if (socketRef.current) {
                        socketRef.current.close();
                    }
                    if (term.current) {
                        term.current.dispose();
                        term.current = null;
                    }
                };
            } catch (error) {
                console.error('WebSocket connection failed:', error);
                setTimeout(connectWebSocket, 2000);
            }
        };

        connectWebSocket();

    }, [serverId]);

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2>SSH Terminal for Server {serverId}</h2>
            <div ref={terminalRef} style={{ flex: 1, width: '100%' }} />
        </div>
    );
};

export default SshTerminalPage;
