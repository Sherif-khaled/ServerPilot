import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, Button, CircularProgress, Grid, TextField,
    FormControlLabel, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Snackbar, Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    Refresh as RefreshIcon,
    CloudDownload as CloudDownloadIcon,
    Restore as RestoreIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import apiClient from '../../../api/apiClient';

// Styled root component for the background
const RootContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
}));

// Glassmorphism Card
const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(38, 50, 56, 0.6)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    '& .MuiCardContent-root': {
        color: '#fff',
    }
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
    const [loading, setLoading] = useState(false);
    const [backups, setBackups] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);

    // State for schedule management
    const [schedule, setSchedule] = useState({ enabled: false, hour: '2', minute: '0' });
    const [scheduleLoading, setScheduleLoading] = useState(true);
    const [scheduleSaving, setScheduleSaving] = useState(false);

    const fetchBackups = useCallback(async () => {
        setListLoading(true);
        setListError('');
        try {
            const response = await apiClient.get('/db/backups/');
            setBackups(response.data);
        } catch (error) { 
            console.error('Failed to fetch backups:', error);
            setListError('Failed to load backups. Please try again.');
            setSnackbar({ open: true, message: 'Failed to load backups.', severity: 'error' });
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
                setSnackbar({ open: true, message: 'Failed to load backup schedule.', severity: 'error' });
            } finally {
                setScheduleLoading(false);
            }
        };

        fetchBackups();
        fetchSchedule();
    }, [fetchBackups]);

    const handleBackupNow = async () => {
        setLoading(true);
        try {
            const response = await apiClient.post('/db/backup/');
            setSnackbar({ open: true, message: 'Backup task started successfully!', severity: 'success' });
            fetchBackups(); // Refresh the list after starting a new backup
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'An unexpected error occurred.';
            setSnackbar({ open: true, message: `Backup failed: ${errorMessage}`, severity: 'error' });
        }
        setLoading(false);
    };

    const handleScheduleChange = (event) => {
        const { name, value, checked, type } = event.target;
        setSchedule(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSaveSchedule = async () => {
        setScheduleSaving(true);
        try {
            await apiClient.post('/db/schedule/', {
                enabled: schedule.enabled,
                hour: parseInt(schedule.hour, 10),
                minute: parseInt(schedule.minute, 10),
            });
            setSnackbar({ open: true, message: 'Schedule updated successfully!', severity: 'success' });
        } catch (error) {
            console.error('Failed to save schedule:', error);
            setSnackbar({ open: true, message: 'Failed to save schedule.', severity: 'error' });
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
            setSnackbar({ open: true, message: 'Backup deleted successfully!', severity: 'success' });
            fetchBackups(); // Refresh the list
        } catch (error) {
            console.error('Failed to delete backup:', error);
            setSnackbar({ open: true, message: 'Failed to delete backup.', severity: 'error' });
        }
        handleDialogClose();
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar({ ...snackbar, open: false });
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
            <Typography 
                variant="h3" 
                component="h1" 
                sx={{ 
                    fontWeight: 'bold', 
                    color: '#fff', 
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    mb: 4
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

            <GlassCard sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold' }}>
                        Manual Backup
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                        Click the button below to create an immediate backup of the database. The process will run in the background.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button 
                            variant="contained" 
                            onClick={handleBackupNow} 
                            disabled={loading}
                            sx={{
                                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                                boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                                color: 'white',
                                borderRadius: '25px',
                                padding: '10px 25px',
                                '&:disabled': {
                                    background: 'rgba(255, 255, 255, 0.3)',
                                }
                            }}
                        >
                            Backup Now
                        </Button>
                        {loading && <CircularProgress size={24} sx={{ color: '#FE6B8B' }} />}
                    </Box>
                </CardContent>
            </GlassCard>

            <GlassCard sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold' }}>
                        Automated Backup Schedule
                    </Typography>
                    {scheduleLoading ? (
                        <CircularProgress sx={{ color: '#FE6B8B' }} />
                    ) : (
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={12}>
                                <FormControlLabel
                                    control={
                                        <Switch 
                                            checked={schedule.enabled} 
                                            onChange={handleScheduleChange} 
                                            name="enabled"
                                            sx={{
                                                '& .MuiSwitch-switchBase.Mui-checked': {
                                                    color: '#FE6B8B',
                                                },
                                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                    backgroundColor: '#FE6B8B',
                                                },
                                            }}
                                        />
                                    }
                                    label="Enable Daily Backups"
                                    sx={{ color: '#fff' }}
                                />
                            </Grid>
                            <Grid size={6}>
                                <TextField
                                    label="Hour (UTC)"
                                    type="number"
                                    name="hour"
                                    value={schedule.hour}
                                    onChange={handleScheduleChange}
                                    disabled={!schedule.enabled}
                                    fullWidth
                                    inputProps={{ min: 0, max: 23 }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
                                            '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
                                            color: 'white'
                                        },
                                        '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                        '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' }
                                    }}
                                />
                            </Grid>
                            <Grid size={6}>
                                <TextField
                                    label="Minute (UTC)"
                                    type="number"
                                    name="minute"
                                    value={schedule.minute}
                                    onChange={handleScheduleChange}
                                    disabled={!schedule.enabled}
                                    fullWidth
                                    inputProps={{ min: 0, max: 59 }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
                                            '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
                                            color: 'white'
                                        },
                                        '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                        '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' }
                                    }}
                                />
                            </Grid>
                            <Grid size={12}>
                                <Button 
                                    variant="contained" 
                                    onClick={handleSaveSchedule} 
                                    disabled={scheduleSaving || !schedule.enabled}
                                    sx={{
                                        background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                                        boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                                        color: 'white',
                                        borderRadius: '25px',
                                        padding: '10px 25px',
                                        '&:disabled': {
                                            background: 'rgba(255, 255, 255, 0.3)',
                                        }
                                    }}
                                >
                                    {scheduleSaving ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Save Schedule'}
                                </Button>
                            </Grid>
                        </Grid>
                    )}
                </CardContent>
            </GlassCard>

            <GlassCard>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Available Backups</Typography>
                        <IconButton onClick={fetchBackups} disabled={listLoading}>
                            <RefreshIcon />
                        </IconButton>
                    </Box>
                    {listLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : listError ? (
                        <Alert severity="error">{listError}</Alert>
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
                                                    component="a"
                                                    href={`/api/db/backups/download/${backup.filename}/`}
                                                    target="_blank"
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
            <Dialog open={openDialog} onClose={handleDialogClose}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the backup file `{selectedBackup?.filename}`? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </RootContainer>
    );
};

export default DatabaseManagementPage;
