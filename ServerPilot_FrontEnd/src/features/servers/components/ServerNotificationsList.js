import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, List, ListItem, ListItemText, Chip, Stack, Divider, Alert } from '@mui/material';
import { getServerNotifications, getServerDetails } from '../../../api/serverService';

export default function ServerNotificationsList() {
  const { customerId, serverId } = useParams();
  const [notifications, setNotifications] = useState([]);
  const [server, setServer] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [srvRes, notifRes] = await Promise.all([
          getServerDetails(customerId, serverId),
          getServerNotifications(customerId, serverId),
        ]);
        if (!mounted) return;
        setServer(srvRes.data);
        setNotifications(notifRes.data);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.detail || 'Failed to load notifications.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [customerId, serverId]);

  return (
    <Box p={2}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h5">Server Notifications</Typography>
          {server && (
            <Chip label={`${server.server_name} (${server.server_ip})`} color="primary" variant="outlined" />
          )}
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Divider sx={{ mb: 2 }} />
        <List>
          {notifications.length === 0 && !loading && (
            <ListItem>
              <ListItemText primary="No notifications found." />
            </ListItem>
          )}
          {notifications.map((n) => (
            <ListItem key={n.id} alignItems="flex-start" divider>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1">{n.message}</Typography>
                    <Chip size="small" label={n.severity.toUpperCase()} color={n.severity === 'critical' ? 'error' : (n.severity === 'warning' ? 'warning' : 'default')} />
                    <Chip size="small" label={n.notification_type.replace('_', ' ')} variant="outlined" />
                  </Stack>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">{new Date(n.created_at).toLocaleString()}</Typography>
                    {(n.old_fingerprint?.sha256 || n.new_fingerprint?.sha256) && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">Old SHA256:</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{n.old_fingerprint?.sha256 || '-'}</Typography>
                        <Typography variant="caption" color="text.secondary">New SHA256:</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{n.new_fingerprint?.sha256 || '-'}</Typography>
                      </Box>
                    )}
                    {(n.old_fingerprint?.hex || n.new_fingerprint?.hex) && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">Old HEX:</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{n.old_fingerprint?.hex || '-'}</Typography>
                        <Typography variant="caption" color="text.secondary">New HEX:</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{n.new_fingerprint?.hex || '-'}</Typography>
                      </Box>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
