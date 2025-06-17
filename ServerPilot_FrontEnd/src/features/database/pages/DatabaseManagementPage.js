import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  Box,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon, Download as DownloadIcon } from '@mui/icons-material';
import api from '../../../api/apiClient';

const DatabaseManagementPage = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/db/backups/');
      setBackups(response.data);
    } catch (err) {
      setError('Failed to fetch backups.');
      setSnackbar({ open: true, message: 'Failed to fetch backups.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleDeleteClick = (backup) => {
    setSelectedBackup(backup);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedBackup(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBackup) return;

    try {
      await api.delete(`/db/backups/delete/${selectedBackup.filename}/`);
      setSnackbar({ open: true, message: 'Backup deleted successfully!', severity: 'success' });
      fetchBackups(); // Refresh the list
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete backup.', severity: 'error' });
    }
    handleDialogClose();
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Database Backups
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <List>
        {backups.length > 0 ? (
          backups.map((backup) => (
            <ListItem
              key={backup.filename}
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(backup)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemIcon>
                <DownloadIcon />
              </ListItemIcon>
              <ListItemText
                primary={backup.filename}
                secondary={`Size: ${formatBytes(backup.size)} - Created: ${new Date(backup.created_at).toLocaleString()}`}
              />
            </ListItem>
          ))
        ) : (
          <Typography variant="body1">No backups found.</Typography>
        )}
      </List>

      {/* Confirmation Dialog */}
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the backup file `{selectedBackup?.filename}`? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default DatabaseManagementPage;

