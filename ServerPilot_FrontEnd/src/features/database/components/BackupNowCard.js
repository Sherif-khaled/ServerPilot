import React, { useState } from 'react';
import { Box, Typography, CardContent, Button, CircularProgress } from '@mui/material';
import { GlassCard, gradientButtonSx, useSnackbar, CircularProgressSx } from '../../../common';
import { useTranslation } from 'react-i18next';
import apiClient from '../../../api/apiClient';

const BackupNowCard = ({ onBackupTriggered }) => {
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();
    const { showSuccess, showError } = useSnackbar();

    const handleBackupNow = async () => {
        console.log('Backup button clicked');
        setLoading(true);
        try {
            console.log('Making backup API call...');
            const response = await apiClient.post('/db/backup/');
            console.log('Backup response:', response);
            showSuccess(t('backups.started'));
            if (typeof onBackupTriggered === 'function') {
                onBackupTriggered();
            }
        } catch (error) {
            console.error('Backup error:', error);
            const errorMessage = error.response?.data?.error || t('backups.unexpectedError');
            showError(`${t('backups.failedPrefix')}: ${errorMessage}`);
        }
        setLoading(false);
    };

    return (
        <GlassCard sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {t('backups.manualTitle')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                    {t('backups.manualDesc')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button 
                        variant="contained" 
                        onClick={handleBackupNow} 
                        disabled={loading}
                        sx={{
                            ...gradientButtonSx
                        }}
                    >
                        {t('backups.backupNow')}
                    </Button>
                    {loading && <CircularProgress size={20} sx={CircularProgressSx} />}
                </Box>
            </CardContent>
        </GlassCard>
    );
};

export default BackupNowCard;


