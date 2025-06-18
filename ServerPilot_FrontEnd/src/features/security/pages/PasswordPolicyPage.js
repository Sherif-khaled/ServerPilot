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
import { getPasswordPolicy, updatePasswordPolicy } from '../../../api/securityService';

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
        <Paper sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Password Policy
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            {policy && (
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6
                            }}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Minimum Password Length"
                                name="min_length"
                                value={policy.min_length}
                                onChange={handleChange}
                                helperText="Minimum number of characters required."
                            />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6
                            }}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Password Expiration (Days)"
                                name="password_expiration_days"
                                value={policy.password_expiration_days}
                                onChange={handleChange}
                                helperText="Days until password expires. 0 for no expiration."
                            />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6
                            }}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Password History Limit"
                                name="password_history_limit"
                                value={policy.password_history_limit}
                                onChange={handleChange}
                                helperText="Number of old passwords to prevent reuse."
                            />
                        </Grid>
                        <Grid size={12}>
                            <FormControlLabel
                                control={<Switch checked={policy.require_uppercase} onChange={handleChange} name="require_uppercase" />}
                                label="Require Uppercase Letter"
                            />
                        </Grid>
                        <Grid size={12}>
                            <FormControlLabel
                                control={<Switch checked={policy.require_lowercase} onChange={handleChange} name="require_lowercase" />}
                                label="Require Lowercase Letter"
                            />
                        </Grid>
                        <Grid size={12}>
                            <FormControlLabel
                                control={<Switch checked={policy.require_number} onChange={handleChange} name="require_number" />}
                                label="Require Number"
                            />
                        </Grid>
                        <Grid size={12}>
                            <FormControlLabel
                                control={<Switch checked={policy.require_symbol} onChange={handleChange} name="require_symbol" />}
                                label="Require Symbol"
                            />
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" variant="contained" disabled={loading}>
                            {loading ? <CircularProgress size={24} /> : 'Save Policy'}
                        </Button>
                    </Box>
                </form>
            )}
        </Paper>
    );
};

export default PasswordPolicyPage;
