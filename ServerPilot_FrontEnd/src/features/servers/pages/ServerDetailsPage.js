import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Tabs, Tab, CircularProgress, Alert, Paper, GlobalStyles, styled } from '@mui/material';
import { getServerDetails } from '../../../api/serverService';
import SecurityAdvisorTab from '../components/details/SecurityAdvisorTab';
import DetailsTab from '../components/details/DetailsTab';
import ApplicationsTab from '../components/details/ApplicationsTab';
import MonitoringTab from '../components/details/MonitoringTab';

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

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`server-details-tabpanel-${index}`}
      aria-labelledby={`server-details-tab-${index}`}
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

export default function ServerDetailsPage() {
  const { customerId, serverId } = useParams();
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchServerDetails = async () => {
      try {
        setLoading(true);
        const response = await getServerDetails(customerId, serverId);
        setServer(response.data);
        setError('');
      } catch (err) {
        setError('Failed to fetch server details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchServerDetails();
  }, [customerId, serverId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  if (!server) {
    return <Typography sx={{ m: 2 }}>Server not found.</Typography>;
  }

  return (
    <>
      <GlobalStyles styles={(theme) => ({ body: { backgroundColor: theme.palette.background.default } })} />
      <RootContainer maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <GlassCard>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 'bold', color: 'text.primary' }}>
            {server.server_name}
          </Typography>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="Server details tabs" 
              variant="scrollable" 
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': { color: 'text.secondary', fontWeight: 'bold' },
                '& .MuiTabs-indicator': { backgroundColor: '#FE6B8B' },
              }}
            >
              <Tab label="Details" />
              <Tab label="Applications" />
              <Tab label="Monitoring" />
              <Tab label="Security Advisor" />
            </Tabs>
          </Box>
          <TabPanel value={tabValue} index={0}>
            <DetailsTab server={server} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ApplicationsTab />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <MonitoringTab />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <SecurityAdvisorTab customerId={customerId} serverId={serverId} />
          </TabPanel>
        </GlassCard>
      </RootContainer>
    </>
  );
}
