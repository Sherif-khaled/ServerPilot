import React, { useState } from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import AdminSecurity from '../components/AdminSecurity';
import GeneralSettings from '../components/GeneralSettings';
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
    width: '100%',
    maxWidth: '100%',
    background: 'rgba(38, 50, 56, 0.6)',
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
    },
  }));
  const GlassCard = styled(Box)(({ theme }) => ({
    background: 'rgba(38, 50, 56, 0.6)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    padding: theme.spacing(4)
  }));

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <RootContainer>
        <GlassCard sx={{ width: '100%' }}>
            <Typography variant="h4" sx={{ p: 2, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>Admin Settings</Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <Tabs 
                  value={value} 
                  onChange={handleChange} 
                  aria-label="admin settings tabs" 
                  sx={{
                '& .MuiTab-root': { color: 'text.secondary', fontWeight: 'bold' },
                //'& .Mui-selected': { color: '#FE6B8B' }, // Changed active tab color
                '& .MuiTabs-indicator': { backgroundColor: '#FE6B8B' }, // Changed indicator color
              }}>
                    <Tab icon={<SettingsIcon />} iconPosition="start" label="General Settings" id="admin-settings-tab-0" />
                    <Tab icon={<SecurityIcon />} iconPosition="start" label="Security" id="admin-settings-tab-1" />
                </Tabs>
            </Box>
            <TabPanel value={value} index={0}>
                <GeneralSettings />
            </TabPanel>
            <TabPanel value={value} index={1}>
                <AdminSecurity />
            </TabPanel>
        </GlassCard>
    </RootContainer>
  );
};

export default AdminSettingsPage;
