import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    List, ListItem, ListItemAvatar, ListItemText, Paper, 
    Typography, CircularProgress, Alert, Chip, Menu, MenuItem, Avatar, Box, IconButton
} from '@mui/material';
import { MoreVert as MoreVertIcon, PlayArrow as PlayArrowIcon, Stop as StopIcon, Replay as ReplayIcon, Description as DescriptionIcon, Monitor as MonitorIcon } from '@mui/icons-material';
import api from '../../../../api/apiClient';
import ApplicationMonitorDialog from '../monitoring/ApplicationMonitorDialog';
import ApplicationLogsDialog from './logs/ApplicationLogsDialog';

const getStatusColor = (status) => {
    switch (status) {
        case 'active':
        case 'found':
        case 'running':
            return 'success';
        case 'inactive':
        case 'dead':
            return 'default';
        case 'not_found':
            return 'error';
        default:
            return 'warning';
    }
};

function ApplicationsTab() {
    const { customerId, serverId } = useParams();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedApp, setSelectedApp] = useState(null);
    const [monitorDialogOpen, setMonitorDialogOpen] = useState(false);
    const [monitorData, setMonitorData] = useState(null);
    const [monitorLoading, setMonitorLoading] = useState(false);
    const [monitorError, setMonitorError] = useState(null);
    const [logsDialogOpen, setLogsDialogOpen] = useState(false);

    const handleMenuOpen = (event, app) => {
        setAnchorEl(event.currentTarget);
        setSelectedApp(app);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedApp(null);
    };

    const fetchMonitoringData = async (appName) => {
        setMonitorLoading(true);
        setMonitorError(null);
        setMonitorData(null);
        try {
            const response = await api.post(`/customers/${customerId}/servers/${serverId}/monitor-application/`, { name: appName });
            setMonitorData(response.data);
        } catch (err) {
            setMonitorError(err.response?.data?.error || 'Failed to fetch monitoring data.');
        }
        setMonitorLoading(false);
    };

    const handleMonitorOpen = () => {
        if (selectedApp) {
            setMonitorDialogOpen(true);
            fetchMonitoringData(selectedApp.name);
        }
        handleMenuClose();
    };

    const handleLogsOpen = () => {
        setAnchorEl(null); // Close the menu, but keep selectedApp
        if (selectedApp) {
            setLogsDialogOpen(true);
        }
    };

    const handleApplicationAction = async (appName, action) => {
        handleMenuClose();
        setActionLoading(true);
        try {
            await api.post(`/customers/${customerId}/servers/${serverId}/manage-application/`, { name: appName, action });
            // Refresh the list to show the updated status
            const response = await api.get(`/customers/${customerId}/servers/${serverId}/scan-applications/`);
            setApplications(response.data);
        } catch (err) {
            setError(err.response?.data?.error || `Failed to ${action} ${appName}`);
        } finally {
            setActionLoading(false);
        }
    };

    useEffect(() => {
        const fetchAppStatuses = async () => {
            if (!customerId || !serverId) {
                setError("Customer ID or Server ID is missing.");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const response = await api.get(`/customers/${customerId}/servers/${serverId}/scan-applications/`);
                setApplications(response.data);
            } catch (err) {
                setError(err.response?.data?.detail || 'Failed to fetch application statuses.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAppStatuses();
    }, [customerId, serverId]);

    if (loading) return <CircularProgress sx={{ color: '#FE6B8B' }}/>;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box>
            {applications.length > 0 ? (
                <List>
                    {applications.map((app) => (
                                                <Paper 
                            key={app.id} 
                            sx={{
                                mb: 2, 
                                p: 2, 
                                borderRadius: '16px', 
                                background: 'rgba(204, 73, 73, 0.05)', 
                                backdropFilter: 'blur(10px)', 
                                WebkitBackdropFilter: 'blur(10px)', // For Safari
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            <ListItem
                                disableGutters
                                secondaryAction={
                                    <>
                                        {actionLoading && selectedApp?.name === app.name ? (
                                            <CircularProgress size={24} />
                                        ) : (
                                            <IconButton
                                                aria-label="actions"
                                                aria-controls={`actions-menu-${app.id}`}
                                                aria-haspopup="true"
                                                onClick={(event) => handleMenuOpen(event, app)}
                                                disabled={actionLoading}
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        )}
                                    </>
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar src={app.icon} alt={app.name} sx={{ width: 40, height: 40 }}>
                                        {app.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={<Typography variant="h6">{app.name}</Typography>}
                                    secondary={
                                        <>
                                            
                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Typography variant="body2" color="text.secondary" component="span">
                                                    Version: {app.version || 'N/A'}
                                                </Typography>
                                                
                                                <Chip label={app.status} color={getStatusColor(app.status)} size="small" sx={{ ml: 2 }} />
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                                {app.description}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        </Paper>
                    ))}
                </List>
            ) : (
                <Typography align="center" sx={{ mt: 4 }}>
                    No applications found or scanned yet.
                </Typography>
            )}
            <Menu
                id="actions-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    background: 'rgba(40, 50, 70, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    minWidth: '180px',
                    boxShadow: '0 8px 32px 0 rgba(58, 56, 56, 0.37)',
                    marginTop: '4px',
                    '& .MuiMenuItem-root': {
                      padding: '12px 16px',
                      fontSize: '0.875rem',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                        margin: '2px 8px',
                        width: 'calc(100% - 16px)',
                      }
                    },
                    '& .MuiListItemIcon-root': {
                      minWidth: '36px',
                    }
                  }
                }}
            >
                {selectedApp?.check_command?.includes('systemctl') && [
                    <MenuItem key="start" onClick={() => handleApplicationAction(selectedApp.name, 'start')}><PlayArrowIcon sx={{ mr: 1 }} /> Start</MenuItem>,
                    <MenuItem key="stop" onClick={() => handleApplicationAction(selectedApp.name, 'stop')}><StopIcon sx={{ mr: 1 }} /> Stop</MenuItem>,
                    <MenuItem key="restart" onClick={() => handleApplicationAction(selectedApp.name, 'restart')}><ReplayIcon sx={{ mr: 1 }} /> Restart</MenuItem>
                ]}
                <MenuItem onClick={handleLogsOpen}><DescriptionIcon sx={{ mr: 1 }} /> Logs</MenuItem>
                <MenuItem onClick={handleMonitorOpen}><MonitorIcon sx={{ mr: 1 }} /> Monitoring</MenuItem>
            </Menu>
            {monitorDialogOpen && (
                <ApplicationMonitorDialog
                    open={monitorDialogOpen}
                    onClose={() => setMonitorDialogOpen(false)}
                    appName={selectedApp?.name}
                    data={monitorData}
                    loading={monitorLoading}
                    error={monitorError}
                />
            )}
            {logsDialogOpen && (
                <ApplicationLogsDialog
                    open={logsDialogOpen}
                    onClose={() => {
                        setLogsDialogOpen(false);
                        setSelectedApp(null); // Clear selected app when dialog closes
                    }}
                    appName={selectedApp?.name}
                    customerId={customerId}
                    serverId={serverId}
                />
            )}
        </Box>
    );
}

export default ApplicationsTab;
