import React from 'react';
import {
  Box,
  Typography,
  Card,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

const COLORS = ['#0088FE', '#FF8042'];

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

const CpuUsage = ({ cpu, width = { xs: '100%', md: '50%' } }) => {
  if (!cpu) {
    return (
      <Box sx={{ width:{...width}, p: 1 }}>
        <GlassCard>
          <Typography variant="h6" gutterBottom>CPU Usage (%)</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body2" color="text.secondary">Not available</Typography>
          </Box>
        </GlassCard>
      </Box>
    );
  }

  const cpuData = [
    { name: 'Used', value: cpu.cpu_usage_percent },
    { name: 'Idle', value: 100 - cpu.cpu_usage_percent },
  ];

  return (
    <Box sx={{ width:{...width}, p: 1 }}>
      <GlassCard>
        <Typography variant="h6" gutterBottom>CPU Usage (%)</Typography>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={cpuData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
            >
              <Cell key={`cell-used-cpu`} fill={COLORS[0]} />
              <Cell key={`cell-idle-cpu`} fill={COLORS[1]} />
            </Pie>
            <RechartsTooltip formatter={(value) => `${value.toFixed(2)}%`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <Typography variant="body2" align="center" sx={{ mt: 1 }}>
          Cores: {cpu.cores} 
          {cpu.load_average && `| Load: ${cpu.load_average['1m']}, ${cpu.load_average['5m']}, ${cpu.load_average['15m']}`}
        </Typography>
      </GlassCard>
    </Box>
  );
};

export default CpuUsage;
