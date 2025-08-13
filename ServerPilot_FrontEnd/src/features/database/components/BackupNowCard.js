import React, { useState } from 'react';
import { Box, Typography, CardContent, Button, CircularProgress } from '@mui/material';
import { GlassCard, gradientButtonSx, useSnackbar, CircularProgressSx } from '../../../common';
import apiClient from '../../../api/apiClient';

const BackupNowCard = ({ onBackupTriggered }) => {
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useSnackbar();

    const handleBackupNow = async () => {
        console.log('Backup button clicked');
        setLoading(true);
        try {
            console.log('Making backup API call...');
            const response = await apiClient.post('/db/backup/');
            console.log('Backup response:', response);
            showSuccess('Backup task started successfully!');
            if (typeof onBackupTriggered === 'function') {
                onBackupTriggered();
            }
        } catch (error) {
            console.error('Backup error:', error);
            const errorMessage = error.response?.data?.error || 'An unexpected error occurred.';
            showError(`Backup failed: ${errorMessage}`);
        }
        setLoading(false);
    };

    return (
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
                            ...gradientButtonSx
                        }}
                    >
                        Backup Now
                    </Button>
                    {loading && <CircularProgress sx={CircularProgressSx} />}
                </Box>
            </CardContent>
        </GlassCard>
    );
};

export default BackupNowCard;


