import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { monitorApplication } from '../../../../api/serverService';

import { CancelButton, CircularProgressSx, glassDialogSx } from '../../../../common';
import { useTranslation } from 'react-i18next';

const COLORS = ['#0088FE', '#FFBB28'];

const ApplicationMonitorDialog = ({ open, onClose, customerId, serverId, appName, appId }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!open || !customerId || !serverId || !appName) return;
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const response = await monitorApplication(customerId, serverId, appId);
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.error || t('servers.common.loadingError'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, customerId, serverId, appName, appId, t]);

  const cpuData = data ? [
    { name: 'Used', value: data.cpu_usage },
    { name: 'Free', value: 100 - data.cpu_usage },
  ] : [];

  const memoryData = data ? [
    { name: 'Used', value: data.memory_usage },
    { name: 'Free', value: 100 - data.memory_usage },
  ] : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperComponent={glassDialogSx}>
      <DialogTitle sx={{ textAlign: 'center', fontSize: '1.5rem' }}>{t('monitoring.appMonitorTitle')} {appName}</DialogTitle>
      <DialogContent>
        {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', my: 4 }}>
                <CircularProgress size={20} sx={CircularProgressSx} />
                <Typography sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.7)' }}>{t('common.loading') || 'Fetching data...'}</Typography>
            </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && data && (
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
            <Box sx={{ width: '50%', textAlign: 'center' }}>
              <Typography variant="h6">{t('monitoring.cpu')}</Typography>
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
              <Typography variant="h6">{t('monitoring.memory')}</Typography>
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
        {!loading && !error && !data && (
          <Typography sx={{ mt: 2, textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>
            {t('servers.infoDialog.noInfo')}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Box>
          <CancelButton onClick={onClose}>{t('servers.infoDialog.close')}</CancelButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ApplicationMonitorDialog;
