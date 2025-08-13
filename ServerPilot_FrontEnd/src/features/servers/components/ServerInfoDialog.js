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
  Button,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CpuUsage from './monitoring/CpuUsage';
import MemoryUsage from './monitoring/MemoryUsage';
import DiskUsage from './monitoring/DiskUsage';
import { glassDialogSx, CircularProgressSx, CancelButton } from '../../../common';

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
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperComponent={glassDialogSx}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <InfoIcon sx={{ mr: 1 }} /> Server Information: {serverName}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress sx={CircularProgressSx} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : metrics ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', p: 1 }}>
            {metrics.cpu && metrics.cpu.cpu_usage_percent !== undefined ? (
              <CpuUsage cpu={metrics.cpu} width={{ xs: '100%', md: '50%' }} />
            ) : (
              <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                <Typography variant="h6" gutterBottom>CPU Usage (%)</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Typography variant="body2" color="text.secondary">Not available</Typography>
                </Box>
              </Box>
            )}

            {metrics.memory && metrics.memory.used_gb !== undefined ? (
              <MemoryUsage memory={metrics.memory} width={{ xs: '100%', md: '50%' }} />
            ) : (
              <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                <Typography variant="h6" gutterBottom>Memory Usage (GB)</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Typography variant="body2" color="text.secondary">Not available</Typography>
                </Box>
              </Box>
            )}

            <DiskUsage disks={metrics.disks} width={{ xs: '100%', md: '100%' }} />
          </Box>
        ) : (
          <Typography>No information available.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Box>
        <CancelButton onClick={onClose}>Close</CancelButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
}


