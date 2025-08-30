import React, { useState, useEffect } from 'react';
import {
    Box, TextField, Button, Typography, Avatar, Paper, Container, CircularProgress, Snackbar, Alert as MuiAlert,
    Chip, InputAdornment, FormControl, InputLabel, Select, MenuItem, ListSubheader, styled
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { getProfile, updateProfile } from '../../../api/userService';
import { textFieldSx, gradientButtonSx, CircularProgressSx, glassCardSx, ConfirmDialog, SelectSx } from '../../../common';
import { useTranslation } from 'react-i18next';

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

const RootContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

export default function UserProfile() {
  const { t } = useTranslation();
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
  const [confirmOpen, setConfirmOpen] = useState(false);

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
          setSnackbar({ open: true, message: t('userProfile.loadingError'), severity: 'error' });
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
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
      setSnackbar({ open: true, message: t('userProfile.updateSuccess'), severity: 'success' });
    } catch (err) {
      const errorMessage = err.response?.data?.detail || t('userProfile.updateFailed');
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'rgba(38, 50, 56, 0.6)' }}>
        <CircularProgress size={20} sx={CircularProgressSx} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'rgba(38, 50, 56, 0.6)' }}>
        <Typography variant="h6" color="error">Could not load profile data.</Typography>
      </Box>
    );
  }

  return (
    <RootContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
      <Typography component="h1" variant="h3" align="left" gutterBottom sx={{ fontWeight: 'bold', color: '#fff' }}>
            {t('userProfile.title')}
          </Typography>
      </Box>
      <Container component="main" maxWidth="lg">

        <Paper sx={{ ...glassCardSx }}>

          <Box component="form" onSubmit={handleFormSubmit} noValidate sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 5, alignItems: 'flex-start' }}>
              <Box sx={{ width: { xs: '100%', md: '30%' }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={imagePreview || profile.profile_photo}
                  sx={{
                    width: 160,
                    height: 160,
                    border: '4px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                  }}
                />
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="profile-photo-upload"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="profile-photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCamera sx={{ paddingLeft: '5px'}} />}
                    sx={{
                      color: '#fff',
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    {t('userProfile.changePhoto')}
                  </Button>
                </label>
                {imagePreview && profilePhotoFile && (
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{t('userProfile.newPhotoSelected')}</Typography>
                )}
              </Box>

              <Box sx={{ width: { xs: '100%', md: '70%' }, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label={t('userProfile.username')}
                  value={profile.username || ''}
                  fullWidth
                  disabled
                  variant="filled"
                  sx={textFieldSx}
                />
                <TextField
                  label={t('userProfile.email')}
                  value={profile.email || ''}
                  fullWidth
                  disabled
                  variant="filled"
                  helperText={t('userProfile.emailHelper')}
                  sx={textFieldSx}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {profile.is_email_verified ? (
                          <Chip icon={<CheckCircleIcon />} label={t('userProfile.verified')} color="success" size="small" sx={{ background: 'rgba(76, 175, 80, 0.3)', color: '#98fb98' }} />
                        ) : (
                          <Chip icon={<ErrorIcon />} label={t('userProfile.notVerified')} color="warning" size="small" sx={{ background: 'rgba(255, 152, 0, 0.3)', color: '#ffcc80' }} />
                        )}
                      </InputAdornment>
                    ),
                  }}
                />
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <TextField
                    label={t('userProfile.firstName')}
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    fullWidth
                    required
                    variant="outlined"
                    sx={textFieldSx}
                  />
                  <TextField
                    label={t('userProfile.lastName')}
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    sx={textFieldSx}
                  />
                </Box>
                <TextField
                  label={t('userProfile.phoneNumber')}
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  fullWidth
                  helperText={t('userProfile.phoneHelper')}
                  variant="outlined"
                  sx={textFieldSx}
                />
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <FormControl fullWidth sx={textFieldSx} variant="outlined">
                    <InputLabel id="timezone-select-label">{t('userProfile.timezone')}</InputLabel>
                    <Select
                      labelId="timezone-select-label"
                      name="timezone"
                      value={formData.timezone}
                      label={t('userProfile.timezone')}
                      onChange={handleChange}
                      onClose={() => setTimezoneSearch('')}
                      sx={textFieldSx}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            ...SelectSx
                          },
                        },
                      }}
                    >
                      <ListSubheader sx={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff' }}>
                        <TextField
                          size="small"
                          autoFocus
                          placeholder={t('userProfile.search')}
                          fullWidth
                          value={timezoneSearch}
                          onChange={(e) => setTimezoneSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
                          sx={{...textFieldSx}                          }
                          variant="outlined"
                        />
                      </ListSubheader>
                      {displayedTimezones.map(tz => (
                        <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth sx={textFieldSx} variant="outlined">
                    <InputLabel id="dateformat-select-label">{t('userProfile.dateFormat')}</InputLabel>
                    <Select
                      labelId="dateformat-select-label"
                      name="date_format"
                      value={formData.date_format}
                      label={t('userProfile.dateFormat')}
                      onChange={handleChange}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            ...SelectSx
                          },
                        },
                      }}
                    >
                      {dateFormats.map(format => (
                        <MenuItem key={format} value={format}>{format}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    size="large"
                    sx={{...gradientButtonSx}}
                  >
                    {saving ? <CircularProgress size={20} sx={CircularProgressSx} /> : t('userProfile.saveChanges')}
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
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          title={t('userProfile.confirmTitle')}
          message={t('userProfile.confirmMessage')}
          confirmText={t('userProfile.confirmYes')}
          cancelText={t('userProfile.cancel')}
          severity="info"
        />
      </Container>
    </RootContainer>
  );
}
