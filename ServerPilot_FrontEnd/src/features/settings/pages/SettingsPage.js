import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Divider, Container, Paper } from '@mui/material';

import GeneralSettings from '../components/GeneralSettings';
import PasswordSettings from '../components/PasswordSettings';
import AppearanceSettings from '../components/AppearanceSettings';
import SecurityKeysSettings from '../components/SecurityKeysSettings';
import RecoveryCodesSettings from '../components/RecoveryCodesSettings';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}> {/* Changed p:3 to pt:3 to give more space from tabs */}
          {/* Removed Typography component wrapper as children are already components */}
          {children}
        </Box>
      )}
    </div>
  );
}

const SettingsPage = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ 
        p: { xs: 2, md: 3 }, // Responsive padding
        borderRadius: 2 // Softer corners
      }} elevation={3}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
          Settings
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={value} onChange={handleChange} aria-label="settings tabs" variant="scrollable" scrollButtons="auto">
            <Tab label="General" id="settings-tab-0" />
            <Tab label="Password & Authentication" id="settings-tab-1" />
            <Tab label="Appearance" id="settings-tab-2" />
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <GeneralSettings />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <PasswordSettings />
          <Divider sx={{ my: 3 }} />
          {/* SecurityKeysSettings and RecoveryCodesSettings will be rendered here */}
          {/* For better visual hierarchy, each can be wrapped in a Box or have a sub-header */}
          <Box sx={{ mt: 2 }}>
            {/* <Typography variant="h6" component="h2" gutterBottom>Security Keys</Typography> */}
            <SecurityKeysSettings />
          </Box>
          <Divider sx={{ my: 3 }} />
          <Box sx={{ mt: 2 }}>
            {/* <Typography variant="h6" component="h2" gutterBottom>Recovery Codes</Typography> */}
            <RecoveryCodesSettings />
          </Box>
        </TabPanel>
        <TabPanel value={value} index={2}>
          <AppearanceSettings />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default SettingsPage;
