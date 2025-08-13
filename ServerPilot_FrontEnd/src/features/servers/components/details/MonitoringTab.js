import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { getServerHealth } from '../../../../api/serverService';
import CpuUsage from '../monitoring/CpuUsage';
import MemoryUsage from '../monitoring/MemoryUsage';
import DiskUsage from '../monitoring/DiskUsage';
import DiskIO from '../monitoring/DiskIO';
import Bandwidth from '../monitoring/Bandwidth';
import { CircularProgressSx } from '../../../../common';

const MonitoringTab = ({ customerId, serverId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!customerId || !serverId) return;
    try {
      const response = await getServerHealth(customerId, serverId);
      setStats(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch server statistics. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [customerId, serverId]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <CircularProgress sx={CircularProgressSx}/>
        <Typography sx={{ ml: 2 }}>Loading server stats...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  if (!stats) {
    return <Typography sx={{ p: 3 }}>No data available.</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: '1 1 50%'}}>
            <CpuUsage cpu={stats.cpu} width={{ xs: '100%', md: '100%' }}/>
          </Box>
          <Box sx={{ flex: '1 1 50%' }}>
            <MemoryUsage memory={stats.memory} width={{ xs: '100%', md: '100%' }}/>
          </Box>
        </Box>
        <Box sx={{ flex: '1 1 50%' }}>
            <DiskUsage disks={stats.disks} width={{ xs: '100%', md: '100%' }}/>
          </Box>
          <Box sx={{ flex: '1 1 50%' }}>
            <DiskIO diskIO={stats.disk_io} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: '1 1 50%' }}>
            <Bandwidth bandwidth={stats.bandwidth} />
          </Box>
        </Box>
    </Box>
  );
};

export default MonitoringTab;
