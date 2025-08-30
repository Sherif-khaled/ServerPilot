import React, { useState } from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import AdminSecurity from '../components/AdminSecurity';
import GeneralSettings from '../components/GeneralSettings';
import SecurityIcon from '@mui/icons-material/Security';
import SettingsIcon from '@mui/icons-material/Settings';
import { GlassCard, CustomSnackbar, useSnackbar } from '../../../common';
import { useTranslation } from 'react-i18next';

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

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

const RootContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '100%',
  background: 'rgba(38, 50, 56, 0.6)',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const AdminSettingsPage = () => {
  const [value, setValue] = useState(0);
  const { snackbar, showSuccess, showError, showWarning, showInfo, hideSnackbar } = useSnackbar();
  const { t, i18n } = useTranslation();
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <RootContainer>
        <GlassCard sx={{p: 4}}>
            <Typography variant="h4" sx={{ p: 2, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>Admin Settings</Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <Tabs 
                  value={value} 
                  onChange={handleChange} 
                  aria-label="admin settings tabs" 
                  sx={{
                '& .MuiTab-root': { color: 'text.secondary', fontWeight: 'bold' },
                '& .MuiTabs-indicator': { backgroundColor: '#FE6B8B' },
              }}>
                    <Tab icon={<SettingsIcon />} iconPosition="start" label={t('common.general')} id="admin-settings-tab-0" />
                    <Tab icon={<SecurityIcon />} iconPosition="start" label={t('common.security')} id="admin-settings-tab-1" />
                </Tabs>
            </Box>
            <TabPanel value={value} index={0}>
                <GeneralSettings 
                  showSuccess={showSuccess}
                  showError={showError}
                  showWarning={showWarning}
                  showInfo={showInfo}
                />
            </TabPanel>
            <TabPanel value={value} index={1}>
                <AdminSecurity 
                  showSuccess={showSuccess}
                  showError={showError}
                  showWarning={showWarning}
                  showInfo={showInfo}
                />
            </TabPanel>
        </GlassCard>
        
        <CustomSnackbar
          open={snackbar.open}
          onClose={hideSnackbar}
          severity={snackbar.severity}
          message={snackbar.message}
        />
    </RootContainer>
  );
};

export default AdminSettingsPage;
