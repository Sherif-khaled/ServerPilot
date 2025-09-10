import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,CardContent,CircularProgress,
    IconButton, Alert} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    CloudDownload as CloudDownloadIcon,
    Restore as RestoreIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import apiClient from '../../../api/apiClient';
import { CustomSnackbar, useSnackbar, CircularProgressSx, GlassCard, ConfirmDialog } from '../../../common';
import { useTranslation } from 'react-i18next';
import BackupNowCard from '../components/BackupNowCard';
import BackupScheduleCard from '../components/BackupScheduleCard';


const RootContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    
}));

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
    const { t } = useTranslation();
    const [backups, setBackups] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState('');

    const [openDialog, setOpenDialog] = useState(false);
    const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);

    // State for schedule management
    const [schedule, setSchedule] = useState({ enabled: false, hour: '2', minute: '0' });
    const [scheduleLoading, setScheduleLoading] = useState(true);
    const [scheduleSaving, setScheduleSaving] = useState(false);

    // Use the custom snackbar hook
    const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

    const fetchBackups = useCallback(async () => {
        setListLoading(true);
        setListError('');
        try {
            const response = await apiClient.get('/db/backups/');
            setBackups(response.data);
        } catch (error) { 
            setListError('Failed to load backups. Please try again.');
            showError('Failed to load backups.');
        } finally {
            setListLoading(false);
        }
    }, [showError]);

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
                showError('Failed to load backup schedule.');
            } finally {
                setScheduleLoading(false);
            }
        };

        fetchBackups();
        fetchSchedule();
    }, [fetchBackups, showError]);

    const handleBackupTriggered = () => {
        fetchBackups();
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
            showSuccess('Schedule updated successfully!');
        } catch (error) {
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
        setOpenRestoreDialog(false);
        setSelectedBackup(null);
    };

    const handleConfirmDelete = async () => {
        if (!selectedBackup) return;
        try {
            await apiClient.delete(`/db/backups/delete/${selectedBackup.filename}/`);
            showSuccess('Backup deleted successfully!');
            fetchBackups();
        } catch (error) {
            showError('Failed to delete backup.');
        }
        handleDialogClose();
    };

    const handleDownloadBackup = async (backup) => {
        try {            
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

    const handleRestoreClick = (backup) => {
        setSelectedBackup(backup);
        setOpenRestoreDialog(true);
    };

    const handleConfirmRestore = async () => {
        if (!selectedBackup) return;
        try {
            await apiClient.post(`/db/backups/restore/${selectedBackup.filename}/`);
            showSuccess(t('database.restoreSuccess'));
            fetchBackups();
        } catch (error) {
            showError(t('database.restoreFail'));
        }
        handleDialogClose();
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
                    {t('database.title')}
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
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>{t('database.availableBackups')}</Typography>
                        <IconButton onClick={fetchBackups} disabled={listLoading} sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            <RefreshIcon />
                        </IconButton>
                    </Box>
                                    {listLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                        <CircularProgress size={20} sx={CircularProgressSx} />
                    </Box>
                ) : listError ? (
                    <Alert severity="error" sx={{ background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{listError}</Alert>
                ) : (
                        <GlassTableContainer component={Paper}  sx={{ background: 'transparent' }}>
                            <Table sx={{ minWidth: 650 }} aria-label="simple table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('database.table.filename')}</TableCell>
                                        <TableCell align="right">{t('database.table.size')}</TableCell>
                                        <TableCell align="right">{t('database.table.createdAt')}</TableCell>
                                        <TableCell align="center">{t('database.table.actions')}</TableCell>
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
                                                <IconButton color="primary" onClick={() => handleRestoreClick(backup)}>
                                                    <RestoreIcon />
                                                </IconButton>
                                                <IconButton color="error" onClick={() => handleDeleteClick(backup)} >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">{t('database.table.none')}</TableCell>
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
                title={t('database.confirmDelete.title')}
                message={t('database.confirmDelete.message', { filename: selectedBackup?.filename })}
                confirmText={t('database.confirmDelete.confirm')}
                cancelText={t('database.confirmDelete.cancel')}
                severity="error"
              />
            <ConfirmDialog
                open={openRestoreDialog}
                onClose={handleDialogClose}
                onConfirm={handleConfirmRestore}
                title={t('database.confirmRestore.title')}
                message={t('database.confirmRestore.message', { filename: selectedBackup?.filename })}
                confirmText={t('database.confirmRestore.confirm')}
                cancelText={t('database.confirmRestore.cancel')}
                severity="info"
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
