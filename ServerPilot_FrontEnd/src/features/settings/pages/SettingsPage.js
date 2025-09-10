import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Tabs, Tab, Typography, Divider, GlobalStyles, styled } from '@mui/material';

import GeneralSettings from '../components/GeneralSettings';
import MfaSettings from '../components/MfaSettings';
import PasswordChangeForm from '../components/PasswordChangeForm';
import AppearanceSettings from '../components/AppearanceSettings';
import RecoveryCodesSettings from '../components/RecoveryCodesSettings';
import WebSessions from '../components/WebSessions';
import AISettings from '../components/AISettings';
import { GlassCard, glassCardSx } from '../../../common';
import { useTranslation } from 'react-i18next';

const RootContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '100%',
  background: 'rgba(38, 50, 56, 0.6)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

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

const SettingsPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [value, setValue] = useState(location.state?.tab || 0);

  useEffect(() => {
    if (location.state?.tab) {
      setValue(location.state.tab);
    }
  }, [location.state]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <>
      <GlobalStyles styles={(theme) => ({ body: { backgroundColor: theme.palette.background.default } })} />
      <RootContainer maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <GlassCard sx={glassCardSx}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 'bold', color: 'text.primary' }}>
            {t('common.settings')}
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
                '& .MuiTabs-indicator': { backgroundColor: '#FE6B8B' }, // Changed indicator color
              }}
            >
              <Tab label={t('common.general')} id="settings-tab-0" />
              <Tab label={t('common.passwordAndAuth')} id="settings-tab-1" />
              <Tab label={t('common.sessions')} id="settings-tab-2" />
              <Tab label={t('common.appearance')} id="settings-tab-3" />
              <Tab label={t('common.aiIntegration')} id="settings-tab-4" />
            </Tabs>
          </Box>
          <TabPanel value={value} index={0}>
            <GeneralSettings />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <PasswordChangeForm />
            <Divider sx={{ my: 3, borderColor: 'divider' }} />
            <MfaSettings />
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
          <TabPanel value={value} index={4}>
            <AISettings />
          </TabPanel>
        </GlassCard>
      </RootContainer>
    </>
  );
};

export default SettingsPage;
