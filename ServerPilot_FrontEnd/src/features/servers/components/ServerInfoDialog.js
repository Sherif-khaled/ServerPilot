import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CpuUsage from './monitoring/CpuUsage';
import MemoryUsage from './monitoring/MemoryUsage';
import DiskUsage from './monitoring/DiskUsage';
import { glassDialogSx, CircularProgressSx, CancelButton } from '../../../common';
import { useTranslation } from 'react-i18next';

/**
 * Props:
 * - open: boolean
 * - onClose: function
 * - serverName: string
 * - loading: boolean
 * - error: string | null
 * - metrics: { cpu?, memory?, disks? } | null
 */
export default function ServerInfoDialog({ open, onClose, serverName, loading, error, metrics }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperComponent={glassDialogSx}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <InfoIcon sx={{ mr: 1 }} /> {t('servers.infoDialog.title', { name: serverName })}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress size={20} sx={CircularProgressSx} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : metrics ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', p: 1 }}>
            {metrics.cpu && metrics.cpu.cpu_usage_percent !== undefined ? (
              <CpuUsage cpu={metrics.cpu} width={{ xs: '100%', md: '50%' }} />
            ) : (
              <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                <Typography variant="h6" gutterBottom>{t('servers.infoDialog.cpu')}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Typography variant="body2" color="text.secondary">{t('servers.infoDialog.notAvailable')}</Typography>
                </Box>
              </Box>
            )}

            {metrics.memory && metrics.memory.used_gb !== undefined ? (
              <MemoryUsage memory={metrics.memory} width={{ xs: '100%', md: '50%' }} />
            ) : (
              <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                <Typography variant="h6" gutterBottom>{t('servers.infoDialog.memory')}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Typography variant="body2" color="text.secondary">{t('servers.infoDialog.notAvailable')}</Typography>
                </Box>
              </Box>
            )}

            <DiskUsage disks={metrics.disks} width={{ xs: '100%', md: '100%' }} />
          </Box>
        ) : (
          <Typography>{t('servers.infoDialog.noInfo')}</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Box>
        <CancelButton onClick={onClose}>{t('servers.infoDialog.close')}</CancelButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
}


