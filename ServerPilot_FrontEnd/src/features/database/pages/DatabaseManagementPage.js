import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,CardContent,CircularProgress,
    IconButton, Alert, Grid, Tooltip} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    CloudDownload as CloudDownloadIcon,
    Restore as RestoreIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    DataUsage as DataUsageIcon,
    Schedule as ScheduleIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    HighlightOffOutlined as HighlightOffOutlinedIcon
} from '@mui/icons-material';
import apiClient from '../../../api/apiClient';
import { CustomSnackbar, useSnackbar, CircularProgressSx, GlassCard, ConfirmDialog, glassCardSx } from '../../../common';
import BackupNowCard from '../components/BackupNowCard';
import BackupScheduleCard from '../components/BackupScheduleCard';


const RootContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    
}));

// Styled Table Container with glassmorphism
const GlassTableContainer = styled(TableContainer)(({ theme }) => ({
    background: 'rgba(38, 50, 56, 0.4)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    '& .MuiTable-root': {
        '& .MuiTableHead-root': {
            '& .MuiTableCell-root': {
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 'bold',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            }
        },
        '& .MuiTableBody-root': {
            '& .MuiTableCell-root': {
                color: '#fff',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }
        }
    }
}));

const DatabaseManagementPage = () => {
    const [backups, setBackups] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState('');

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);

    // State for schedule management
    const [schedule, setSchedule] = useState({ enabled: false, hour: '2', minute: '0' });
    const [scheduleLoading, setScheduleLoading] = useState(true);
    const [scheduleSaving, setScheduleSaving] = useState(false);

    // Use the custom snackbar hook
    const { snackbar, showSuccess, showError, showInfo, hideSnackbar } = useSnackbar();

    const fetchBackups = useCallback(async () => {
        setListLoading(true);
        setListError('');
        try {
            const response = await apiClient.get('/db/backups/');
            setBackups(response.data);
        } catch (error) { 
            console.error('Failed to fetch backups:', error);
            setListError('Failed to load backups. Please try again.');
            showError('Failed to load backups.');
        } finally {
            setListLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchSchedule = async () => {
            setScheduleLoading(true);
            try {
                const response = await apiClient.get('/db/schedule/');
                setSchedule({
                    enabled: response.data.enabled,
                    hour: response.data.hour !== undefined ? String(response.data.hour) : '2',
                    minute: response.data.minute !== undefined ? String(response.data.minute) : '0',
                });
            } catch (error) {
                console.error('Failed to fetch schedule:', error);
                showError('Failed to load backup schedule.');
            } finally {
                setScheduleLoading(false);
            }
        };

        fetchBackups();
        fetchSchedule();
    }, [fetchBackups]);

    const handleBackupTriggered = () => {
        fetchBackups();
    };

    const handleScheduleChange = (event) => {
        console.log('Schedule change event:', event.target);
        const { name, value, checked, type } = event.target;
        setSchedule(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSaveSchedule = async () => {
        console.log('Saving schedule:', schedule);
        setScheduleSaving(true);
        try {
            const response = await apiClient.post('/db/schedule/', {
                enabled: schedule.enabled,
                hour: parseInt(schedule.hour, 10),
                minute: parseInt(schedule.minute, 10),
            });
            console.log('Schedule save response:', response);
            showSuccess('Schedule updated successfully!');
        } catch (error) {
            console.error('Failed to save schedule:', error);
            showError('Failed to save schedule.');
        } finally {
            setScheduleSaving(false);
        }
    };

    const handleDeleteClick = (backup) => {
        setSelectedBackup(backup);
        setOpenDialog(true);
    };

    const handleDialogClose = () => {
        setOpenDialog(false);
        setSelectedBackup(null);
    };

    const handleConfirmDelete = async () => {
        if (!selectedBackup) return;
        try {
            await apiClient.delete(`/db/backups/delete/${selectedBackup.filename}/`);
            showSuccess('Backup deleted successfully!');
            fetchBackups();
        } catch (error) {
            console.error('Failed to delete backup:', error);
            showError('Failed to delete backup.');
        }
        handleDialogClose();
    };

    const handleDownloadBackup = async (backup) => {
        try {
            console.log('Starting download for backup:', backup.filename);
            
            const response = await apiClient.get(`/db/backups/download/${backup.filename}/`, {
                responseType: 'blob', // Important for file downloads
            });
            
            // Create a blob URL and trigger download
            const blob = new Blob([response.data], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = backup.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            showSuccess('Backup download started!');
        } catch (error) {
            console.error('Failed to download backup:', error);
            console.error('Error response:', error.response);
            console.error('Error status:', error.response?.status);
            console.error('Error data:', error.response?.data);
            
            if (error.response?.status === 401) {
                showError('Authentication required. Please log in again.');
            } else if (error.response?.status === 403) {
                showError('Access denied. You do not have permission to download this backup.');
            } else if (error.response?.status === 404) {
                showError('Backup file not found. It may have been deleted.');
            } else {
                showError('Failed to download backup. Please try again.');
            }
        }
    };

    const totalBackups = backups.length;
    const totalSizeBytes = useMemo(() => backups.reduce((sum, b) => sum + (b.size || 0), 0), [backups]);
    const lastBackupAt = useMemo(() => {
        if (!backups.length) return null;
        const latest = backups.reduce((acc, b) => {
            const t = new Date(b.created_at).getTime();
            return t > acc ? t : acc;
        }, 0);
        return new Date(latest);
    }, [backups]);

    const handleHeaderRefresh = () => {
        fetchBackups();
        (async () => {
            try {
                const response = await apiClient.get('/db/schedule/');
                setSchedule({
                    enabled: response.data.enabled,
                    hour: response.data.hour !== undefined ? String(response.data.hour) : '2',
                    minute: response.data.minute !== undefined ? String(response.data.minute) : '0',
                });
            } catch (error) {
                console.error('Failed to refresh schedule:', error);
            }
        })();
    };



    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <RootContainer>
            <GlassCard sx={{width: 1162, maxWidth: '95vw', p: '40px'}}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
                <Typography 
                    variant="h3" 
                    component="h1" 
                    sx={{ 
                        fontWeight: 'bold', 
                        color: '#fff', 
                        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                         mb: 0
                    }}
                >
                    Database Management
                </Typography>

                {listError && (
                    <Alert 
                        severity="error" 
                        sx={{ 
                            mb: 2, 
                            background: 'rgba(211, 47, 47, 0.8)', 
                            color: '#fff',
                            '& .MuiAlert-icon': { color: '#fff' }
                        }}
                    >
                        {listError}
                    </Alert>
                )}
             </Box>

            <Box sx={{ position: 'relative', zIndex: 2 }}>
                {console.log('Rendering backup components')}
                <BackupNowCard onBackupTriggered={handleBackupTriggered} />

                <BackupScheduleCard 
                    schedule={schedule}
                    scheduleLoading={scheduleLoading}
                    scheduleSaving={scheduleSaving}
                    onChange={handleScheduleChange}
                    onSave={handleSaveSchedule}
                />
            </Box>

            <GlassCard sx={{ position: 'relative', zIndex: 2 }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>Available Backups</Typography>
                        <IconButton onClick={fetchBackups} disabled={listLoading} sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            <RefreshIcon />
                        </IconButton>
                    </Box>
                                    {listLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                        <CircularProgress sx={CircularProgressSx} />
                    </Box>
                ) : listError ? (
                    <Alert severity="error" sx={{ background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{listError}</Alert>
                ) : (
                        <GlassTableContainer component={Paper}>
                            <Table sx={{ minWidth: 650 }} aria-label="simple table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Filename</TableCell>
                                        <TableCell align="right">Size</TableCell>
                                        <TableCell align="right">Created At</TableCell>
                                        <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {backups.length > 0 ? backups.map((backup) => (
                                        <TableRow key={backup.filename}>
                                            <TableCell component="th" scope="row">
                                                {backup.filename}
                                            </TableCell>
                                            <TableCell align="right">{formatBytes(backup.size)}</TableCell>
                                            <TableCell align="right">{new Date(backup.created_at).toLocaleString()}</TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    color="success"
                                                    onClick={() => handleDownloadBackup(backup)}
                                                >
                                                    <CloudDownloadIcon />
                                                </IconButton>
                                                <IconButton color="primary" onClick={() => alert('Restore functionality to be implemented.')}>
                                                    <RestoreIcon />
                                                </IconButton>
                                                <IconButton color="error" onClick={() => handleDeleteClick(backup)} >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">No backups found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </GlassTableContainer>
                    )}
                </CardContent>
            </GlassCard>
            <ConfirmDialog
                open={openDialog}
                onClose={handleDialogClose}
                onConfirm={handleConfirmDelete}
                title="Confirm Deletion"
                message={`Are you sure you want to delete the backup file ${selectedBackup?.filename}? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                severity="error"
              />
            <CustomSnackbar
                open={snackbar.open}
                onClose={hideSnackbar}
                severity={snackbar.severity}
                message={snackbar.message}
            />
            </GlassCard>
        </RootContainer>
    );
};

export default DatabaseManagementPage;
