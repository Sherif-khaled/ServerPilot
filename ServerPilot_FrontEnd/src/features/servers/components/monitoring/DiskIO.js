import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
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

const DiskIO = ({ diskIO, width = { xs: '100%', md: '100%' } }) => {
  if (!diskIO) {
    return (
      <Box sx={{ ...width, p: 1 }}>
        <GlassCard>
          <Typography variant="h6" pl={2} gutterBottom>Disk I/O (MB/s)</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body2" color="text.secondary">Not available</Typography>
          </Box>
        </GlassCard>
      </Box>
    );
  }

  const data = [
    { name: 'Read', value: diskIO.read_mbps },
    { name: 'Write', value: diskIO.write_mbps },
  ];

  return (
    <Box sx={{ ...width, p: 1 }}>
      <GlassCard>
        <Typography variant="h6" pl={2} gutterBottom>Disk I/O (MB/s)</Typography>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical">
            <XAxis type="number" stroke="#fff" />
            <YAxis type="category" dataKey="name" stroke="#fff" />
            <RechartsTooltip formatter={(value) => `${value.toFixed(2)} MB/s`} />
            <Legend />
            <Bar dataKey="value" fill="#8884d8">
                <Cell key={`cell-read`} fill={'#0088FE'} />
                <Cell key={`cell-write`} fill={'#FF8042'} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </Box>
  );
};

export default DiskIO;
