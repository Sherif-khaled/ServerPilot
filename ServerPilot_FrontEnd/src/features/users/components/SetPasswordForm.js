import React, { useState } from 'react';
import {
    Box, TextField, Button, Typography, Alert, CircularProgress
} from '@mui/material';

export default function SetPasswordForm({ onSubmit, onCancel, username, error, loading }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        if (newPassword !== confirmPassword) {
            setFormError('Passwords do not match.');
            return;
        }
        if (!newPassword) {
            setFormError('Password cannot be empty.');
            return;
        }
        setFormError(''); // Clear local form error
        onSubmit(newPassword);
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ p: 1 }}> {/* Added noValidate, adjusted padding slightly */}
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
                Set Password for {username || 'User'}
            </Typography>
            <TextField
                margin="normal"
                required
                fullWidth
                name="newPassword"
                label="New Password"
                type="password"
                id="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
            />
            <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm New Password"
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {formError && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{formError}</Alert>}
            {error && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{error}</Alert>} {/* Display error from props (API error) */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}> {/* Added gap for spacing */}
                <Button onClick={onCancel} variant="outlined" disabled={loading}> {/* Added variant outlined for Cancel */}
                    Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={loading} size="large">
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Set Password'}
                </Button>
            </Box>
        </Box>
    );
}
