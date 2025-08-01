import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#FFBB28'];

const ApplicationMonitorDialog = ({ open, onClose, appName, data, loading, error }) => {

  const cpuData = data ? [
    { name: 'Used', value: data.cpu_usage },
    { name: 'Free', value: 100 - data.cpu_usage },
  ] : [];

  const memoryData = data ? [
    { name: 'Used', value: data.memory_usage },
    { name: 'Free', value: 100 - data.memory_usage },
  ] : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { background: 'rgba(30, 40, 57, 0.9)', color: '#fff', backdropFilter: 'blur(5px)', borderRadius: '12px' } }}>
      <DialogTitle sx={{ textAlign: 'center', fontSize: '1.5rem' }}>Application Monitoring {appName}</DialogTitle>
      <DialogContent>
        {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', my: 4 }}>
                <CircularProgress sx={{ color: '#FE6B8B' }} />
                <Typography sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.7)' }}>Fetching data...</Typography>
            </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && data && (
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
            <Box sx={{ width: '50%', textAlign: 'center' }}>
              <Typography variant="h6">CPU Usage</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={cpuData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                    {cpuData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ width: '50%', textAlign: 'center' }}>
              <Typography variant="h6">Memory Usage</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={memoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#82ca9d" label>
                    {memoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#FF8042', '#00C49F'][index % 2]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#fff' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplicationMonitorDialog;
