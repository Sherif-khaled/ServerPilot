import React, { useState } from 'react';
import { changePassword } from '../../../api/userService';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Container, Typography, Alert } from '@mui/material';

const ChangePasswordPage = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        try {
            await changePassword({ 
                current_password: currentPassword, 
                new_password: newPassword 
            });
            setSuccess('Password changed successfully! You will be redirected to the dashboard.');
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            const errorMessage = err.response?.data?.detail || 'Failed to change password. Please check your current password and try again.';
            setError(errorMessage);
        }
    };

    return (
        <Container maxWidth="xs">
            <Typography variant="h4" component="h1" gutterBottom>
                Change Password
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
                Your password has expired. Please create a new one.
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <form onSubmit={handleSubmit}>
                <TextField
                    label="Current Password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                />
                <TextField
                    label="New Password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                />
                <TextField
                    label="Confirm New Password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
                <Button type="submit" variant="contained" color="primary" fullWidth>
                    Change Password
                </Button>
            </form>
        </Container>
    );
};

export default ChangePasswordPage;
