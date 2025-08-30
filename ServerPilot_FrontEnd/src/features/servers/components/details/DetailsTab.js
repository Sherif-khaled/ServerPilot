import React, { useState, useEffect } from 'react';
import { Typography, Box, CircularProgress, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import { getServerHealth, getServerMetrics } from '../../../../api/serverService';
import { GlassCard, CircularProgressSx } from '../../../../common';
import { useTranslation } from 'react-i18next';

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

// Using shared GlassCard from common

const DetailItem = ({ label, value }) => (
  <Box sx={{ width: { xs: '100%', sm: '50%' }, display: 'flex', py: 0.5, px: 0.5 }}>
    <Typography variant="body1" component="span" sx={{ fontWeight: 'bold', width: '200px', flexShrink: 0 }}>{label}:</Typography>
    <Typography variant="body1" component="span" sx={{ wordBreak: 'break-all', width: '300px'}}>{value}</Typography>
  </Box>
);

function DetailsTab({ server, customerId }) {
  const { t } = useTranslation();
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
          <SectionHeader>{t('servers.details.sectionServer')}</SectionHeader>
          <GlassCard sx={{ p: 2 }}>
            {infoLoading ? <CircularProgress size={20} sx={CircularProgressSx} /> : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
              <DetailItem label={t('servers.details.name')} value={server.server_name} />
              <DetailItem label={t('servers.details.status')} value={renderStatusChip(isOnline ? t('servers.common.statusOnline') : t('servers.common.statusOffline'), isOnline)} />
              <DetailItem label={t('servers.details.os')} value={serverMetrics?.os_info || t('servers.common.na')} />
              <DetailItem label={t('servers.details.hostname')} value={server.server_ip} />
              <DetailItem label={t('servers.details.uptime')} value={serverMetrics?.uptime || t('servers.common.na')} />
            </Box>
            )}
          </GlassCard>
        </Box>
        <Box sx={{ width: { xs: '100%', md: '100%' }, p: 1.5 }}>
          <SectionHeader>{t('servers.details.sectionResource')}</SectionHeader>
          <GlassCard sx={{ minHeight: 150, p: 2 }}>
            {infoLoading ? <CircularProgress size={20} sx={CircularProgressSx} /> : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
                <DetailItem label={t('servers.details.cpuUsage')} value={`${serverMetrics?.cpu?.cpu_usage_percent?.toFixed(1) || t('servers.common.na')} %`} />
                <DetailItem label={t('servers.details.cpuCores')} value={`${serverMetrics?.cpu?.cores || t('servers.common.na')} Cores`} />
                <DetailItem label={t('servers.details.totalMemory')} value={`${serverMetrics?.memory?.total_gb || t('servers.common.na')} GB`} />
                <DetailItem label={t('servers.details.freeMemory')} value={`${serverMetrics?.memory?.available_gb || t('servers.common.na')} GB`} />
                <DetailItem label={t('servers.details.usedMemory')} value={`${serverMetrics?.memory?.used_gb || t('servers.common.na')} GB`} />
                <DetailItem label={t('servers.details.availableDisk')} value={`${serverMetrics?.disks?.[0]?.available_gb?.toFixed(2) || t('servers.common.na')} GB`} />
                <DetailItem label={t('servers.details.usedDisk')} value={`${serverMetrics?.disks?.[0]?.used_gb?.toFixed(2) || t('servers.common.na')} GB`} />
                <DetailItem label={t('servers.details.totalDisk')} value={`${serverMetrics?.disks?.[0]?.total_gb?.toFixed(2) || t('servers.common.na')} GB`} />
              </Box>
            )}
          </GlassCard>
        </Box>
        <Box sx={{ width: { xs: '100%', md: '100%' }, p: 1.5 }}>
          <SectionHeader>{t('servers.details.sectionSwap')}</SectionHeader>
          <GlassCard sx={{ minHeight: 150, p: 2 }}>
          {infoLoading ? <CircularProgress size={20} sx={CircularProgressSx} /> : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.5 }}>
                    <DetailItem label={t('servers.details.enableSwap')} value={serverMetrics?.swap ? (serverMetrics.swap.enabled ? t('securityRisks.table.enabled') : t('securityRisks.table.disabled')) : t('servers.common.na')} />
          <DetailItem label={t('servers.details.totalSwap')} value={`${serverMetrics?.swap?.total_gb || t('servers.common.na')} GB`} />
          <DetailItem label={t('servers.details.freeSwap')} value={`${serverMetrics?.swap?.free_gb || t('servers.common.na')} GB`} />
          <DetailItem label={t('servers.details.usedSwap')} value={`${serverMetrics?.swap?.used_gb || t('servers.common.na')} GB`} />
          </Box>
          )}
          </GlassCard>
        </Box>

      </Box>
    </Box>
  );
}

export default DetailsTab;
