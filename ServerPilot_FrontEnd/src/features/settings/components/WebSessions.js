import React, { useState, useEffect, useCallback } from 'react';
import { getUserSessions, revokeUserSession } from '../../../api/securityService';
import { format } from 'date-fns';
import {Box,List,ListItem,ListItemText,ListItemIcon,IconButton,Typography,Divider,CircularProgress,Tooltip,} from '@mui/material';
import { Computer as ComputerIcon, TabletMac as TabletMacIcon, PhoneIphone as PhoneIphoneIcon } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import { CustomSnackbar, useSnackbar, ConfirmDialog, CircularProgressSx } from '../../../common';
import { useTranslation } from 'react-i18next';

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

  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const { t, i18n } = useTranslation();

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getUserSessions();
      setSessions(response.data);
      setError(null);
    } catch (err) {
      setError(t('webSessions.loadFail'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        fetchSessions();
        showSuccess(t('webSessions.revokeSuccess'));
      } catch (err) {
        showError(t('webSessions.revokeFail'));
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
        <CircularProgress size={20} sx={CircularProgressSx} />
      </Box>
    );
  }

  if (error) {
    return showError(error);
  }

  return (
    <Box dir={i18n.dir()}>
      <Typography variant="h6" gutterBottom>
        {t('webSessions.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('webSessions.description')}
      </Typography>
      <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 3, p: 2 }} dir={i18n.dir()}>
        {sessions.map((session, index) => (
          <React.Fragment key={session.id}>
            <ListItem
              secondaryAction={
                !session.is_current_session && (
                  <Tooltip title={t('webSessions.revokeTooltip')}>
                    <IconButton edge="end" aria-label="revoke" onClick={() => handleRevokeClick(session.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )
              }

            >
              <ListItemIcon>
                <Tooltip title={session.is_current_session ? t('webSessions.currentSession') : t('webSessions.deviceType')}>
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
                      <Typography component="span" sx={{ ...(i18n.dir() === 'rtl' ? { mr: 1 } : { ml: 1 }), color: 'success.main', fontWeight: 'normal' }}>
                        ({t('webSessions.currentSession')})
                      </Typography>
                    )}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary" display="block">
                      {session.location || t('webSessions.unknownLocation')}
                    </Typography>
                    <Typography component="span" variant="body2" color="text.secondary" display="block">
                      {session.user_agent}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary" display="block">
                      {t('webSessions.started')} {session.created_at ? format(new Date(session.created_at), 'PPP p') : t('webSessions.unknown')}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary" display="block">
                      {t('webSessions.lastActive')} {format(new Date(session.last_activity), 'PPP p')}
                    </Typography>
                  </>
                }
              />
            </ListItem>
            {index < sessions.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
      <ConfirmDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmRevoke}
        title={t('webSessions.confirmTitle')}
        message={t('webSessions.confirmMessage')}
        confirmText={revokeLoading ? t('webSessions.revoking') : t('webSessions.confirm')}
        cancelText={t('webSessions.cancel')}
        severity="warning"
        confirmButtonProps={{
          disabled: revokeLoading,
          startIcon: revokeLoading ? <CircularProgress size={20} /> : null,
        }}
      />
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
