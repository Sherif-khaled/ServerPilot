import React, { useState } from 'react';
import { Tabs, Tab, Box, Paper, Typography } from '@mui/material';
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

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Paper sx={{ width: '100%' }}>
        <Typography variant="h4" sx={{ p: 2 }}>Admin Settings</Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={value} onChange={handleChange} aria-label="admin settings tabs">
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
    </Paper>
  );
};

export default AdminSettingsPage;
