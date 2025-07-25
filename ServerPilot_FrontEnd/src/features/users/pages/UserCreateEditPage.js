import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserForm from '../components/UserForm';
import { Container, Typography, Paper, CircularProgress, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

import { adminGetUser, adminUpdateUser, adminCreateUser } from '../../../api/userService'; 

export default function UserCreateEditPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(userId);
    const [initialUser, setInitialUser] = useState(null);
    const [formLoading, setFormLoading] = useState(false); // For form submission
    const [pageLoading, setPageLoading] = useState(isEditMode); // For fetching initial data in edit mode
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

    

    const handleCloseNotification = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setNotification({ ...notification, open: false });
    };

    useEffect(() => {
        if (isEditMode) {
            setPageLoading(true);
            console.log(`Fetching data for user ID: ${userId}`);
            adminGetUser(userId)
                .then(response => {
                    setInitialUser(response.data);
                })
                .catch(error => {
                    console.error("Failed to fetch user:", error);
                    // Set initialUser to null to trigger the 'not found' message
                    setInitialUser(null);
                })
                .finally(() => {
                    setPageLoading(false);
                });
        }
    }, [userId, isEditMode, navigate]);

    const handleSubmit = async (formData) => {
        setFormLoading(true);
        try {
            // Destructure to remove password2, which is only for frontend validation
            const { password2, ...dataToSend } = formData;

            if (isEditMode) {
                // If password is not being changed (it's empty), don't send it in the payload
                if (!dataToSend.password) {
                    delete dataToSend.password;
                }
                await adminUpdateUser(userId, dataToSend);
                setNotification({ open: true, message: 'User updated successfully!', severity: 'success' });
            } else {
                await adminCreateUser(dataToSend);
                setNotification({ open: true, message: 'User created successfully!', severity: 'success' });
            }
            
            // Navigate after a short delay to allow the user to see the message
            setTimeout(() => {
                navigate('/users');
            }, 2000);

        } catch (error) {
            console.error("Failed to save user:", error);
            // Extract a more specific error message from the server response
            const errorData = error.response?.data;
            let errorMessage = 'An unexpected error occurred. Please try again.';
            if (typeof errorData === 'object' && errorData !== null) {
                const firstErrorKey = Object.keys(errorData)[0];
                const firstErrorMessage = errorData[firstErrorKey];
                if (firstErrorKey && firstErrorMessage) {
                    errorMessage = `${firstErrorKey}: ${Array.isArray(firstErrorMessage) ? firstErrorMessage.join(' ') : firstErrorMessage}`;
                }
            }
            setNotification({ open: true, message: errorMessage, severity: 'error' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleCancel = () => {
        navigate(-1); // Go back to the previous page, or specify a path like '/users'
    };

    // Show modal dialog in both create and edit mode
    if (!pageLoading && (!isEditMode || (isEditMode && initialUser))) {
        return (
            <>
                <Snackbar 
                    open={notification.open} 
                    autoHideDuration={6000} 
                    onClose={handleCloseNotification}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert 
                        onClose={handleCloseNotification} 
                        severity={notification.severity} 
                        sx={{ width: '100%' }}
                    >
                        {notification.message}
                    </Alert>
                </Snackbar>
                <Dialog
                    open={true}
                    onClose={handleCancel}
                    maxWidth="lg"
                    fullWidth
                    PaperProps={{
                        sx: {
                            background: 'rgba(255, 255, 255, 0.08)',
                            backdropFilter: 'blur(12px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.125)',
                            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                            color: '#fff',
                            minWidth: { md: 900, lg: 900 },
                            overflowY: 'hidden',
                            '&::-webkit-scrollbar': { display: 'none' },
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        }
                    }}
                >
                    <DialogTitle>
                        {isEditMode ? 'Edit User' : 'Add New User'}
                    </DialogTitle>
                    <DialogContent>
                        <UserForm
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            initialUser={initialUser}
                            isEditMode={isEditMode}
                            loading={formLoading}
                        />
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // If in edit mode and initialUser is still null after page loading (e.g., user not found or API error)
    if (isEditMode && !initialUser && !pageLoading) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" color="error" gutterBottom>
                        User not found or failed to load data.
                    </Typography>
                    <Button variant="outlined" onClick={() => navigate('/users')}>
                        Go Back
                    </Button>
                </Paper>
            </Container>
        );
    }

    if (pageLoading) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
  <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
  <Snackbar 
    open={notification.open} 
    autoHideDuration={6000} 
    onClose={handleCloseNotification}
    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
  >
    <Alert 
      onClose={handleCloseNotification} 
      severity={notification.severity} 
      sx={{ width: '100%' }}
    >
      {notification.message}
    </Alert>
  </Snackbar>

  <Paper
    elevation={3}
    sx={{
      p: { xs: 2, sm: 3 },
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)', // Safari
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.125)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      color: '#fff',
    }}
  >

    <UserForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      initialUser={initialUser}
      isEditMode={isEditMode}
      loading={formLoading}
    />
  </Paper>
</Container>
    );
}
