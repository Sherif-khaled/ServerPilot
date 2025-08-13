import React, { useState, useEffect } from 'react';
import { explainRisk } from '../../../../api/aiService';

import {glassDialogSx, CancelButton, CircularProgressSx} from '../../../../common';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    CircularProgress,
    Alert,
    Box
} from '@mui/material';

const ExplainRiskDialog = ({ open, onClose, recommendation }) => {
    const [explanation, setExplanation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && recommendation) {
            const fetchExplanation = async () => {
                setLoading(true);
                setError('');
                setExplanation('');
                try {
                    const response = await explainRisk(recommendation.description);
                    setExplanation(response.data.explanation);
                } catch (err) {
                    const errorMessage = err.response?.data?.error || 'Failed to fetch explanation.';
                    setError(errorMessage);
                } finally {
                    setLoading(false);
                }
            };
            fetchExplanation();
        }
    }, [open, recommendation]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperComponent={glassDialogSx}>
            <DialogTitle>Why is this risky?</DialogTitle>
            <DialogContent dividers>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <CircularProgress sx={CircularProgressSx} />
                    </Box>
                )}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {explanation && explanation.split('\n').map((line, index) => (
                    <Typography key={index} variant="body1" gutterBottom>
                        {line}
                    </Typography>
                ))}
            </DialogContent>
            <DialogActions>
                <Box>
                <CancelButton onClick={onClose}>Close</CancelButton>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default ExplainRiskDialog;
