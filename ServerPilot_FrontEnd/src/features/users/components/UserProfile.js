import React, { useState, useEffect } from 'react';
import {
    Box, TextField, Button, Typography, Avatar, Paper, Container, CircularProgress, Snackbar, Alert as MuiAlert,
    Chip, InputAdornment, FormControl, InputLabel, Select, MenuItem, ListSubheader
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { getProfile, updateProfile } from '../../../api/userService';

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const allTimezones = Intl.supportedValuesOf('timeZone');

const dateFormats = [
    'YYYY-MM-DD',
    'DD-MM-YYYY',
    'MM-DD-YYYY',
    'MM/DD/YYYY',
    'DD/MM/YYYY'
];

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    timezone: 'UTC',
    date_format: 'YYYY-MM-DD'
  });
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [timezoneSearch, setTimezoneSearch] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
        try {
          setLoading(true);
          const res = await getProfile();
          setProfile(res.data);
          setFormData({
            first_name: res.data.first_name || '',
            last_name: res.data.last_name || '',
            phone_number: res.data.phone_number || '',
            timezone: res.data.timezone || 'UTC',
            date_format: res.data.date_format || 'YYYY-MM-DD',
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
    Object.keys(formData).forEach(key => {
        dataToSubmit.append(key, formData[key]);
    });
    
    if (profilePhotoFile) {
      dataToSubmit.append('profile_photo', profilePhotoFile);
    }

    try {
      const res = await updateProfile(dataToSubmit);
      setProfile(res.data);
      setFormData({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        phone_number: res.data.phone_number || '',
        timezone: res.data.timezone || 'UTC',
        date_format: res.data.date_format || 'YYYY-MM-DD',
      });
      setImagePreview(res.data.profile_photo || null);
      setProfilePhotoFile(null);
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Update failed. Please try again.';
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

  const displayedTimezones = allTimezones.filter((tz) =>
    tz.toLowerCase().includes(timezoneSearch.toLowerCase())
  );

  if (loading) {
    return (
      <Container component="main" maxWidth="md" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!profile) {
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
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {profile.is_email_verified ? (
                        <Chip icon={<CheckCircleIcon />} label="Verified" color="success" size="small" />
                      ) : (
                        <Chip icon={<ErrorIcon />} label="Not Verified" color="warning" size="small" />
                      )}
                    </InputAdornment>
                  ),
                }}
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
              <TextField
                label="Phone Number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                fullWidth
                helperText="To be used for MFA in the future."
              />
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="timezone-select-label">Timezone</InputLabel>
                  <Select
                    labelId="timezone-select-label"
                    name="timezone"
                    value={formData.timezone}
                    label="Timezone"
                    onChange={handleChange}
                    onClose={() => setTimezoneSearch('')}
                    MenuProps={{ autoFocus: false }}
                  >
                    <ListSubheader>
                      <TextField
                        size="small"
                        autoFocus
                        placeholder="Search..."
                        fullWidth
                        value={timezoneSearch}
                        onChange={(e) => setTimezoneSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key !== 'Escape') {
                            e.stopPropagation();
                          }
                        }}
                      />
                    </ListSubheader>
                    {displayedTimezones.map(tz => (
                      <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="dateformat-select-label">Date Format</InputLabel>
                  <Select
                    labelId="dateformat-select-label"
                    name="date_format"
                    value={formData.date_format}
                    label="Date Format"
                    onChange={handleChange}
                  >
                    {dateFormats.map(format => (
                      <MenuItem key={format} value={format}>{format}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
