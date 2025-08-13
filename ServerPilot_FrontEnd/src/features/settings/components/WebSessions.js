import React, { useState, useEffect, useCallback } from 'react';
import { getUserSessions, revokeUserSession } from '../../../api/securityService';
import { format } from 'date-fns';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
} from '@mui/material';
import { Computer as ComputerIcon, TabletMac as TabletMacIcon, PhoneIphone as PhoneIphoneIcon } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import MuiAlert from '@mui/material/Alert';
import { CustomSnackbar, useSnackbar } from '../../../common';

// Helper to guess device type from user agent
const getDeviceIcon = (userAgent) => {
  if (!userAgent) return <ComputerIcon />;
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
    return <PhoneIphoneIcon />;
  }
  if (ua.includes('ipad') || ua.includes('tablet')) {
    return <TabletMacIcon />;
  }
  return <ComputerIcon />;
};

const WebSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Use the custom snackbar hook
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getUserSessions();
      setSessions(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load sessions. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeClick = (sessionId) => {
    setSelectedSessionId(sessionId);
    setOpenDialog(true);
  };

  const handleConfirmRevoke = async () => {
    if (selectedSessionId) {
      setRevokeLoading(true);
      try {
        await revokeUserSession(selectedSessionId);
        fetchSessions(); // Refresh the list
        showSuccess('Session revoked successfully');
      } catch (err) {
        showError('Failed to revoke session. Please try again.');
        console.error(err);
      } finally {
        setOpenDialog(false);
        setSelectedSessionId(null);
        setRevokeLoading(false);
      }
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSessionId(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress sx={{ color: '#FE6B8B' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Active Web Sessions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This is a list of devices that have logged into your account. Revoke any sessions that you do not recognize.
      </Typography>
      <List>
        {sessions.map((session, index) => (
          <React.Fragment key={session.id}>
            <ListItem
              secondaryAction={
                !session.is_current_session && (
                  <Tooltip title="Revoke this session">
                    <IconButton edge="end" aria-label="revoke" onClick={() => handleRevokeClick(session.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )
              }

            >
              <ListItemIcon>
                <Tooltip title={session.is_current_session ? "Current session" : "Device type"}>
                  {session.is_current_session ? (
                    <ComputerIcon color="success" />
                  ) : (
                    getDeviceIcon(session.user_agent)
                  )}
                </Tooltip>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography component="span" sx={{ fontWeight: 'bold' }}>
                    {session.ip_address}
                    {session.is_current_session && (
                      <Typography component="span" sx={{ ml: 1, color: 'success.main', fontWeight: 'normal' }}>
                        (Current session)
                      </Typography>
                    )}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary" display="block">
                      {session.location || 'Unknown location'}
                    </Typography>
                    <Typography component="span" variant="body2" color="text.secondary" display="block">
                      {session.user_agent}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary" display="block">
                      Started: {session.created_at ? format(new Date(session.created_at), 'PPP p') : 'Unknown'}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary" display="block">
                      Last active: {format(new Date(session.last_activity), 'PPP p')}
                    </Typography>
                  </>
                }
              />
            </ListItem>
            {index < sessions.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
      <Dialog
        open={openDialog}
        onClose={revokeLoading ? undefined : handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <MuiAlert
          severity="warning"
          icon={false}
          sx={{ alignItems: 'center', borderRadius: 0, mb: 1 }}
          elevation={0}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Confirm Session Revocation
          </Typography>
          <Typography variant="body2">
            Are you sure you want to revoke this session? This action cannot be undone.
          </Typography>
        </MuiAlert>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={revokeLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRevoke}
            color="error"
            autoFocus
            disabled={revokeLoading}
            startIcon={revokeLoading ? <CircularProgress size={18} /> : null}
          >
            {revokeLoading ? 'Revoking...' : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
      <CustomSnackbar
        open={snackbar.open}
        onClose={hideSnackbar}
        severity={snackbar.severity}
        message={snackbar.message}
      />
    </Box>
  );
};

export default WebSessions;
