import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Button, Card, CardContent, CircularProgress, Snackbar, Alert, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    Switch, FormControlLabel, TextField, Grid
} from '@mui/material';
import { Refresh as RefreshIcon, Restore as RestoreIcon, Delete as DeleteIcon, CloudDownload as CloudDownloadIcon } from '@mui/icons-material';
import apiClient from '../../../api/apiClient'; // Assuming apiClient is configured for your project

const DatabaseManagementPage = () => {
    const [loading, setLoading] = useState(false);
    const [backups, setBackups] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

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
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Database Management
            </Typography>
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Manual Backup
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Click the button below to create an immediate backup of the database. The process will run in the background.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={handleBackupNow} 
                            disabled={loading}
                        >
                            Backup Now
                        </Button>
                        {loading && <CircularProgress size={24} />}
                    </Box>
                </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Automated Backup Schedule
                    </Typography>
                    {scheduleLoading ? (
                        <CircularProgress />
                    ) : (
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={<Switch checked={schedule.enabled} onChange={handleScheduleChange} name="enabled" />}
                                    label="Enable Daily Backups"
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="Hour (UTC)"
                                    type="number"
                                    name="hour"
                                    value={schedule.hour}
                                    onChange={handleScheduleChange}
                                    disabled={!schedule.enabled}
                                    fullWidth
                                    inputProps={{ min: 0, max: 23 }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="Minute (UTC)"
                                    type="number"
                                    name="minute"
                                    value={schedule.minute}
                                    onChange={handleScheduleChange}
                                    disabled={!schedule.enabled}
                                    fullWidth
                                    inputProps={{ min: 0, max: 59 }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Button 
                                    variant="contained" 
                                    onClick={handleSaveSchedule} 
                                    disabled={scheduleSaving || !schedule.enabled}
                                >
                                    {scheduleSaving ? <CircularProgress size={24} /> : 'Save Schedule'}
                                </Button>
                            </Grid>
                        </Grid>
                    )}
                </CardContent>
            </Card>

            <Card>
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
                        <TableContainer component={Paper}>
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
                                                <IconButton color="error" onClick={() => alert('Delete functionality to be implemented.')}>
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
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default DatabaseManagementPage;
