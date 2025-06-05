import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import PasswordChangeForm from './PasswordChangeForm';
import MfaSettings from './MfaSettings';

const PasswordSettings = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Password
      </Typography>
      <PasswordChangeForm />
      <Divider sx={{ my: 4 }} />
      <Typography variant="h6" gutterBottom>
        Multi-Factor Authentication (MFA)
      </Typography>
      <MfaSettings />
    </Box>
  );
};

export default PasswordSettings;
