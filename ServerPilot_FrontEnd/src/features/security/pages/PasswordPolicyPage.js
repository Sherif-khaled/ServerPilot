import React, { useState, useEffect } from 'react';
import { 
    Typography, 
    Paper, 
    Grid, 
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

const RootContainer = styled(Box)(({ theme }) => ({
    minHeight: '100vh',
    padding: theme.spacing(3),
    background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
    position: 'relative',
    overflow: 'hidden',
}));

const GlassPaper = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    padding: theme.spacing(3),
    color: '#fff',
}));

const PasswordPolicyPage = () => {
    const [policy, setPolicy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const response = await getPasswordPolicy();
                setPolicy(response.data);
            } catch (err) {
                setError('Failed to fetch password policy. Please try again later.');
                console.error(err);
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
            setSuccess('Password policy updated successfully!');
        } catch (err) {
            setError('Failed to update password policy.');
            console.error(err);
        }
        setLoading(false);
    };

    if (loading && !policy) {
        return <CircularProgress />;
    }

    if (error && !policy) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <RootContainer>
            <GlassPaper>
                <Typography variant="h4" gutterBottom sx={{ color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    Password Policy
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 2, background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2, background: 'rgba(76, 175, 80, 0.8)', color: '#fff' }}>{success}</Alert>}
                {policy && (
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Minimum Password Length"
                                    name="min_length"
                                    value={policy.min_length}
                                    onChange={handleChange}
                                    helperText="Minimum number of characters required."
                                    sx={{ input: { color: 'white' }, label: { color: 'rgba(255, 255, 255, 0.7)' }, '.MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.5)' } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Password Expiration (Days)"
                                    name="password_expiration_days"
                                    value={policy.password_expiration_days}
                                    onChange={handleChange}
                                    helperText="Days until password expires. 0 for no expiration."
                                    sx={{ input: { color: 'white' }, label: { color: 'rgba(255, 255, 255, 0.7)' }, '.MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.5)' } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Password History Limit"
                                    name="password_history_limit"
                                    value={policy.password_history_limit}
                                    onChange={handleChange}
                                    helperText="Number of old passwords to prevent reuse."
                                    sx={{ input: { color: 'white' }, label: { color: 'rgba(255, 255, 255, 0.7)' }, '.MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.5)' } }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={<Switch checked={policy.require_uppercase} onChange={handleChange} name="require_uppercase" />}
                                    label="Require Uppercase Letter"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={<Switch checked={policy.require_lowercase} onChange={handleChange} name="require_lowercase" />}
                                    label="Require Lowercase Letter"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={<Switch checked={policy.require_number} onChange={handleChange} name="require_number" />}
                                    label="Require Number"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={<Switch checked={policy.require_symbol} onChange={handleChange} name="require_symbol" />}
                                    label="Require Symbol"
                                />
                            </Grid>
                        </Grid>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="submit" variant="contained" disabled={loading} sx={{ background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)', color: 'white' }}>
                                {loading ? <CircularProgress size={24} /> : 'Save Policy'}
                            </Button>
                        </Box>
                    </form>
                )}
            </GlassPaper>
        </RootContainer>
    );
};

export default PasswordPolicyPage;
