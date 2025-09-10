import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const SshTerminalPage = () => {
    const { customerId, serverId } = useParams();
    const navigate = useNavigate();
    const terminalRef = useRef(null);
    const term = useRef(null);
    const socketRef = useRef(null);
    const fitAddonRef = useRef(null);
    const sessionTimerRef = useRef(null);
    const idleTimerRef = useRef(null);
    const lastActivityRef = useRef(Date.now());
    
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [connectionDetails, setConnectionDetails] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copyStatus, setCopyStatus] = useState('');
    const [sessionTimer, setSessionTimer] = useState({
        duration: 0,
        idleTime: 0,
        showIdleWarning: false,
        autoLogoutCountdown: 0
    });
    const [securityInfo, setSecurityInfo] = useState({
        currentUser: null,
        hostname: null,
        clientIP: null,
        isRootUser: false,
        sessionStartTime: null,
        showRootWarning: false
    });

    // Configuration
    const IDLE_WARNING_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
    const AUTO_LOGOUT_TIME = 20 * 60 * 1000; // 20 minutes in milliseconds

    // Format time duration
    const formatDuration = (milliseconds) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    };

    // Update activity timestamp
    const updateActivity = () => {
        lastActivityRef.current = Date.now();
        setSessionTimer(prev => ({
            ...prev,
            idleTime: 0,
            showIdleWarning: false,
            autoLogoutCountdown: 0
        }));
    };

    // Session Timer Component
    const SessionTimerDisplay = () => {
        const timerStyle = {
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            marginBottom: '10px',
            padding: '8px 12px',
            backgroundColor: isFullscreen ? '#2a2a2a' : '#f1f3f4',
            border: isFullscreen ? '1px solid #4b5563' : '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'Monaco, Menlo, monospace'
        };

        const sessionStyle = {
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: '3px',
            backgroundColor: isFullscreen ? '#1a3a4a' : '#e3f2fd',
            color: isFullscreen ? '#60a5fa' : '#1976d2'
        };

        return (
            <div style={timerStyle}>
                <div style={sessionStyle}>
                    <span>⏱️</span>
                    <span>Session: {formatDuration(sessionTimer.duration)}</span>
                </div>
                
                {sessionTimer.idleTime > 60000 && ( // Show idle time after 1 minute
                    <div style={sessionStyle}>
                        <span>😴</span>
                        <span>Idle: {formatDuration(sessionTimer.idleTime)}</span>
                    </div>
                )}

                {sessionTimer.showIdleWarning && sessionTimer.autoLogoutCountdown > 0 && (
                    <div style={sessionStyle}>
                        <span>⚠️</span>
                        <span>Auto-logout in: {formatDuration(sessionTimer.autoLogoutCountdown)}</span>
                    </div>
                )}

                {connectionStatus === 'connected' && (
                    <button
                        onClick={updateActivity}
                        style={{
                            padding: '2px 8px',
                            backgroundColor: isFullscreen ? '#374151' : '#e5e7eb',
                            color: isFullscreen ? '#d1d5db' : '#374151',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '10px'
                        }}
                        title="Reset idle timer"
                    >
                        Stay Active
                    </button>
                )}
            </div>
        );
    };

    // Idle Warning Modal
    const IdleWarningModal = () => {
        if (!sessionTimer.showIdleWarning) return null;

        const modalOverlayStyle = {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001
        };

        const modalStyle = {
            backgroundColor: '#1f2937',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            color: '#f3f4f6',
            textAlign: 'center'
        };

        const handleStayActive = () => {
            updateActivity();
        };

        const handleLogout = () => {
            handleCloseTerminal();
        };

        return (
            <div style={modalOverlayStyle}>
                <div style={modalStyle}>
                    <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '48px' }}>⏰</span>
                    </div>
                    
                    <h3 style={{ margin: '0 0 16px 0', color: '#f59e0b', fontSize: '18px', fontWeight: 'bold' }}>
                        Session Idle Warning
                    </h3>
                    
                    <p style={{ margin: '0 0 16px 0', color: '#d1d5db' }}>
                        Your session has been idle for {formatDuration(sessionTimer.idleTime)}.
                    </p>
                    
                    <p style={{ margin: '0 0 20px 0', color: '#fbbf24', fontSize: '16px', fontWeight: 'bold' }}>
                        Auto-logout in: {formatDuration(sessionTimer.autoLogoutCountdown)}
                    </p>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button
                            onClick={handleStayActive}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                        >
                            Stay Active
                        </button>
                        <button
                            onClick={handleLogout}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                        >
                            Logout Now
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Start session timers
    const startSessionTimers = useCallback(() => {
        // Clear existing timers
        if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
        if (idleTimerRef.current) clearInterval(idleTimerRef.current);

        const startTime = Date.now();
        lastActivityRef.current = startTime;

        // Session duration timer (updates every second)
        sessionTimerRef.current = setInterval(() => {
            const now = Date.now();
            const sessionDuration = now - startTime;
            const idleTime = now - lastActivityRef.current;

            setSessionTimer(prev => {
                const newState = {
                    ...prev,
                    duration: sessionDuration,
                    idleTime: idleTime
                };

                // Check for idle warning
                if (idleTime > IDLE_WARNING_TIME && !prev.showIdleWarning) {
                    newState.showIdleWarning = true;
                    newState.autoLogoutCountdown = AUTO_LOGOUT_TIME - idleTime;
                }

                // Update countdown if warning is showing
                if (prev.showIdleWarning && idleTime < AUTO_LOGOUT_TIME) {
                    newState.autoLogoutCountdown = AUTO_LOGOUT_TIME - idleTime;
                }

                // Auto logout
                if (idleTime > AUTO_LOGOUT_TIME) {
                    console.log('Auto-logout triggered due to inactivity');
                    // Inline close to avoid callback dependency cycle
                    if (socketRef.current) {
                        try { socketRef.current.close(); } catch (e) { /* noop */ }
                    }
                    navigate(`/customers/${customerId}/servers`);
                    return prev; // Don't update state if logging out
                }

                return newState;
            });
        }, 1000);
    }, [AUTO_LOGOUT_TIME, IDLE_WARNING_TIME, customerId, navigate]);

    // Stop session timers
    const stopSessionTimers = useCallback(() => {
        if (sessionTimerRef.current) {
            clearInterval(sessionTimerRef.current);
            sessionTimerRef.current = null;
        }
        if (idleTimerRef.current) {
            clearInterval(idleTimerRef.current);
            idleTimerRef.current = null;
        }
        setSessionTimer({
            duration: 0,
            idleTime: 0,
            showIdleWarning: false,
            autoLogoutCountdown: 0
        });
    }, []);

    // Get client IP address
    useEffect(() => {
        const fetchClientIP = async () => {
            try {
                const response = await fetch('/api/client-ip/');
                if (response.ok) {
                    const data = await response.json();
                    setSecurityInfo(prev => ({ ...prev, clientIP: data.ip }));
                } else {
                    const fallbackResponse = await fetch('https://api.ipify.org?format=json');
                    const fallbackData = await fallbackResponse.json();
                    setSecurityInfo(prev => ({ ...prev, clientIP: fallbackData.ip }));
                }
            } catch (error) {
                console.error('Error fetching client IP:', error);
                setSecurityInfo(prev => ({ ...prev, clientIP: 'Unknown' }));
            }
        };

        fetchClientIP();
    }, []);

    // Add activity listeners
    useEffect(() => {
        const handleActivity = () => {
            updateActivity();
        };

        // Listen for various activity events
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        events.forEach(event => {
            document.addEventListener(event, handleActivity, true);
        });

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleActivity, true);
            });
        };
    }, []);

    // Root Warning Modal Component
    const RootWarningModal = () => {
        if (!securityInfo.showRootWarning) return null;

        const modalOverlayStyle = {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
        };

        const modalStyle = {
            backgroundColor: '#1f2937',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            color: '#f3f4f6'
        };

        const handleDismiss = () => {
            setSecurityInfo(prev => ({ ...prev, showRootWarning: false }));
        };

        return (
            <div style={modalOverlayStyle}>
                <div style={modalStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '24px', marginRight: '12px' }}>⚠️</span>
                        <h3 style={{ margin: 0, color: '#ef4444', fontSize: '18px', fontWeight: 'bold' }}>
                            ROOT ACCESS WARNING
                        </h3>
                    </div>
                    
                    <div style={{ marginBottom: '20px', lineHeight: '1.6' }}>
                        <p style={{ margin: '0 0 12px 0' }}>
                            <strong>You are logged in as the root user!</strong>
                        </p>
                        <p style={{ margin: '0 0 12px 0', color: '#d1d5db' }}>
                            Root access provides unrestricted system privileges. Please be cautious with your commands as they can:
                        </p>
                        <ul style={{ margin: '0 0 12px 20px', color: '#d1d5db' }}>
                            <li>Modify critical system files</li>
                            <li>Delete important data</li>
                            <li>Compromise system security</li>
                            <li>Affect other users and services</li>
                        </ul>
                        <p style={{ margin: '0', color: '#fbbf24', fontSize: '14px' }}>
                            💡 <strong>Recommendation:</strong> Consider using a non-root user with sudo privileges for routine tasks.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleDismiss}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                        >
                            I Understand
                        </button>
                        <button
                            onClick={() => {
                                handleDismiss();
                                handleCloseTerminal();
                            }}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                        >
                            Close Terminal
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Security Panel Component
    const SecurityPanel = () => {
        const panelStyle = {
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            marginBottom: '15px',
            padding: '12px 16px',
            backgroundColor: isFullscreen ? '#2d2d2d' : '#f8f9fa',
            border: isFullscreen ? '1px solid #525252' : '1px solid #e9ecef',
            borderRadius: '6px',
            fontSize: '13px',
            flexWrap: 'wrap'
        };

        const securityItemStyle = {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'Monaco, Menlo, monospace'
        };

        const userStyle = {
            ...securityItemStyle,
            backgroundColor: securityInfo.isRootUser 
                ? (isFullscreen ? '#4a1a1a' : '#fff5f5')
                : (isFullscreen ? '#1a3a4a' : '#f0f9ff'),
            color: securityInfo.isRootUser 
                ? (isFullscreen ? '#f87171' : '#dc2626')
                : (isFullscreen ? '#60a5fa' : '#2563eb'),
            border: securityInfo.isRootUser 
                ? (isFullscreen ? '1px solid #ef4444' : '1px solid #fecaca')
                : (isFullscreen ? '1px solid #3b82f6' : '1px solid #bfdbfe')
        };

        const ipStyle = {
            ...securityItemStyle,
            backgroundColor: isFullscreen ? '#3a2a1a' : '#fffbeb',
            color: isFullscreen ? '#fbbf24' : '#d97706',
            border: isFullscreen ? '1px solid #f59e0b' : '1px solid #fed7aa'
        };

        const timeStyle = {
            ...securityItemStyle,
            backgroundColor: isFullscreen ? '#2a2a2a' : '#f9fafb',
            color: isFullscreen ? '#d1d5db' : '#6b7280',
            border: isFullscreen ? '1px solid #4b5563' : '1px solid #d1d5db'
        };

        return (
            <div style={panelStyle}>
                {/* Persistent Root Warning Banner */}
                {securityInfo.isRootUser && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: isFullscreen ? '#4a1a1a' : '#fef2f2',
                        color: isFullscreen ? '#f87171' : '#dc2626',
                        border: isFullscreen ? '1px solid #ef4444' : '1px solid #fecaca',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        animation: 'pulse 2s infinite'
                    }}>
                        <span style={{ fontSize: '14px' }}>⚠️</span>
                        <span>ROOT ACCESS ACTIVE - USE WITH CAUTION</span>
                        <button
                            onClick={() => setSecurityInfo(prev => ({ ...prev, showRootWarning: true }))}
                            style={{
                                marginLeft: '8px',
                                padding: '2px 6px',
                                backgroundColor: 'transparent',
                                color: 'inherit',
                                border: '1px solid currentColor',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '10px'
                            }}
                            title="Show security warning"
                        >
                            INFO
                        </button>
                    </div>
                )}

                {/* Current User */}
                <div style={userStyle}>
                    <span>👤</span>
                    <span>
                        {securityInfo.currentUser && securityInfo.hostname 
                            ? `${securityInfo.currentUser}@${securityInfo.hostname}`
                            : connectionDetails 
                                ? `${connectionDetails.username}@${connectionDetails.host}`
                                : 'Not connected'
                        }
                    </span>
                </div>

                {/* Client IP */}
                <div style={ipStyle}>
                    <span>🌐</span>
                    <span>Client: {securityInfo.clientIP || 'Loading...'}</span>
                </div>

                {/* Session Time */}
                {securityInfo.sessionStartTime && (
                    <div style={timeStyle}>
                        <span>⏱️</span>
                        <span>Connected: {new Date(securityInfo.sessionStartTime).toLocaleTimeString()}</span>
                    </div>
                )}

                {/* Server IP */}
                {connectionDetails && (
                    <div style={ipStyle}>
                        <span>🖥️</span>
                        <span>Server: {connectionDetails.host}:{connectionDetails.port}</span>
                    </div>
                )}
            </div>
        );
    };

    // Connection status styles
    const getStatusStyle = (status) => {
        const baseStyle = {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500',
            marginLeft: '10px'
        };

        switch (status) {
            case 'connected':
                return {
                    ...baseStyle,
                    backgroundColor: isFullscreen ? '#1a4d3a' : '#d4edda',
                    color: isFullscreen ? '#4ade80' : '#155724',
                    border: isFullscreen ? '1px solid #22c55e' : '1px solid #c3e6cb'
                };
            case 'connecting':
                return {
                    ...baseStyle,
                    backgroundColor: isFullscreen ? '#4a3d1a' : '#fff3cd',
                    color: isFullscreen ? '#fbbf24' : '#856404',
                    border: isFullscreen ? '1px solid #f59e0b' : '1px solid #ffeaa7'
                };
            case 'disconnected':
            case 'error':
                return {
                    ...baseStyle,
                    backgroundColor: isFullscreen ? '#4a1a1a' : '#f8d7da',
                    color: isFullscreen ? '#f87171' : '#721c24',
                    border: isFullscreen ? '1px solid #ef4444' : '1px solid #f5c6cb'
                };
            default:
                return baseStyle;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'connected':
                return '🟢 Live Connection';
            case 'connecting':
                return '🟡 Connecting...';
            case 'disconnected':
                return '🔴 Disconnected';
            case 'error':
                return '🔴 Connection Error';
            default:
                return '⚪ Unknown';
        }
    };

    const handleReconnect = () => {
        if (connectionDetails) {
            setConnectionStatus('connecting');
            // Reset security info on reconnect
            setSecurityInfo(prev => ({
                ...prev,
                currentUser: null,
                hostname: null,
                isRootUser: false,
                sessionStartTime: null
            }));
            // Trigger reconnection by re-running the WebSocket setup
            connectWebSocket();
        }
    };

    const handleCloseTerminal = () => {
        // Close WebSocket connection
        if (socketRef.current) {
            socketRef.current.close();
        }
        
        // Navigate back to servers list or previous page
        navigate(`/customers/${customerId}/servers`);
    };

    const handleCopyOutput = async () => {
        if (!term.current) {
            setCopyStatus('❌ No terminal content');
            setTimeout(() => setCopyStatus(''), 2000);
            return;
        }

        try {
            // Get all terminal content including scrollback
            const buffer = term.current.buffer.active;
            let content = '';
            
            // Get content from scrollback buffer
            for (let i = 0; i < buffer.length; i++) {
                const line = buffer.getLine(i);
                if (line) {
                    content += line.translateToString(true) + '\n';
                }
            }

            // Fallback: get visible content if buffer method doesn't work
            if (!content.trim()) {
                content = term.current.getSelection() || 'Terminal content could not be extracted';
            }

            await navigator.clipboard.writeText(content);
            setCopyStatus('✅ Copied!');
            setTimeout(() => setCopyStatus(''), 2000);
        } catch (error) {
            console.error('Failed to copy terminal output:', error);
            setCopyStatus('❌ Copy failed');
            setTimeout(() => setCopyStatus(''), 2000);
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        // Delay the resize to allow the DOM to update
        setTimeout(() => {
            if (fitAddonRef.current && term.current) {
                try {
                    fitAddonRef.current.fit();
                } catch (e) {
                    console.error("Error fitting terminal on fullscreen toggle:", e);
                }
            }
        }, 100);
    };

    const handleEscapeKey = useCallback((event) => {
        if (event.key === 'Escape' && isFullscreen) {
            setIsFullscreen(false);
            setTimeout(() => {
                if (fitAddonRef.current && term.current) {
                    try {
                        fitAddonRef.current.fit();
                    } catch (e) {
                        console.error("Error fitting terminal on escape:", e);
                    }
                }
            }, 100);
        }
    }, [isFullscreen]);

    useEffect(() => {
        if (isFullscreen) {
            document.addEventListener('keydown', handleEscapeKey);
        } else {
            document.removeEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isFullscreen, handleEscapeKey]);

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
                const credentials = {
                    host: data.server_ip,
                    port: data.ssh_port,
                    username: data.ssh_user,
                    password: data.ssh_password
                };
                setConnectionDetails(credentials);
                
                // Update security info with connection details
                setSecurityInfo(prev => ({
                    ...prev,
                    isRootUser: credentials.username === 'root',
                    currentUser: credentials.username
                }));
                
            } catch (error) {
                console.error('Error fetching credentials:', error);
                setConnectionStatus('error');
            }
        };

        const fetchServerInfo = async () => {
            try {
                const response = await fetch(`/api/customers/${customerId}/servers/${serverId}/`);
                if (response.ok) {
                    const data = await response.json();
                    setSecurityInfo(prev => ({
                        ...prev,
                        hostname: data.hostname || data.server_name || `server-${serverId}`
                    }));
                }
            } catch (error) {
                console.error('Error fetching server info:', error);
            }
        };

        if (customerId && serverId) {
            fetchCredentials();
            fetchServerInfo();
        }
    }, [customerId, serverId]);

    const connectWebSocket = useCallback(() => {
        if (!connectionDetails) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:5000/ws/servers/${serverId}/ssh`;
        console.log('Connecting to:', wsUrl);
        
        // Close existing connection if any
        if (socketRef.current) {
            socketRef.current.close();
        }
        
        socketRef.current = new WebSocket(wsUrl);
        
        socketRef.current.onopen = () => {
            console.log('WebSocket connected');
            setConnectionStatus('connected');
            setSecurityInfo(prev => ({
                ...prev,
                sessionStartTime: new Date().toISOString()
            }));
            
            socketRef.current.send(JSON.stringify({
                host: connectionDetails.host,
                port: connectionDetails.port,
                username: connectionDetails.username,
                password: connectionDetails.password
            }));
            
            // Only show connection message in terminal, status is handled by UI
            if (term.current) {
                term.current.clear(); // Clear previous messages
                term.current.writeln('\x1B[1;32m=== SSH Session Started ===\x1B[0m');
            }
        };
        
        socketRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setConnectionStatus('error');
        };
        
        socketRef.current.onclose = () => {
            console.log('WebSocket closed');
            setConnectionStatus('disconnected');
            if (term.current) {
                term.current.writeln('\x1B[1;33m=== SSH Session Ended ===\x1B[0m');
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
                    setConnectionStatus('error');
                }
            } catch (e) {
                term.current.write(event.data); // Assume raw string output
            }
        };
    }, [connectionDetails, serverId]);

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

        // Initialize Terminal with enhanced dark theme
        term.current = new Terminal({ 
            cursorBlink: true, 
            theme: { 
                background: '#1a1a1a',
                foreground: '#e5e5e5',
                cursor: '#00ff00',
                cursorAccent: '#1a1a1a',
                selection: 'rgba(255, 255, 255, 0.3)',
                black: '#2e3436',
                red: '#cc0000',
                green: '#4e9a06',
                yellow: '#c4a000',
                blue: '#3465a4',
                magenta: '#75507b',
                cyan: '#06989a',
                white: '#d3d7cf',
                brightBlack: '#555753',
                brightRed: '#ef2929',
                brightGreen: '#8ae234',
                brightYellow: '#fce94f',
                brightBlue: '#729fcf',
                brightMagenta: '#ad7fa8',
                brightCyan: '#34e2e2',
                brightWhite: '#eeeeec'
            },
            scrollback: 10000, // Allow 10,000 lines of scrollback
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "Fira Code", monospace',
            lineHeight: 1.2
        });
        
        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
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

        // Setup WebSocket connection
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
            fitAddonRef.current = null;
        };
    }, [connectionDetails, serverId, connectWebSocket]); // Depend on connectionDetails and callback

    // Container styles based on fullscreen state
    const containerStyle = isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1e1e1e',
        zIndex: 9999,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
    } : {
        padding: '20px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
    };

    const terminalContainerStyle = {
        flex: 1,
        width: '100%',
        minHeight: isFullscreen ? 'calc(100vh - 120px)' : '500px',
        maxHeight: isFullscreen ? 'calc(100vh - 120px)' : '80vh',
        overflow: 'hidden',
        border: '1px solid #444',
        borderRadius: '4px',
        backgroundColor: '#1e1e1e'
    };

    const buttonStyle = {
        marginLeft: '10px',
        padding: '6px 12px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'background-color 0.2s'
    };

    const reconnectButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#007bff'
    };

    const closeButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#dc3545'
    };

    const copyButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#28a745'
    };

    // Add this useEffect to start timers when connected
    useEffect(() => {
        if (connectionStatus === 'connected') {
            startSessionTimers();
        } else {
            stopSessionTimers();
        }

        return () => {
            stopSessionTimers();
        };
    }, [connectionStatus, startSessionTimers, stopSessionTimers]);

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '5px' }}>
                <h2 style={{ margin: 0, color: isFullscreen ? 'white' : 'inherit' }}>
                    SSH Terminal for Server {serverId}
                </h2>
                <span style={getStatusStyle(connectionStatus)}>
                    {getStatusText(connectionStatus)}
                </span>
                
                {/* Copy Status Display */}
                {copyStatus && (
                    <span style={{ 
                        marginLeft: '10px', 
                        color: copyStatus.includes('✅') ? '#28a745' : '#dc3545',
                        fontSize: '12px'
                    }}>
                        {copyStatus}
                    </span>
                )}
                
                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}>
                    <button
                        onClick={handleReconnect}
                        style={reconnectButtonStyle}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                        title="Reconnect to SSH session"
                    >
                        🔁 Reconnect
                    </button>
                    
                    <button
                        onClick={handleCopyOutput}
                        style={copyButtonStyle}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                        title="Copy terminal output to clipboard"
                    >
                        📋 Copy Output
                    </button>
                    
                    <button
                        onClick={toggleFullscreen}
                        style={buttonStyle}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
                        title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
                    >
                        {isFullscreen ? '🗗 Exit Fullscreen' : '🗖 Fullscreen'}
                    </button>
                    
                    <button
                        onClick={handleCloseTerminal}
                        style={closeButtonStyle}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                        title="Close Terminal"
                    >
                        ❌ Close Terminal
                    </button>
                </div>
            </div>
            
            {/* ADD THESE TIMER COMPONENTS HERE */}
            {connectionStatus === 'connected' && <SessionTimerDisplay />}
            <SecurityPanel />
            
            {isFullscreen && (
                <div style={{ 
                    color: '#888', 
                    fontSize: '12px', 
                    marginBottom: '10px',
                    textAlign: 'center'
                }}>
                    Press <kbd style={{ 
                        backgroundColor: '#333', 
                        padding: '2px 6px', 
                        borderRadius: '3px',
                        border: '1px solid #555'
                    }}>Esc</kbd> to exit fullscreen
                </div>
            )}
            
            <div style={terminalContainerStyle}>
                <div 
                    ref={terminalRef} 
                    style={{ 
                        width: '100%', 
                        height: '100%',
                        overflow: 'auto' // Enable scrolling
                    }} 
                />
            </div>

            {/* Modal Components */}
            <IdleWarningModal />
            <RootWarningModal />
        </div>
    );
};

export default SshTerminalPage;
