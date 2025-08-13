import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { createServer, updateServer } from '../../../api/serverService';
import {Box, Button, Typography, ListItemText,ListItemIcon, IconButton, CircularProgress, Alert, Tooltip, Menu, MenuItem, Grid, 
  CardContent, Table, TableBody,TableCell, TableContainer, TableHead, TableRow, TextField,InputAdornment} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import DeleteIcon from '@mui/icons-material/Delete';
import DnsIcon from '@mui/icons-material/Dns';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoIcon from '@mui/icons-material/Info';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import { getServers, deleteServer, getServerHealth, changeServerPassword } from '../../../api/serverService';
import ServerForm from './ServerForm';
import { CustomSnackbar, useSnackbar } from '../../../common';
import { textFieldSx, gradientButtonSx, CircularProgressSx, ConfirmDialog, MenuActionsSx, GlassCard } from '../../../common';
import ChangeServerPasswordDialog from './ChangeServerPasswordDialog';
import ServerInfoDialog from './ServerInfoDialog';

const RootContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
}));


export default function ServerList({ customerId: propCustomerId }) {
  const { customerId: paramCustomerId } = useParams(); 
  const customerId = propCustomerId || paramCustomerId;

  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [serverInfo, setServerInfo] = useState({ data: null, error: null, serverName: '' });
  const [infoLoading, setInfoLoading] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState({}); 
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);

  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [currentServerForMenu, setCurrentServerForMenu] = useState(null);

  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [serverForPasswordChange, setServerForPasswordChange] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Use the custom snackbar hook
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  const handleMenuOpen = (event, server) => {
    setMenuAnchorEl(event.currentTarget);
    setCurrentServerForMenu(server);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setCurrentServerForMenu(null);
  };

  const handleOpenChangePasswordDialog = (server) => {
    setServerForPasswordChange(server);
    setChangePasswordDialogOpen(true);
  };

  const handleCloseChangePasswordDialog = () => {
    setChangePasswordDialogOpen(false);
    setServerForPasswordChange(null);
  };

  const submitServerPasswordChange = async (password) => {
    if (!serverForPasswordChange) return { ok: false, error: 'No server selected.' };
    try {
      await changeServerPassword(customerId, serverForPasswordChange.id, password);
      setSuccessMessage(`Password for server '${serverForPasswordChange.server_name}' has been changed successfully.`);
      showSuccess(`Password for server '${serverForPasswordChange.server_name}' has been changed successfully.`);
      return { ok: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to change password.';
      showError(errorMsg);
      return { ok: false, error: errorMsg };
    }
  };

    const checkAllServerStatus = async (serversToCheck) => {
    const statusPromises = serversToCheck.map(server => 
      getServerHealth(customerId, server.id)
        .then(() => ({ [server.id]: 'Online' }))
        .catch(() => ({ [server.id]: 'Offline' }))
    );
    const results = await Promise.all(statusPromises);
    const newStatuses = Object.assign({}, ...results);
    setOnlineStatus(prev => ({ ...prev, ...newStatuses }));
  };

  const fetchServers = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await getServers(customerId);
      const fetchedServers = Array.isArray(response.data.results) ? response.data.results : (Array.isArray(response.data) ? response.data : []);
      
      const uniqueServersMap = new Map();
      fetchedServers.forEach(server => {
        if (server && typeof server.id !== 'undefined') {
          uniqueServersMap.set(server.id, server);
        }
      });
      const uniqueServerList = Array.from(uniqueServersMap.values());
      setServers(uniqueServerList);
      
      if (uniqueServerList.length > 0) {
        checkAllServerStatus(uniqueServerList);
      }
    } catch (err) {
      setError('Failed to load servers. ' + (err.response?.data?.detail || err.message));
      setServers([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Filter servers based on search term
  const filteredServers = useMemo(() => {
    if (!searchTerm) return servers;
    
    const searchTermLower = searchTerm.toLowerCase();
    return servers.filter(server => {
      return (
        server.server_name.toLowerCase().includes(searchTermLower) ||
        server.server_ip.toLowerCase().includes(searchTermLower) ||
        (server.ssh_user && server.ssh_user.toLowerCase().includes(searchTermLower)) ||
        server.ssh_port.toString().includes(searchTerm)
      );
    });
  }, [servers, searchTerm]);

  const handleDelete = async () => {
    if (!serverToDelete) return;
    try {
      await deleteServer(customerId, serverToDelete.id);
      setServers(servers.filter(server => server.id !== serverToDelete.id));
      handleCloseDeleteDialog();
      showSuccess(`Server '${serverToDelete.server_name}' deleted successfully.`);
    } catch (err) {
      console.error('Failed to delete server:', err);
      setError(`Failed to delete server ${serverToDelete.server_name}. Please try again.`);
      handleCloseDeleteDialog(); 
      showError(`Failed to delete server ${serverToDelete.server_name}. Please try again.`);
    }
  };

  const handleOpenDeleteDialog = (server) => {
    setServerToDelete(server);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setServerToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleOpenInfoModal = async (server) => {
    setInfoModalOpen(true);
    setInfoLoading(true);
    setServerInfo({ serverName: server.server_name, data: null, error: null });
    try {
      const res = await getServerHealth(customerId, server.id);
      setServerInfo({ serverName: server.server_name, data: res.data, error: null });
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch server info.';
      setServerInfo({ serverName: server.server_name, data: null, error: errorMsg });
    }
    setInfoLoading(false);
  };

  const handleCloseInfoModal = () => {
    setInfoModalOpen(false);
    setServerInfo({ data: null, error: null, serverName: '' });
  };

  const handleOpenModal = (server = null) => {
    setEditingServer(server);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingServer(null);
    setIsModalOpen(false);
  };

  const handleSaveSuccess = async (serverData, serverId = null) => {
    try {
      setLoading(true);
      if (serverId) {
        // Update existing server
        await updateServer(customerId, serverId, serverData);
        showSuccess('Server updated successfully!');
      } else {
        // Create new server
        await createServer(customerId, serverData);
        showSuccess('Server created successfully!');
      }
      fetchServers();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving server:', error);
      showError(error.response?.data?.detail || 'Failed to save server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!customerId) {
    return (
      <RootContainer>
        <Alert severity="warning" sx={{ background: 'rgba(255, 193, 7, 0.8)', color: '#fff' }}>
          Customer ID not provided. Cannot load servers.
        </Alert>
      </RootContainer>
    );
  }

  if (loading) {
    return (
      <RootContainer sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress sx={CircularProgressSx} />
      </RootContainer>
    );
  }

  // Calculate statistics
  const totalServers = servers.length;
  const activeServers = servers.filter(s => s.is_active).length;
  const inactiveServers = totalServers - activeServers;

  return (
    <RootContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          Server Management
        </Typography>
        <Box>
          <Tooltip title="Refresh Servers">
            <IconButton onClick={fetchServers} sx={{ color: 'white', mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal()}
            sx={{...gradientButtonSx}}
          >
            Add Server
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2, background: 'rgba(76, 175, 80, 0.8)', color: '#fff' }} onClose={() => setSuccessMessage('')}>{successMessage}</Alert>}

      <Grid container spacing={4} sx={{ mb: 4, position: 'relative', zIndex: 2 }}>
        <Grid item xs={12} sm={6}>
          <GlassCard>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} variant="subtitle2">Total Servers</Typography>
                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>{totalServers}</Typography>
              </Box>
              <DnsIcon sx={{ fontSize: 48, color: '#fff', opacity: 0.8 }} />
            </CardContent>
          </GlassCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <GlassCard>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} variant="subtitle2">Active Servers</Typography>
                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>{activeServers}</Typography>
              </Box>
              <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#66bb6a', opacity: 0.8 }} />
            </CardContent>
          </GlassCard>
        </Grid>
        <Grid item xs={12} sm={4}>
          <GlassCard>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} variant="subtitle2">Inactive Servers</Typography>
                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>{inactiveServers}</Typography>
              </Box>
              <HighlightOffOutlinedIcon sx={{ fontSize: 48, color: '#ff5252', opacity: 0.8 }} />
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>

      <GlassCard sx={{ position: 'relative', zIndex: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search servers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)'}} />
                  </InputAdornment>
                ),
              }}
              sx={{...textFieldSx}}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress sx={CircularProgressSx} /></Box>
          ) : filteredServers.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 5, color: 'rgba(255,255,255,0.7)' }}>
              <DnsIcon sx={{ fontSize: 60, opacity: 0.3, mb: 2 }} />
              <Typography variant="h6">No servers found.</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>Click "Add Server" to create your first server.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table sx={{ minWidth: 650 }} aria-label="servers table">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'rgba(255, 255, 255, 0.7)' } }}>
                    <TableCell>Server</TableCell>
                    <TableCell>Connection Details</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredServers.map((server) => (
                    <TableRow hover key={server.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell component="th" scope="row">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {onlineStatus[server.id] === undefined ? (
                            <CircularProgress sx={CircularProgressSx} />
                          ) : (
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: onlineStatus[server.id] === 'Online' ? 'success.main' : 'grey.400',
                                mr: 1.5,
                                boxShadow: `0 0 8px ${onlineStatus[server.id] === 'Online' ? 'rgba(76, 175, 80, 0.8)' : 'rgba(158, 158, 158, 0.5)'}`
                              }}
                            />
                          )}
                          <DnsIcon sx={{ mr: 1.5, color: 'text.secondary' }} />
                          <Typography variant="body1" fontWeight="medium" sx={{ color: 'white' }}>
                            <Link to={`/customers/${customerId}/servers/${server.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                              {server.server_name}
                            </Link>
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'white' }}>{server.server_ip}:{server.ssh_port}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          User: {server.login_using_root ? 'root' : (server.ssh_user || 'N/A')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label="more actions"
                          onClick={(e) => handleMenuOpen(e, server)}
                          sx={{ color: 'white' }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </GlassCard>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        slotProps={{
          paper: {
            sx: {...MenuActionsSx}
          }
        }}
      >
        {currentServerForMenu && [
          <MenuItem
            key="info"
            onClick={() => { handleOpenInfoModal(currentServerForMenu); handleMenuClose(); }}
            disabled={onlineStatus[currentServerForMenu.id] === 'Offline'}
          >
            <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
            <ListItemText>View Stats</ListItemText>
          </MenuItem>,
          <MenuItem key="edit" onClick={() => { handleOpenModal(currentServerForMenu); handleMenuClose(); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>,
          <MenuItem
            key="change-password"
            onClick={() => { handleOpenChangePasswordDialog(currentServerForMenu); handleMenuClose(); }}
            disabled={onlineStatus[currentServerForMenu.id] === 'Offline'}
          >
            <ListItemIcon><LockResetIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Change Password</ListItemText>
          </MenuItem>,
          <MenuItem key="delete" onClick={() => { handleOpenDeleteDialog(currentServerForMenu); handleMenuClose(); }} sx={{ color: '#f44336' }}>
            <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        ]}
      </Menu>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the server "${serverToDelete?.server_name}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        severity="info"
      />

      <ChangeServerPasswordDialog
        open={changePasswordDialogOpen}
        onClose={handleCloseChangePasswordDialog}
        serverName={serverForPasswordChange?.server_name || ''}
        onSubmit={submitServerPasswordChange}
      />

      {infoModalOpen && (
        <ServerInfoDialog
          open={infoModalOpen}
          onClose={handleCloseInfoModal}
          serverName={serverInfo.serverName}
          loading={infoLoading}
          error={serverInfo?.error}
          metrics={serverInfo?.data?.data || null}
        />
      )}

      {/* Add/Edit Server Dialog */}
      <ServerForm
        open={isModalOpen}
        onClose={handleCloseModal}
        customerId={customerId}
        serverData={editingServer}
        onSave={handleSaveSuccess}
      />
      <CustomSnackbar
        open={snackbar.open}
        onClose={hideSnackbar}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </RootContainer>
  );
}