import React, { useState } from 'react';
import { Tabs, Tab, Box, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import AdminSecurityPage from '../../security/pages/AdminSecurityPage';
import AdminGeneralSettingsPage from './AdminGeneralSettingsPage';
import SecurityIcon from '@mui/icons-material/Security';
import SettingsIcon from '@mui/icons-material/Settings';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-settings-tabpanel-${index}`}
      aria-labelledby={`admin-settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminSettingsPage = () => {
  const [value, setValue] = useState(0);

  const RootContainer = styled(Box)(({ theme }) => ({
      minHeight: '100vh',
      padding: theme.spacing(3),
      background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
      position: 'relative',
      overflow: 'hidden',
  }));

  const GlassPaper = styled(Paper)(({ theme }) => ({
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.125)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      padding: theme.spacing(3),
      color: '#fff',
  }));

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <RootContainer>
        <GlassPaper sx={{ width: '100%' }}>
            <Typography variant="h4" sx={{ p: 2, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>Admin Settings</Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <Tabs value={value} onChange={handleChange} aria-label="admin settings tabs" sx={{ '& .MuiTab-root': { color: 'rgba(255, 255, 255, 0.7)' }, '& .Mui-selected': { color: '#fff' }, '& .MuiTabs-indicator': { backgroundColor: '#fff' } }}>
                    <Tab icon={<SettingsIcon />} iconPosition="start" label="General Settings" id="admin-settings-tab-0" />
                    <Tab icon={<SecurityIcon />} iconPosition="start" label="Security" id="admin-settings-tab-1" />
                </Tabs>
            </Box>
            <TabPanel value={value} index={0}>
                <AdminGeneralSettingsPage />
            </TabPanel>
            <TabPanel value={value} index={1}>
                <AdminSecurityPage />
            </TabPanel>
        </GlassPaper>
    </RootContainer>
  );
};

export default AdminSettingsPage;
