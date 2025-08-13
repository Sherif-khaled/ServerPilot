import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { GlassCard } from '../../../../common';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
} from 'recharts';

// Using shared GlassCard from common

const Bandwidth = ({ bandwidth, width = { xs: '100%', md: '100%' } }) => {
  if (!bandwidth) {
    return (
      <Box sx={{ ...width, p: 1 }}>
        <GlassCard>
          <Typography variant="h6" pl={2} gutterBottom>Bandwidth (Mbps)</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body2" color="text.secondary">Not available</Typography>
          </Box>
        </GlassCard>
      </Box>
    );
  }

  const data = [
    { name: 'Received', value: bandwidth.rx_mbps },
    { name: 'Sent', value: bandwidth.tx_mbps },
  ];

  return (
    <Box sx={{ ...width, p: 1 }}>
      <GlassCard>
        <Typography variant="h6" pl={2} gutterBottom>Bandwidth (Mbps)</Typography>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical">
            <XAxis type="number" stroke="#fff" />
            <YAxis type="category" dataKey="name" stroke="#fff" />
            <RechartsTooltip formatter={(value) => `${value.toFixed(2)} Mbps`} />
            <Legend />
            <Bar dataKey="value" fill="#82ca9d">
                <Cell key={`cell-rx`} fill={'#00C49F'} />
                <Cell key={`cell-tx`} fill={'#FFBB28'} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </Box>
  );
};

export default Bandwidth;
