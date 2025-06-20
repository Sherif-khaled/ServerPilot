import React, { useState, useEffect } from 'react';
import { checkUsernameExists } from '../../../api/userService';
import {
    Box, TextField, Button, Select, MenuItem, InputLabel, FormControl, FormHelperText, Snackbar, Alert,
    InputAdornment, IconButton, Radio, RadioGroup, FormControlLabel, FormLabel, Typography, Divider, CircularProgress, Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Visibility, VisibilityOff, Save as SaveIcon } from '@mui/icons-material';

// Styled root component for the background
const RootContainer = styled(Box)(({ theme }) => ({
    minHeight: '100vh',
    padding: theme.spacing(3),
    background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
    position: 'relative',
    overflow: 'hidden',
}));

// Glassmorphism Card
const GlassCard = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)', // For Safari
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    padding: theme.spacing(3),
    color: '#fff',
}));

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
    const [usernameError, setUsernameError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [apiFormError, setApiFormError] = useState('');

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    const handleMouseDownPassword = (event) => {
        event.preventDefault();
    };

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
        setApiFormError('');
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
        if(apiFormError) setApiFormError('');
    };

    const handleBlur = async (event) => {
        const { name, value } = event.target;
        if (name === 'username' && value.trim() !== '') {
            try {
                const response = await checkUsernameExists(value);
                if (response.data.exists) {
                    setUsernameError('Username is already taken.');
                } else {
                    setUsernameError('');
                }
            } catch (error) {
                console.error('Error checking username:', error);
                setUsernameError('Error checking username.');
            }
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

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!validateForm()) {
            return;
        }
        setApiFormError('');

        const dataToSubmit = { ...formData };
        delete dataToSubmit.password2; // Don't send password2 to backend

        if (isEditMode && !formData.password) {
            // If password field is empty in edit mode, don't include it in submission
            // Backend should interpret missing password as no change
            delete dataToSubmit.password;
        }

        try {
            await handleSubmitWithNotification(dataToSubmit);
        } catch (err) {
            console.error('Failed to save user:', err);
            const errorData = err.response?.data;
            if (errorData) {
                if (typeof errorData === 'string') {
                    setApiFormError(errorData);
                } else {
                    const backendErrors = {};
                    for (const key in errorData) {
                        backendErrors[key] = errorData[key].join(' ');
                    }
                    setErrors(prev => ({ ...prev, ...backendErrors }));
                    setApiFormError('Please correct the errors below.');
                }
            } else {
                setApiFormError('An unexpected error occurred. Please try again.');
            }
        }
    };

    return (
        <RootContainer>
            <GlassCard>
                <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    {isEditMode ? 'Edit User' : 'Add New User'}
                </Typography>
                
                {loading && !formData.email ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                        <CircularProgress sx={{ color: '#FE6B8B' }} />
                    </Box>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {apiFormError && (
                                <Box>
                                    <Alert severity="error" sx={{ background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{apiFormError}</Alert>
                                </Box>
                            )}

                            {/* Personal Information Section */}
                            <Box>
                                <GlassCard>
                                    <Typography variant="h6" gutterBottom>Personal Information</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                                        <TextField 
                                            fullWidth 
                                            id="first_name" 
                                            name="first_name" 
                                            label="First Name" 
                                            value={formData.first_name} 
                                            onChange={handleChange} 
                                            error={!!errors.first_name} 
                                            helperText={errors.first_name} 
                                            required 
                                            autoFocus
                                        />
                                        <TextField 
                                            fullWidth 
                                            id="last_name" 
                                            name="last_name" 
                                            label="Last Name" 
                                            value={formData.last_name} 
                                            onChange={handleChange} 
                                            error={!!errors.last_name} 
                                            helperText={errors.last_name} 
                                            required 
                                        />
                                        <TextField 
                                            fullWidth 
                                            id="email" 
                                            name="email" 
                                            label="Email" 
                                            type="email" 
                                            value={formData.email} 
                                            onChange={handleChange} 
                                            error={!!errors.email} 
                                            helperText={errors.email} 
                                            required 
                                        />
                                        
                                        <FormControl component="fieldset">
                                            <FormLabel component="legend" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Status</FormLabel>
                                            <RadioGroup row name="is_active" value={formData.is_active} onChange={handleChange}>
                                                <FormControlLabel 
                                                    value={true} 
                                                    control={<Radio sx={{ color: 'rgba(255, 255, 255, 0.7)', '&.Mui-checked': { color: '#FE6B8B' } }} />} 
                                                    label="Active" 
                                                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                                />
                                                <FormControlLabel 
                                                    value={false} 
                                                    control={<Radio sx={{ color: 'rgba(255, 255, 255, 0.7)', '&.Mui-checked': { color: '#FE6B8B' } }} />} 
                                                    label="Inactive" 
                                                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                                />
                                            </RadioGroup>
                                        </FormControl>
                                    </Box>
                                </GlassCard>
                            </Box>

                            {/* Login Information Section */}
                            <Box>
                                <GlassCard>
                                    <Typography variant="h6" gutterBottom>Login Information</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                                        <TextField 
                                            fullWidth 
                                            id="username" 
                                            name="username" 
                                            label="Username" 
                                            value={formData.username} 
                                            onChange={handleChange} 
                                            onBlur={handleBlur} 
                                            error={!!errors.username || !!usernameError} 
                                            helperText={errors.username || usernameError} 
                                            required 
                                            disabled={isEditMode}
                                        />
                                        
                                        {!isEditMode && (
                                            <>
                                                <TextField
                                                    fullWidth
                                                    label="Password"
                                                    name="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    error={!!errors.password}
                                                    helperText={errors.password}
                                                    required
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton
                                                                    aria-label="toggle password visibility"
                                                                    onClick={handleClickShowPassword}
                                                                    onMouseDown={handleMouseDownPassword}
                                                                    edge="end"
                                                                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                                                >
                                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        )
                                                    }}
                                                />
                                                <TextField
                                                    fullWidth
                                                    label="Confirm Password"
                                                    name="password2"
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={formData.password2}
                                                    onChange={handleChange}
                                                    error={!!errors.password2}
                                                    helperText={errors.password2}
                                                    required
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton
                                                                    aria-label="toggle password visibility"
                                                                    onClick={handleClickShowPassword}
                                                                    onMouseDown={handleMouseDownPassword}
                                                                    edge="end"
                                                                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                                                                >
                                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        )
                                                    }}
                                                />
                                            </>
                                        )}
                                    </Box>
                                </GlassCard>
                            </Box>
                        </Box>
                        <Box sx={{ mt: 2.5 }}>
                            <FormControl fullWidth>
                                <Select id="is_staff" name="is_staff" value={formData.is_staff} onChange={handleChange} displayEmpty>
                                    <MenuItem value="" disabled>Role</MenuItem>
                                    <MenuItem value={true}>Admin</MenuItem>
                                    <MenuItem value={false}>User</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Button onClick={onCancel} variant="outlined" color="error" disabled={loading} sx={{ width: '100%', px: 2.5 }}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                disabled={loading}
                                sx={{ width: '100%', px: 2.5 }}
                                startIcon={loading ? <CircularProgress size="1rem" color="inherit" /> : null}
                            >
                                {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create User')}
                            </Button>
                        </Box>
                    </form>
                )}
            </GlassCard>
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
        </RootContainer>
    );
}
