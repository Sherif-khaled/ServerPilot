import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const SshTerminalPage = () => {
    const { customerId, serverId } = useParams();
    console.log('Attempting to fetch credentials for customer:', customerId, 'server:', serverId);
    const terminalRef = useRef(null); // Ref for the container div
    const term = useRef(null); // Ref for the Terminal instance
    const socketRef = useRef(null);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [connectionDetails, setConnectionDetails] = useState(null);


    useEffect(() => {
        const fetchCredentials = async () => {
            // Reset state on new server navigation to prevent using stale details
            setConnectionDetails(null);
            setConnectionStatus('connecting');

            try {
                const response = await fetch(`/api/customers/${customerId}/servers/${serverId}/credentials/`);
                if (!response.ok) {
                    throw new Error('Failed to fetch credentials');
                }
                const data = await response.json();
                setConnectionDetails({
                    host: data.server_ip,
                    port: data.ssh_port,
                    username: data.ssh_user,
                    password: data.ssh_password
                });
                setConnectionStatus('loaded');
            } catch (error) {
                console.error('Error fetching credentials:', error);
                setConnectionStatus('error');
            }
        };

        if (customerId && serverId) {
            fetchCredentials();
        }
    }, [customerId, serverId]);

    useEffect(() => {
        // This effect handles the terminal and WebSocket setup.
        // It depends on `connectionDetails`, so it will only run after credentials are fetched.
        if (!connectionDetails || !terminalRef.current) {
            return; // Exit if no details, or if the terminal container isn't ready.
        }

        // Avoid re-initializing the terminal if it already exists.
        if (term.current) {
            return;
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
        
        handleResize(); // Initial fit
        window.addEventListener('resize', handleResize);

        // Setup WebSocket
        const connectWebSocket = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.hostname}:5000/ws/servers/${serverId}/ssh`;
            console.log('Connecting to:', wsUrl);
            
            socketRef.current = new WebSocket(wsUrl);
            
            socketRef.current.onopen = () => {
                console.log('WebSocket connected');
                term.current.writeln('\x1B[1;32mConnected to terminal server\x1B[0m');
                
                socketRef.current.send(JSON.stringify({
                    host: connectionDetails.host,
                    port: connectionDetails.port,
                    username: connectionDetails.username,
                    password: connectionDetails.password
                }));
                
                handleResize();
            };
            
            socketRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                if (term.current) {
                    term.current.writeln('\x1B[1;31mConnection error.\x1B[0m');
                }
            };
            
            socketRef.current.onclose = () => {
                console.log('WebSocket closed');
                if (term.current) {
                    term.current.writeln('\x1B[1;33mConnection closed.\x1B[0m');
                }
            };
            
            socketRef.current.onmessage = (event) => {
                if (!term.current) return;
                // The backend might send raw strings or JSON
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'output') {
                        term.current.write(data.output);
                    } else if (data.type === 'error') {
                        term.current.writeln(`\x1B[1;31m[ERROR]: ${data.message}\x1B[0m`);
                    }
                } catch (e) {
                    term.current.write(event.data); // Assume raw string output
                }
            };
        };

        connectWebSocket();

        const onDataDisposable = term.current.onData(data => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(data);
            }
        });

        const onResizeDisposable = term.current.onResize(size => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                const message = { action: 'resize', data: { cols: size.cols, rows: size.rows } };
                socketRef.current.send(JSON.stringify(message));
            }
        });

        // Cleanup on component unmount or when details change
        return () => {
            window.removeEventListener('resize', handleResize);
            onDataDisposable.dispose();
            onResizeDisposable.dispose();
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (term.current) {
                term.current.dispose();
                term.current = null; // Important: allow re-initialization
            }
        };
    }, [connectionDetails, serverId]); // Depend on connectionDetails

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2>SSH Terminal for Server {serverId}</h2>
            <div ref={terminalRef} style={{ flex: 1, width: '100%' }} />
        </div>
    );
};

export default SshTerminalPage;
