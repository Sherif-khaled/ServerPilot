import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserForm from '../components/UserForm';
import { Container, Typography, Paper, CircularProgress, Button } from '@mui/material';

import { adminGetUser, adminUpdateUser, adminCreateUser } from '../../../api/userService'; 

export default function UserCreateEditPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(userId);
    const [initialUser, setInitialUser] = useState(null);
    const [formLoading, setFormLoading] = useState(false); // For form submission
    const [pageLoading, setPageLoading] = useState(isEditMode); // For fetching initial data in edit mode

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
            if (isEditMode) {
                await adminUpdateUser(userId, formData);
                alert('User updated successfully!');
            } else {
                await adminCreateUser(formData);
                alert('User created successfully!');
            }
            navigate('/admin/users'); // Navigate to the user list page after success
        } catch (error) {
            console.error("Failed to save user:", error);
            // TODO: Show an error message to the user (e.g., using a snackbar or alert)
            // alert('Failed to save user. Please try again.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleCancel = () => {
        navigate(-1); // Go back to the previous page, or specify a path like '/users'
    };

    if (pageLoading) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <CircularProgress />
            </Container>
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
                    <Button variant="outlined" onClick={() => navigate('/users') /* Or navigate(-1) */}>
                        Go Back
                    </Button>
                </Paper>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}> {/* Responsive padding */}
                <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 3 }}>
                    {isEditMode ? 'Edit User' : 'Create New User'}
                </Typography>
                <UserForm
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    initialUser={initialUser} // Pass null if creating or if fetch failed for edit
                    isEditMode={isEditMode}
                    loading={formLoading}
                />
            </Paper>
        </Container>
    );
}
