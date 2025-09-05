import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import { GlassCard } from '../../../../common';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

// Using shared GlassCard from common

const DiskUsage = ({ disks, width }) => {
  const { t } = useTranslation();
  if (!disks || disks.length === 0) {
    return (
        <Box sx={{ p: 1, mt: 2,width:{...width}, height: '100%' }}>
            <GlassCard>
                <Typography variant="h6" pl={2} gutterBottom>{t('monitoring.diskUsage')} (GB)</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                    <Typography variant="body2" color="text.secondary">{t('servers.infoDialog.notAvailable')}</Typography>
                </Box>
            </GlassCard>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, mt: 2,width:{...width}, height: '100%' }}>
      <GlassCard>
        <Typography variant="h6" pl={2} gutterBottom>{t('monitoring.diskUsage')} (GB)</Typography>
        <ResponsiveContainer width="100%" height={disks.length * 80}>
          <BarChart
            data={disks}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="mountpoint" type="category" width={80} />
            <RechartsTooltip
              formatter={(value, name) => [
                `${value.toFixed(2)} GB`,
                name.charAt(0).toUpperCase() + name.slice(1),
              ]}
            />
            <Legend />
            <Bar dataKey="used_gb" stackId="a" fill="#8884d8" name="Used" />
            <Bar dataKey="available_gb" stackId="a" fill="#82ca9d" name="Available" />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </Box>
  );
};

export default DiskUsage;
