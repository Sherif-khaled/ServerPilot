import React, { useState, useEffect } from 'react';
import { 
    Box, Button, Typography, List, ListItem, ListItemText, 
    IconButton, TextField, Dialog, DialogActions, DialogContent, 
    DialogContentText, DialogTitle, CircularProgress, Alert 
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import * as webAuthnService from '../../../services/webAuthnService';
import { startRegistration } from '@simplewebauthn/browser';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';

const SecurityKeysSettings = () => {
    const [keys, setKeys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [open, setOpen] = useState(false);
    const [keyName, setKeyName] = useState('');

    const fetchKeys = async () => {
        try {
            setIsLoading(true);
            const response = await webAuthnService.getKeys();
            setKeys(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch security keys.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleRegisterClick = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setKeyName('');
    };

    const handleRegister = async () => {
        if (!keyName) {
            setError('Please provide a name for the key.');
            return;
        }
        handleClose();
        setError('');
        setSuccess('');

        try {
            const optionsResponse = await webAuthnService.beginRegistration();
            const registrationData = await startRegistration(optionsResponse.data);
            await webAuthnService.completeRegistration(registrationData, keyName);
            setSuccess('Security key registered successfully!');
            fetchKeys(); // Refresh the list of keys
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Registration failed. Please try again.';
            setError(errorMessage);
        }
    };

    const handleDelete = async (keyId) => {
        setError('');
        setSuccess('');
        try {
            await webAuthnService.deleteKey(keyId);
            setSuccess('Security key deleted successfully!');
            fetchKeys(); // Refresh the list of keys
        } catch (err) {
            setError('Failed to delete the key.');
        }
    };
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

    return (
        <GlassPaper>
            <Typography variant="h6" gutterBottom>Security Keys</Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
                Manage your security keys (e.g., YubiKey, Windows Hello, etc.) for a more secure login experience.
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {isLoading ? (
                <CircularProgress />
            ) : (
                <List>
                    {keys.map((key) => (
                        <ListItem key={key.id} secondaryAction={
                            <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(key.id)}>
                                <DeleteIcon />
                            </IconButton>
                        }>
                            <ListItemText 
                                primary={key.name} 
                                secondary={`Added on: ${new Date(key.created_at).toLocaleDateString()}`}
                            />
                        </ListItem>
                    ))}
                </List>
            )}

            <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={handleRegisterClick}
                sx={{
                    background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                    boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                    color: 'white',
                    borderRadius: '25px',
                    padding: '10px 25px',
                    '&:disabled': {
                    background: 'rgba(255, 255, 255, 0.3)',
                    },
                    mt: 3,
                }}
            >
                Add Security Key
            </Button>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Add a New Security Key</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please enter a name for your new key to help you identify it later.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Key Name"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleRegister}>Register</Button>
                </DialogActions>
            </Dialog>
        </GlassPaper>
    );
};

export default SecurityKeysSettings;
