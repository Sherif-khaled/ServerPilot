import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Stack,
  CardContent,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { listCredentials, createCredential, revealCredential, testCredentialConnection } from '../../../../api/serverService';
import { useAuth } from '../../../../AuthContext';
import { GlassCard, textFieldSx, gradientButtonSx, CircularProgressSx, CustomSnackbar, useSnackbar, glassDialogSx, MenuActionsSx, CancelButton } from '../../../../common';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LanIcon from '@mui/icons-material/Lan';

export default function CredentialsTab({ customerId, serverId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  const [creds, setCreds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', secret: '' });
  const [errors, setErrors] = useState({});

  const [revealOpen, setRevealOpen] = useState(false);
  const [revealed, setRevealed] = useState({ username: '', secret: '', encoding: 'utf-8' });
  const [testResult, setTestResult] = useState({ status: '', message: '', output: '' });
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [currentCredForMenu, setCurrentCredForMenu] = useState(null);

  const canReveal = useMemo(() => Boolean(user?.is_staff), [user]); // Viewer can't, Admin can

  const fetchCreds = async () => {
    try {
      setLoading(true);
      const res = await listCredentials(customerId, serverId);
      setCreds(res.data || []);
    } catch (e) {
      // keep silent to avoid leaking info
      setCreds([]);
      showError(t('servers.credentials.loadFailed') || 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, cred) => {
    setMenuAnchorEl(event.currentTarget);
    setCurrentCredForMenu(cred);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setCurrentCredForMenu(null);
  };

  const onTestConnection = async (credId) => {
    try {
      const res = await testCredentialConnection(customerId, serverId, credId);
      setTestResult({ status: res.data.status, message: res.data.message, output: res.data.output || '' });
      showSuccess(res?.data?.message || t('servers.credentials.testSuccess') || 'Connection successful');
    } catch (e) {
      const data = e?.response?.data || {};
      setTestResult({ status: 'error', message: data.message || 'Failed to test connection.', output: data.details || '' });
      showError(data.message || t('servers.credentials.testFailed') || 'Failed to test connection');
    } finally {
      // No dialog; results are shown inline
    }
  };

  useEffect(() => {
    fetchCreds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, serverId]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    const newErrors = {};
    if (!form.username || !form.username.trim()) {
      newErrors.username = t('servers.credentials.usernameRequired') || 'Required';
    } else if (form.username.length < 2) {
      newErrors.username = t('servers.credentials.usernameTooShort') || 'Must be at least 2 characters';
    }
    if (!form.secret || !form.secret.trim()) {
      newErrors.secret = t('servers.credentials.secretRequired') || 'Required';
    } else if (form.secret.length < 4) {
      newErrors.secret = t('servers.credentials.secretTooShort') || 'Must be at least 4 characters';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    try {
      await createCredential(customerId, serverId, { username: form.username, secret: form.secret });
      // Clear sensitive fields immediately
      setForm({ username: '', secret: '' });
      await fetchCreds();
      showSuccess(t('servers.credentials.created') || 'Credential added successfully');
    } catch (err) {
      setErrors({ submit: t('servers.credentials.actionFailed') });
      showError(err?.response?.data?.message || t('servers.credentials.actionFailed'));
    }
  };

  const onReveal = async (credId) => {
    try {
      const res = await revealCredential(customerId, serverId, credId);
      setRevealed({ username: res.data.username, secret: res.data.secret, encoding: res.data.encoding });
      setRevealOpen(true);
    } catch (e) {
      // show minimal error
      showError(t('servers.credentials.revealFailed') || 'Failed to reveal secret');
    }
  };

  const closeReveal = () => {
    // auto-clear contents
    setRevealOpen(false);
    setTimeout(() => setRevealed({ username: '', secret: '', encoding: 'utf-8' }), 0);
  };

  const clearTestResult = () => setTestResult({ status: '', message: '', output: '' });

  return (
    <Box>
      
      <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
        {t('servers.credentials.title') || 'Credential Management'}
      </Typography>

      {/* Add Credential Form */}
      <GlassCard sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {loading ? (
            <CircularProgress size={20} sx={CircularProgressSx} />
          ) : (
          <form onSubmit={onSubmit} autoComplete="off">
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label={t('servers.credentials.username') || 'Username'}
                name="username"
                value={form.username}
                onChange={onChange}
                fullWidth
                error={!!errors.username}
                helperText={errors.username || ''}
                sx={textFieldSx}
              />
              <TextField
                label={t('servers.credentials.secret') || 'Password / Private Key'}
                name="secret"
                value={form.secret}
                onChange={onChange}
                type="password"
                fullWidth
                error={!!errors.secret}
                helperText={errors.secret || ''}
                sx={textFieldSx}
              />
              <Button type="submit" variant="contained" sx={{ ...gradientButtonSx }}>
                {t('servers.credentials.add') || 'Add'}
              </Button>
            </Stack>
            {errors.submit && (
              <Typography color="error" sx={{ mt: 1 }}>
                {errors.submit}
              </Typography>
            )}
          </form>
          )}
        </CardContent>
      </GlassCard>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        slotProps={{
          paper: {
            sx: { ...MenuActionsSx }
          }
        }}
      >
        {currentCredForMenu && (
          <>
            {canReveal && (
              <MenuItem onClick={() => { onReveal(currentCredForMenu.id); handleMenuClose(); }}>
                <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
                <ListItemText>{t('servers.credentials.reveal') || 'Reveal Secret'}</ListItemText>
              </MenuItem>
            )}
            <MenuItem onClick={() => { onTestConnection(currentCredForMenu.id); handleMenuClose(); }}>
              <ListItemIcon><LanIcon fontSize="small" /></ListItemIcon>
              <ListItemText>{t('servers.credentials.test') || 'Test Connection'}</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Credentials List */}
      <GlassCard>
        <CardContent sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress size={20} sx={CircularProgressSx} />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ background: 'transparent' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' } }}>
                    <TableCell>{t('servers.credentials.username') || 'Username'}</TableCell>
                    <TableCell>{t('servers.credentials.createdAt') || 'Created At'}</TableCell>
                    <TableCell align="right">{t('servers.credentials.actions') || 'Actions'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {creds.map((c) => (
                    <TableRow key={c.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { background: 'rgba(254,107,139,0.08)', transition: 'background 0.2s' } }}>
                      <TableCell>{c.username}</TableCell>
                      <TableCell>{new Date(c.created_at).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('servers.common.actions') || 'Actions'}>
                          <IconButton aria-label="more actions" onClick={(e) => handleMenuOpen(e, c)} sx={{ color: 'white' }}>
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!creds || creds.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary">
                          {t('servers.credentials.empty') || 'No credentials yet.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </GlassCard>

      {/* Reveal Dialog */}
      <Dialog open={revealOpen} onClose={closeReveal} maxWidth="sm" fullWidth PaperComponent={glassDialogSx}>
        <DialogTitle>{t('servers.credentials.revealTitle') || 'Revealed Secret'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{t('servers.credentials.username') || 'Username'}:</strong> {revealed.username}
          </DialogContentText>
          <TextField
            label={t('servers.credentials.secret') || 'Secret'}
            value={revealed.secret}
            fullWidth
            multiline
            InputProps={{ readOnly: true }}
            sx={{...textFieldSx, mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Box>
            <CancelButton onClick={closeReveal}>{t('common.close') || 'Close'}</CancelButton>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <CustomSnackbar
        open={snackbar.open}
        onClose={hideSnackbar}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Box>
  );
}
