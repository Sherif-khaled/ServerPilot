import React, { useState, useEffect } from 'react'; 
import {
    Box, TextField, Button, Typography, Avatar, Paper, Container, CircularProgress, Snackbar, Alert as MuiAlert
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { getProfile, updateProfile } from '../../../api/userService';
// import { AuthContext } from '../context/AuthContext'; // If you have AuthContext for token

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ first_name: '', last_name: '' });
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  useEffect(() => {
    const fetchProfile = async () => {
        try {
          setLoading(true);
          // getProfile from userService relies on session cookie and CSRF header handled by axios defaults
          const res = await getProfile(); 
          setProfile(res.data);
          setFormData({
            first_name: res.data.first_name || '',
            last_name: res.data.last_name || '',
          });
          setImagePreview(res.data.profile_photo || null);
        } catch (err) {
          setSnackbar({ open: true, message: 'Failed to load profile.', severity: 'error' });
        }
        setLoading(false);
    };
    fetchProfile();
  }, []);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhotoFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const dataToSubmit = new FormData();
    dataToSubmit.append('first_name', formData.first_name);
    dataToSubmit.append('last_name', formData.last_name);
    // Only append email if you intend for it to be updatable and the backend supports it.
    // dataToSubmit.append('email', formData.email); 
    if (profilePhotoFile) {
      dataToSubmit.append('profile_photo', profilePhotoFile);
    }

    try {
      // updateProfile from userService relies on session cookie and CSRF header
      const res = await updateProfile(dataToSubmit);
      setProfile(res.data); // Update profile state with response from server
      setFormData({ first_name: res.data.first_name || '', last_name: res.data.last_name || ''});
      setImagePreview(res.data.profile_photo || null); // Update preview with new photo URL from server
      setProfilePhotoFile(null); // Reset file input state
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.email?.[0] || 'Update failed. Please try again.';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
    setSaving(false);
  };
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Container component="main" maxWidth="md" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!profile) {
    // This case might be covered by loading, but as a fallback:
    return (
        <Container component="main" maxWidth="md" sx={{ mt: 8}}>
            <Typography variant="h6" color="error">Could not load profile data.</Typography>
        </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <Typography component="h1" variant="h4" align="center" gutterBottom>
          User Profile
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'flex-start' }}>
            <Box sx={{ width: { xs: '100%', md: '33.33%' }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={imagePreview || profile.profile_photo}
                sx={{ width: 150, height: 150, border: '2px solid lightgray' }}
              />
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="profile-photo-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="profile-photo-upload">
                <Button variant="outlined" component="span" startIcon={<PhotoCamera />}>
                  Change Photo
                </Button>
              </label>
              {imagePreview && profilePhotoFile && (
                <Typography variant="caption">New photo selected</Typography>
              )}
            </Box>

            <Box sx={{ width: { xs: '100%', md: '66.66%' }, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Username"
                value={profile.username || ''}
                fullWidth
                disabled
                variant="filled"
              />
              <TextField
                label="Email"
                value={profile.email || ''}
                fullWidth
                disabled
                variant="filled"
                helperText="Email cannot be changed."
              />
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  fullWidth
                  required
                />
                <TextField
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  fullWidth
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={saving}
                  size="large"
                >
                  {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
