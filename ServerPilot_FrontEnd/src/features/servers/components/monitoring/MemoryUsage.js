import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import { GlassCard } from '../../../../common';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

const COLORS = ['#0088FE', '#FF8042'];

// Using shared GlassCard from common

const MemoryUsage = ({ memory, width = { xs: '100%', md: '50%' }}) => {
  const { t } = useTranslation();
  if (!memory) {
    return (
      <Box sx={{ width:{...width}, p: 1 }}>
        <GlassCard>
          <Typography variant="h6" pl={2} gutterBottom>{t('servers.infoDialog.memory')}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body2" color="text.secondary">{t('servers.infoDialog.notAvailable')}</Typography>
          </Box>
        </GlassCard>
      </Box>
    );
  }

  const memoryData = [
    { name: 'Used', value: memory.used_gb },
    { name: 'Available', value: memory.available_gb },
  ];

  return (
    <Box sx={{ width:{...width}, p: 1 }}>
      <GlassCard>
        <Typography variant="h6" pl={2} gutterBottom>{t('servers.infoDialog.memory')}</Typography>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={memoryData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#82ca9d"
              paddingAngle={5}
              dataKey="value"
            >
              <Cell key={`cell-used-mem`} fill={COLORS[0]} />
              <Cell key={`cell-avail-mem`} fill={COLORS[1]} />
            </Pie>
            <RechartsTooltip formatter={(value) => `${value.toFixed(2)} GB`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <Typography variant="body2" align="center" sx={{ mt: 1 }}>
          Total: {memory.total_gb} GB | Used: {memory.used_gb} GB
        </Typography>
      </GlassCard>
    </Box>
  );
};

export default MemoryUsage;
