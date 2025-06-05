import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const SshTerminalPage = () => {
    const { serverId } = useParams();
    const terminalRef = useRef(null); // Ref for the container div
    const term = useRef(null); // Ref for the Terminal instance
    const socketRef = useRef(null);

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

        // Setup WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//localhost:8000/ws/servers/${serverId}/ssh/`;
        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onopen = () => {
            console.log('WebSocket connected');
            handleResize(); // Perform initial fit
            term.current.writeln('Welcome to the SSH Terminal! Connecting to server...');
        };

        socketRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'terminal_output' && data.output) {
                term.current.write(data.output);
            } else if (data.type === 'status' || data.type === 'error') {
                term.current.writeln(`[${data.type.toUpperCase()}]: ${data.message}`);
            }
        };

        socketRef.current.onerror = (error) => {
            console.error('WebSocket Error:', error);
            term.current.writeln('\n[ERROR]: WebSocket connection failed.');
        };

        socketRef.current.onclose = () => {
            console.log('WebSocket disconnected');
            term.current.writeln('\n[INFO]: WebSocket connection closed.');
        };

        // Handle terminal input
        const onDataDisposable = term.current.onData(data => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                const message = { action: 'send_ssh_data', data: { command: data } };
                socketRef.current.send(JSON.stringify(message));
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
    }, [serverId]);

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2>SSH Terminal for Server {serverId}</h2>
            <div ref={terminalRef} style={{ flex: 1, width: '100%' }} />
        </div>
    );
};

export default SshTerminalPage;
