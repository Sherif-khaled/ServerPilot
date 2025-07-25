import React from 'react';
import {
  Box,
  Typography,
  Card,
} from '@mui/material';
import { styled } from '@mui/material/styles';
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

const GlassCard = styled(Card)(({ theme }) => ({
  background: 'rgba(38, 50, 56, 0.6)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.125)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  padding: theme.spacing(3),
  color: '#fff',
}));

const DiskUsage = ({ disks, width }) => {
  if (!disks || disks.length === 0) {
    return (
        <Box sx={{ p: 1, mt: 2,width:{...width}, height: '100%' }}>
            <GlassCard>
                <Typography variant="h6" gutterBottom>Disk Usage (GB)</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                    <Typography variant="body2" color="text.secondary">Not available</Typography>
                </Box>
            </GlassCard>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, mt: 2,width:{...width}, height: '100%' }}>
      <GlassCard>
        <Typography variant="h6" gutterBottom>Disk Usage (GB)</Typography>
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
