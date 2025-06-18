import React, { useState, useEffect } from 'react';
import {
    Box, TextField, Button, Select, MenuItem, InputLabel, FormControl, FormHelperText, Snackbar, Alert
} from '@mui/material';

// Default initial state for the form
const getDefaultFormData = () => ({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '', // For password confirmation
    is_active: true, // Default to active
    is_staff: false, // Default to non-admin (user)
});

export default function UserForm({ onSubmit, onCancel, initialUser, isEditMode = false, loading }) {
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    const handleSubmitWithNotification = async (data) => {
        try {
            await onSubmit(data);
            setNotification({
                open: true,
                message: isEditMode ? 'User updated successfully!' : 'User created successfully!',
                severity: 'success'
            });
            // Reset form after successful submission if not in edit mode
            if (!isEditMode) {
                setFormData(getDefaultFormData());
            }
        } catch (error) {
            setNotification({
                open: true,
                message: error.message || 'An error occurred. Please try again.',
                severity: 'error'
            });
        }
    };
    const [formData, setFormData] = useState(getDefaultFormData());
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isEditMode && initialUser) {
            setFormData({
                username: initialUser.username || '',
                email: initialUser.email || '',
                first_name: initialUser.first_name || '',
                last_name: initialUser.last_name || '',
                password: '', // Password fields are for setting new passwords, not displaying old ones
                password2: '',
                is_active: initialUser.is_active !== undefined ? initialUser.is_active : true,
                is_staff: initialUser.is_staff !== undefined ? initialUser.is_staff : false,
            });
        } else {
            // Reset to default for create mode or if initialUser is not provided
            setFormData(getDefaultFormData());
        }
        setErrors({}); // Clear errors when mode or user changes
    }, [initialUser, isEditMode]);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData(prev => ({
            ...prev,
            // For Select, value is directly the boolean if we cast it, otherwise it's string 'true'/'false'
            [name]: type === 'checkbox' ? checked : (name === 'is_active' || name === 'is_staff' ? (value === 'true') : value),
        }));
        // Clear specific field error on change
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
        if (name === 'password' && errors.password2) {
             setErrors(prev => ({ ...prev, password2: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required.';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required.';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required.';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid.';
        }
        if (!formData.username.trim()) newErrors.username = 'Username is required.';
        
        if (!isEditMode) { // Password validation only for create mode
            if (!formData.password) newErrors.password = 'Password is required.';
            if (!formData.password2) newErrors.password2 = 'Confirm password is required.';
            if (formData.password && formData.password2 && formData.password !== formData.password2) {
                newErrors.password2 = 'Passwords do not match.';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!validateForm()) return;

        const dataToSubmit = { ...formData };
        delete dataToSubmit.password2; // Don't send password2 to backend

        if (isEditMode && !formData.password) {
            // If password field is empty in edit mode, don't include it in submission
            // Backend should interpret missing password as no change
            delete dataToSubmit.password;
        }
        onSubmit(dataToSubmit);
    };

    return (
        <>
            <Box component="form" onSubmit={async (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent event bubbling
                
                if (validateForm()) {
                    const dataToSubmit = { ...formData };
                    delete dataToSubmit.password2;
                    if (isEditMode && !formData.password) {
                        delete dataToSubmit.password;
                    }
                    await handleSubmitWithNotification(dataToSubmit);
                }
                return false; // Prevent default form submission
            }} noValidate sx={{ mt: 0 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                    <FormControl fullWidth error={!!errors.first_name}>
                        <InputLabel htmlFor="first_name" shrink>First Name</InputLabel>
                        <TextField
                            id="first_name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            fullWidth
                            required
                            autoFocus
                            placeholder="Enter first name"
                            sx={{ mt: 3 }}
                        />
                        {errors.first_name && <FormHelperText>{errors.first_name}</FormHelperText>}
                    </FormControl>
                </Box>
                <Box>
                    <FormControl fullWidth error={!!errors.last_name}>
                        <InputLabel htmlFor="last_name" shrink>Last Name</InputLabel>
                        <TextField
                            id="last_name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            fullWidth
                            required
                            placeholder="Enter last name"
                            sx={{ mt: 3 }}
                        />
                        {errors.last_name && <FormHelperText>{errors.last_name}</FormHelperText>}
                    </FormControl>
                </Box>
                <Box>
                    <FormControl fullWidth error={!!errors.email}>
                        <InputLabel htmlFor="email" shrink>Email Address</InputLabel>
                        <TextField
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            fullWidth
                            required
                            placeholder="Enter email address"
                            sx={{ mt: 3 }}
                        />
                        {errors.email && <FormHelperText>{errors.email}</FormHelperText>}
                    </FormControl>
                </Box>
                <Box>
                    <FormControl fullWidth error={!!errors.username}>
                        <InputLabel htmlFor="username" shrink>Username</InputLabel>
                        <TextField
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            fullWidth
                            required
                            disabled={isEditMode} // Username usually not editable
                            placeholder="Enter username"
                            sx={{ mt: 3 }}
                        />
                        {errors.username && <FormHelperText>{errors.username}</FormHelperText>}
                    </FormControl>
                </Box>
                {!isEditMode && (
                    <>
                        <Box>
                            <FormControl fullWidth error={!!errors.password}>
                                <InputLabel htmlFor="password" shrink>Password</InputLabel>
                                <TextField
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    placeholder="Enter password"
                                    sx={{ mt: 3 }}
                                />
                                {errors.password && <FormHelperText>{errors.password}</FormHelperText>}
                            </FormControl>
                        </Box>
                        <Box>
                            <FormControl fullWidth error={!!errors.password2}>
                                <InputLabel htmlFor="password2" shrink>Confirm Password</InputLabel>
                                <TextField
                                    id="password2"
                                    name="password2"
                                    type="password"
                                    value={formData.password2}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    placeholder="Confirm password"
                                    sx={{ mt: 3 }}
                                />
                                {errors.password2 && <FormHelperText>{errors.password2}</FormHelperText>}
                            </FormControl>
                        </Box>
                    </>
                )}
                <Box>
                    <FormControl fullWidth>
                        <InputLabel id="is_active-label">Status</InputLabel>
                        <Select
                            labelId="is_active-label"
                            id="is_active"
                            name="is_active"
                            value={formData.is_active}
                            onChange={handleChange}
                            label="Status"
                        >
                            <MenuItem value={true}>Active</MenuItem>
                            <MenuItem value={false}>Inactive</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                <Box>
                    <FormControl fullWidth>
                        <InputLabel id="is_staff-label">Role</InputLabel>
                        <Select
                            labelId="is_staff-label"
                            id="is_staff"
                            name="is_staff"
                            value={formData.is_staff}
                            onChange={handleChange}
                            label="Role"
                        >
                            <MenuItem value={true}>Admin</MenuItem>
                            <MenuItem value={false}>User</MenuItem>
                        </Select>
                    </FormControl>
                </Box>


                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Button onClick={onCancel} variant="outlined" disabled={loading} sx={{ width: '100%', px: 2.5 }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ width: '100%', px: 2.5 }}>
                        {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create User')}
                    </Button>
                </Box>
                </Box>
            </Box>
            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </>
    );
}
