import React, { useState, useEffect } from 'react';
import { Typography, Box, CircularProgress, Chip, Card } from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import { getServerHealth, getServerMetrics } from '../../../../api/serverService';

const SectionHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  color: theme.palette.common.white,
  background: 'rgb(110, 108, 109)',
  backdropFilter: 'blur(10px) saturate(180%)',
  WebkitBackdropFilter: 'blur(10px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.125)',
  borderBottom: 'none',
  borderRadius: '12px 12px 0 0',
  fontSize: '1.1rem',
  fontWeight: 'bold',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
}));

const GlassCard = styled(Card)(({ theme }) => ({
  background: 'rgba(38, 50, 56, 0.6)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.125)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  color: '#fff',
  padding: theme.spacing(2),
}));

const DetailItem = ({ label, value }) => (
  <Box sx={{ width: { xs: '100%', sm: '50%' }, display: 'flex', py: 0.5, px: 0.5 }}>
    <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', width: '200px', flexShrink: 0 }}>{label}:</Typography>
    <Typography variant="body1" component="span" sx={{ wordBreak: 'break-all', width: '300px'}}>{value}</Typography>
  </Box>
);

function DetailsTab({ server, customerId }) {
  const [isOnline, setIsOnline] = useState(null);
  const [serverMetrics, setServerMetrics] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    if (server && server.id && customerId) {
      setIsOnline(null);
      setInfoLoading(true);

      const checkConnection = getServerHealth(customerId, server.id)
        .then(() => setIsOnline(true))
        .catch(() => setIsOnline(false));

      const fetchInfo = getServerMetrics(customerId, server.id)
        .then(response => setServerMetrics(response.data.data))
        .catch(() => setServerMetrics(null));

      Promise.all([checkConnection, fetchInfo]).finally(() => setInfoLoading(false));
    }
  }, [server, customerId]);

  if (!server) {
    return null;
  }

  const renderStatusChip = (label, condition) => (
    <Chip 
      icon={condition ? <CheckCircleOutlineIcon sx={{ color: 'white !important' }} /> : <HighlightOffOutlinedIcon sx={{ color: 'white !important' }} />}
      label={label}
      size="small"
      sx={{ 
        backgroundColor: condition ? 'success.main' : 'error.main',
        color: 'white'
      }}
    />
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
        {/* Server Section */}
        <Box sx={{ width: '100%', p: 1.5 }}>
          <SectionHeader>Server</SectionHeader>
          <GlassCard>
            {infoLoading ? <CircularProgress sx={{ color: '#FE6B8B' }} /> : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
              <DetailItem label="Server Name" value={server.server_name} />
              <DetailItem label="Status" value={renderStatusChip(isOnline ? 'Online' : 'Offline', isOnline)} />
              <DetailItem label="Operating System" value={serverMetrics?.os_info || 'N/A'} />
              <DetailItem label="Hostname" value={server.server_ip} />
              <DetailItem label="Uptime" value={serverMetrics?.uptime || 'N/A'} />
            </Box>
            )}
          </GlassCard>
        </Box>
        <Box sx={{ width: { xs: '100%', md: '100%' }, p: 1.5 }}>
          <SectionHeader>Resource</SectionHeader>
          <GlassCard sx={{ minHeight: 150 }}>
            {infoLoading ? <CircularProgress sx={{ color: '#FE6B8B' }} /> : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
                <DetailItem label="CPU Usage" value={`${serverMetrics?.cpu?.cpu_usage_percent?.toFixed(1) || 'N/A'} %`} />
                <DetailItem label="CPU Cores" value={`${serverMetrics?.cpu?.cores || 'N/A'} Cores`} />
                <DetailItem label="Total Memory" value={`${serverMetrics?.memory?.total_gb || 'N/A'} GB`} />
                <DetailItem label="Free Memory" value={`${serverMetrics?.memory?.available_gb || 'N/A'} GB`} />
                <DetailItem label="Used Memory" value={`${serverMetrics?.memory?.used_gb || 'N/A'} GB`} />
                <DetailItem label="Available Disk Space" value={`${serverMetrics?.disks?.[0]?.available_gb?.toFixed(2) || 'N/A'} GB`} />
                <DetailItem label="Used Disk Space" value={`${serverMetrics?.disks?.[0]?.used_gb?.toFixed(2) || 'N/A'} GB`} />
                <DetailItem label="Total Disk Space" value={`${serverMetrics?.disks?.[0]?.total_gb?.toFixed(2) || 'N/A'} GB`} />
              </Box>
            )}
          </GlassCard>
        </Box>
        <Box sx={{ width: { xs: '100%', md: '100%' }, p: 1.5 }}>
          <SectionHeader>SWAP Details</SectionHeader>
          <GlassCard sx={{ minHeight: 150 }}>
          {infoLoading ? <CircularProgress sx={{ color: '#FE6B8B' }} /> : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
                    <DetailItem label="Enable Swap" value={serverMetrics?.swap ? (serverMetrics.swap.enabled ? 'Enabled' : 'Disabled') : 'N/A'} />
          <DetailItem label="Total Swap" value={`${serverMetrics?.swap?.total_gb || 'N/A'} GB`} />
          <DetailItem label="Free Swap" value={`${serverMetrics?.swap?.free_gb || 'N/A'} GB`} />
          <DetailItem label="Used Swap" value={`${serverMetrics?.swap?.used_gb || 'N/A'} GB`} />
          </Box>
          )}
          </GlassCard>
        </Box>

      </Box>
    </Box>
  );
}

export default DetailsTab;
