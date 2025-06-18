import React, { useState, useEffect } from 'react';
import { checkUsernameExists } from '../../../api/userService';
import {
    Box, TextField, Button, Select, MenuItem, InputLabel, FormControl, FormHelperText, Snackbar, Alert,
    InputAdornment, IconButton, Radio, RadioGroup, FormControlLabel, FormLabel, Typography, Divider, CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

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
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Personal Info</Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Box>
                            <FormControl fullWidth error={!!errors.first_name}>
                                <TextField id="first_name" name="first_name" value={formData.first_name} onChange={handleChange} fullWidth required autoFocus placeholder="Enter first name" />
                                {errors.first_name && <FormHelperText>{errors.first_name}</FormHelperText>}
                            </FormControl>
                        </Box>
                        <Box>
                            <FormControl fullWidth error={!!errors.last_name}>
                                <TextField id="last_name" name="last_name" value={formData.last_name} onChange={handleChange} fullWidth required placeholder="Enter last name" />
                                {errors.last_name && <FormHelperText>{errors.last_name}</FormHelperText>}
                            </FormControl>
                        </Box>
                        <Box>
                            <FormControl fullWidth error={!!errors.email}>
                                <TextField id="email" name="email" type="email" value={formData.email} onChange={handleChange} fullWidth required placeholder="Enter email address" />
                                {errors.email && <FormHelperText>{errors.email}</FormHelperText>}
                            </FormControl>
                        </Box>
                        <Box>
                            <FormControl component="fieldset">
                                <FormLabel component="legend">Status</FormLabel>
                                <RadioGroup row name="is_active" value={formData.is_active} onChange={handleChange} >
                                    <FormControlLabel value={true} control={<Radio />} label="Active" />
                                    <FormControlLabel value={false} control={<Radio />} label="Inactive" />
                                </RadioGroup>
                            </FormControl>
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Login Info</Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Box>
                            <FormControl fullWidth error={!!errors.username}>
                                <TextField id="username" name="username" value={formData.username} onChange={handleChange} onBlur={handleBlur} fullWidth required disabled={isEditMode} placeholder="Enter username" />
                                {errors.username && <FormHelperText>{errors.username}</FormHelperText>}
                                {usernameError && <FormHelperText error>{usernameError}</FormHelperText>}
                            </FormControl>
                        </Box>
                        {!isEditMode && (
                            <>
                                <Box>
                                    <FormControl fullWidth error={!!errors.password}>
                                        <TextField fullWidth placeholder="Password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} error={!!errors.password} helperText={errors.password} margin="normal" InputProps={{ endAdornment: ( <InputAdornment position="end"> <IconButton aria-label="toggle password visibility" onClick={handleClickShowPassword} onMouseDown={handleMouseDownPassword} edge="end" > {showPassword ? <VisibilityOff /> : <Visibility />} </IconButton> </InputAdornment> ) }} />
                                    </FormControl>
                                </Box>
                                <Box>
                                    <FormControl fullWidth error={!!errors.password2}>
                                        <TextField fullWidth placeholder="Confirm Password" name="password2" type={showPassword ? 'text' : 'password'} value={formData.password2} onChange={handleChange} error={!!errors.password2} helperText={errors.password2} margin="normal" InputProps={{ endAdornment: ( <InputAdornment position="end"> <IconButton aria-label="toggle password visibility" onClick={handleClickShowPassword} onMouseDown={handleMouseDownPassword} edge="end" > {showPassword ? <VisibilityOff /> : <Visibility />} </IconButton> </InputAdornment> ) }} />
                                        {errors.password2 && <FormHelperText>{errors.password2}</FormHelperText>}
                                    </FormControl>
                                </Box>
                            </>
                        )}
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
