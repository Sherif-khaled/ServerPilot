import React, { useState, useEffect } from 'react';
import { 
    Typography, 
    Paper, 
    TextField, 
    FormControlLabel, 
    Switch, 
    Button, 
    Box, 
    CircularProgress, 
    Alert 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { getPasswordPolicy, updatePasswordPolicy } from '../../../api/securityService';
import {gradientButtonSx, textFieldSx, CircularProgressSx, switchSx, glassPaperSx } from '../../../common';
import { useAuth } from '../../../AuthContext';
import { useTranslation } from 'react-i18next';

const RootContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2),
}));

const PasswordPolicyPage = () => {
    const [policy, setPolicy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { user } = useAuth();
    const isAdmin = user?.is_staff;
    const { t } = useTranslation();

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const response = await getPasswordPolicy();
                setPolicy(response.data);
            } catch (err) {
                console.error('Password policy fetch error:', err);
                
                if (err.response?.status === 403) {
                    setError(t('passwordPolicy.accessDenied'));
                } else if (err.response?.status === 401) {
                    setError(t('passwordPolicy.authRequired'));
                } else if (err.response?.status === 404) {
                    setError(t('passwordPolicy.notFound'));
                } else {
                    setError(t('passwordPolicy.fetchError'));
                }
            }
            setLoading(false);
        };

        fetchPolicy();
    }, []);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setPolicy(prevPolicy => ({
            ...prevPolicy,
            [name]: type === 'checkbox' ? checked : parseInt(value, 10)
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await updatePasswordPolicy(policy);
            setSuccess(t('passwordPolicy.updateSuccess'));
        } catch (err) {
            console.error('Password policy update error:', err);
            
            if (err.response?.status === 403) {
                setError(t('passwordPolicy.updateAccessDenied'));
            } else if (err.response?.status === 401) {
                setError(t('passwordPolicy.updateAuthRequired'));
            } else if (err.response?.status === 400) {
                setError(t('passwordPolicy.invalidData'));
            } else {
                setError(t('passwordPolicy.updateError'));
            }
        }
        setLoading(false);
    };

    if (loading && !policy) {
        return <CircularProgress size={20} sx={CircularProgressSx}/>;
    }

    if (error && !policy) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <RootContainer>
            <Paper sx={glassPaperSx}>
                <Typography variant="h4" gutterBottom sx={{ color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    {t('passwordPolicy.title')}
                </Typography>
                <Alert severity="info" sx={{ mb: 2, background: 'rgba(33, 150, 243, 0.8)', color: '#fff' }}>
                    {isAdmin 
                        ? t('passwordPolicy.noteAdmin')
                        : t('passwordPolicy.noteUser')
                    }
                </Alert>
                {error && <Alert severity="error" sx={{ mb: 2, background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2, background: 'rgba(76, 175, 80, 0.8)', color: '#fff' }}>{success}</Alert>}
                {policy && (
                    <form onSubmit={handleSubmit}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label={t('passwordPolicy.minLength')}
                                    name="min_length"
                                    value={policy.min_length}
                                    onChange={handleChange}
                                    helperText={t('passwordPolicy.minLengthHelper')}
                                    sx={textFieldSx}
                                    disabled={!isAdmin}
                                />
                            </Box>
                            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label={t('passwordPolicy.expirationDays')}
                                    name="password_expiration_days"
                                    value={policy.password_expiration_days}
                                    onChange={handleChange}
                                    helperText={t('passwordPolicy.expirationDaysHelper')}
                                    sx={textFieldSx}
                                    disabled={!isAdmin}
                                />
                            </Box>
                            <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label={t('passwordPolicy.historyLimit')}
                                    name="password_history_limit"
                                    value={policy.password_history_limit}
                                    onChange={handleChange}
                                    helperText={t('passwordPolicy.historyLimitHelper')}
                                    sx={textFieldSx}
                                    disabled={!isAdmin}
                                />
                            </Box>
                            <Box sx={{ width: '100%' }}>
                                <FormControlLabel
                                    control={<Switch 
                                        checked={policy.require_uppercase} 
                                        onChange={handleChange}
                                        disabled={!isAdmin}
                                        sx={switchSx}  
                                        name="require_uppercase" 
                                    />}
                                    label={t('passwordPolicy.requireUppercase')}
                                />
                            </Box>
                            <Box sx={{ width: '100%' }}>
                                <FormControlLabel
                                    control={<Switch 
                                        checked={policy.require_lowercase} 
                                        onChange={handleChange}
                                        disabled={!isAdmin}
                                        sx={switchSx}  
                                        name="require_lowercase" 
                                    />}
                                    label={t('passwordPolicy.requireLowercase')}
                                />
                            </Box>
                            <Box sx={{ width: '100%' }}>
                                <FormControlLabel
                                    control={<Switch 
                                        checked={policy.require_number} 
                                        onChange={handleChange}
                                        disabled={!isAdmin}
                                        sx={switchSx}  
                                        name="require_number" 
                                    />}
                                    label={t('passwordPolicy.requireNumber')}
                                />
                            </Box>
                            <Box sx={{ width: '100%' }}>
                                <FormControlLabel
                                    control={<Switch 
                                        checked={policy.require_symbol} 
                                        onChange={handleChange}
                                        disabled={!isAdmin}
                                        sx={switchSx}  
                                        name="require_symbol" 
                                    />}
                                    label={t('passwordPolicy.requireSymbol')}
                                />
                            </Box>
                        </Box>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="submit" 
                                    variant="contained" 
                                    disabled={loading || !isAdmin} 
                                    sx={gradientButtonSx}
                                    >
                                {loading ? <CircularProgress size={20} sx={CircularProgressSx} /> : t('passwordPolicy.savePolicy')}
                            </Button>
                        </Box>
                    </form>
                )}
            </Paper>
        </RootContainer>
    );
};

export default PasswordPolicyPage;
