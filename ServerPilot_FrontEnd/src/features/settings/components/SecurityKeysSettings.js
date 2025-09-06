import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
// import { Button, Typography, List, ListItem, ListItemText, IconButton, TextField, Dialog, DialogActions, DialogContent, 
//         DialogContentText, DialogTitle, CircularProgress, Alert } from '@mui/material';
// import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import * as webAuthnService from '../../../services/webAuthnService';
// import { startRegistration } from '@simplewebauthn/browser';
import { GlassPaper } from '../../../common';
// import { CustomSnackbar, useSnackbar, textFieldSx, GlassPaper, gradientButtonSx, CircularProgressSx } from '../../../common';
import { useTranslation } from 'react-i18next';

const SecurityKeysSettings = () => {
    const { t } = useTranslation();
    const [keys, setKeys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(false);
    const [keyName, setKeyName] = useState('');

    // const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

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

    // const handleRegisterClick = () => {
    //     setOpen(true);
    // };

    // const handleClose = () => {
    //     setOpen(false);
    //     setKeyName('');
    // };

    // const handleRegister = async () => {
    //     if (!keyName) {
    //         setError('Please provide a name for the key.');
    //         return;
    //     }
    //     handleClose();

    //     try {
    //         const optionsResponse = await webAuthnService.beginRegistration();
    //         const registrationData = await startRegistration(optionsResponse.data);
    //         await webAuthnService.completeRegistration(registrationData, keyName);
    //         showSuccess('Security key registered successfully!');
    //         fetchKeys(); // Refresh the list of keys
    //     } catch (err) {
    //         const errorMessage = err.response?.data?.error || 'Registration failed. Please try again.';
    //         showError(errorMessage);
    //     }
    // };

    // const handleDelete = async (keyId) => {
    //     try {
    //         await webAuthnService.deleteKey(keyId);
    //         showSuccess('Security key deleted successfully!');
    //         fetchKeys();
    //     } catch (err) {
    //         showError('Failed to delete the key.');
    //     }
    // };

    return (
        <GlassPaper>
            <Typography variant="h6" gutterBottom>{t('securityKeys.title')}</Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
                {/* Manage your security keys (e.g., YubiKey, Windows Hello, etc.) for a more secure login experience. */}
                {t('securityKeys.comingSoon')}
            </Typography>
            
            {/* {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {isLoading ? (
                <CircularProgress size={20} sx={CircularProgressSx}/>
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
                    ...gradientButtonSx}}
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
                        sx={{...textFieldSx}}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleRegister}>Register</Button>
                </DialogActions>
            </Dialog>

            <CustomSnackbar
                open={snackbar.open}
                onClose={hideSnackbar}
                severity={snackbar.severity}
                message={snackbar.message}
            /> */}
        </GlassPaper>
    );
};

export default SecurityKeysSettings;
