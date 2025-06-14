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
} from '@mui/material';
import { Computer as ComputerIcon, TabletMac as TabletMacIcon, PhoneIphone as PhoneIphoneIcon } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';

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
      try {
        await revokeUserSession(selectedSessionId);
        fetchSessions(); // Refresh the list
      } catch (err) {
        setError('Failed to revoke session. Please try again.');
        console.error(err);
      } finally {
        setOpenDialog(false);
        setSelectedSessionId(null);
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
        <CircularProgress />
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
                  <IconButton edge="end" aria-label="revoke" onClick={() => handleRevokeClick(session.id)}>
                    <DeleteIcon />
                  </IconButton>
                )
              }
            >
              <ListItemIcon>{getDeviceIcon(session.user_agent)}</ListItemIcon>
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
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Session Revocation"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to revoke this session? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmRevoke} color="error" autoFocus>
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebSessions;
