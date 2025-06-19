import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, Divider, Container, Paper, GlobalStyles, styled } from '@mui/material';

import GeneralSettings from '../components/GeneralSettings';
import PasswordSettings from '../components/PasswordSettings';
import AppearanceSettings from '../components/AppearanceSettings';
import SecurityKeysSettings from '../components/SecurityKeysSettings';
import RecoveryCodesSettings from '../components/RecoveryCodesSettings';
import WebSessions from '../components/WebSessions';

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
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const GlassPaper = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(10px)',
    borderRadius: '10px',
    padding: theme.spacing(3),
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
}));

const SettingsPage = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <>
      <GlobalStyles styles={(theme) => ({ body: { backgroundColor: theme.palette.background.default } })} />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <GlassPaper>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 'bold', color: 'text.primary' }}>
            Settings
          </Typography>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={value} 
              onChange={handleChange} 
              aria-label="settings tabs" 
              variant="scrollable" 
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': { color: 'text.secondary', fontWeight: 'bold' },
                '& .Mui-selected': { color: 'text.primary' },
                '& .MuiTabs-indicator': { backgroundColor: 'primary.main' },
              }}
            >
              <Tab label="General" id="settings-tab-0" />
              <Tab label="Password & Authentication" id="settings-tab-1" />
              <Tab label="Sessions" id="settings-tab-2" />
              <Tab label="Appearance" id="settings-tab-3" />
            </Tabs>
          </Box>
          <TabPanel value={value} index={0}>
            <GeneralSettings />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <PasswordSettings />
            <Divider sx={{ my: 3, borderColor: 'divider' }} />
            <Box sx={{ mt: 2 }}>
              <SecurityKeysSettings />
            </Box>
            <Divider sx={{ my: 3, borderColor: 'divider' }} />
            <Box sx={{ mt: 2 }}>
              <RecoveryCodesSettings />
            </Box>
          </TabPanel>
          <TabPanel value={value} index={2}>
            <WebSessions />
          </TabPanel>
          <TabPanel value={value} index={3}>
            <AppearanceSettings />
          </TabPanel>
        </GlassPaper>
      </Container>
    </>
  );
};

export default SettingsPage;
