import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import {
  Box, Button, Typography, ListItemText,
  ListItemIcon, IconButton, CircularProgress, Alert, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle, Chip,
  Tooltip, Menu, MenuItem, Grid, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Collapse, TextField, Paper,
  InputAdornment, Snackbar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import DeleteIcon from '@mui/icons-material/Delete';
import DnsIcon from '@mui/icons-material/Dns';
import PowerIcon from '@mui/icons-material/Power';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

import { getServers, deleteServer, testServerConnection, getServerInfo, changeServerPassword } from '../../../api/serverService';
import ServerForm from './ServerForm';

const COLORS = ['#0088FE', '#FF8042']; // Blue for Used, Orange for Available 

// Styled root component for the background
const RootContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
}));

// Glassmorphism Card
const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(38, 50, 56, 0.6)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    padding: theme.spacing(3),
    color: '#fff',
}));

const StyledDialog = styled(Dialog)({
  '& .MuiDialog-paper': {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    color: '#fff',
  },
  '& .MuiDialogTitle-root': {
    color: '#fff',
  },
  '& .MuiDialogContent-root': {
    color: '#fff',
  },
  '& .MuiDialogContentText-root': {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  '& .MuiTextField-root': {
    '& .MuiInputBase-root': {
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '10px',
      color: '#fff',
      '&:hover': {
        background: 'rgba(0, 0, 0, 0.4)',
      }
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none',
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.7)',
    },
  },
});

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
  const [testConnectionStatus, setTestConnectionStatus] = useState({}); 
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);

  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [currentServerForMenu, setCurrentServerForMenu] = useState(null);

  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [serverForPasswordChange, setServerForPasswordChange] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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
    setNewPassword('');
    setChangePasswordError('');
  };

  const handleCloseChangePasswordDialog = () => {
    setChangePasswordDialogOpen(false);
    setServerForPasswordChange(null);
    setNewPassword('');
    setChangePasswordError('');
  };

  const generateComplexPassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=<>?~";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    setNewPassword(retVal);
  };

  const handleChangePassword = async () => {
    if (!serverForPasswordChange || !newPassword) {
      setChangePasswordError('Password cannot be empty.');
      return;
    }
    setChangePasswordError('');
    try {
      await changeServerPassword(customerId, serverForPasswordChange.id, newPassword);
      handleCloseChangePasswordDialog();
      setSuccessMessage(`Password for server '${serverForPasswordChange.server_name}' has been changed successfully.`);
      setSnackbar({ open: true, message: `Password for server '${serverForPasswordChange.server_name}' has been changed successfully.`, severity: 'success' });
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to change password.';
      setChangePasswordError(errorMsg);
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    }
  };

  const fetchServers = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await getServers(customerId);
      setServers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch servers:', err);
      setError('Failed to load servers. Please try again.');
    }
    setLoading(false);
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
      setSnackbar({ open: true, message: `Server '${serverToDelete.server_name}' deleted successfully.`, severity: 'success' });
    } catch (err) {
      console.error('Failed to delete server:', err);
      setError(`Failed to delete server ${serverToDelete.server_name}. Please try again.`);
      handleCloseDeleteDialog(); 
      setSnackbar({ open: true, message: `Failed to delete server ${serverToDelete.server_name}. Please try again.`, severity: 'error' });
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
      const res = await getServerInfo(customerId, server.id);
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

  const handleSaveSuccess = () => {
    fetchServers(); 
    handleCloseModal();
  };

  const handleTestConnection = async (serverId) => {
    setTestConnectionStatus(prev => ({ 
      ...prev, 
      [serverId]: { testing: true, status: null, message: '' }
    }));
    try {
      const response = await testServerConnection(customerId, serverId);
      setTestConnectionStatus(prev => ({ 
        ...prev, 
        [serverId]: { testing: false, status: 'success', message: response.data.output || 'Connection successful!' }
      }));
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Connection test failed.';
      setTestConnectionStatus(prev => ({ 
        ...prev, 
        [serverId]: { testing: false, status: 'error', message: errorMessage }
      })); 
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
        <CircularProgress sx={{ color: '#FE6B8B' }} />
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
            sx={{
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
              color: 'white',
              borderRadius: '25px',
              padding: '10px 25px',
            }}
          >
            Add Server
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2, background: 'rgba(76, 175, 80, 0.8)', color: '#fff' }} onClose={() => setSuccessMessage('')}>{successMessage}</Alert>}

      {/* Statistics Cards */}
      <Grid container spacing={4} sx={{ mb: 4, position: 'relative', zIndex: 2 }}>
        <Grid item xs={12} sm={4}>
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
          {/* Add search bar */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search servers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                sx: { background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 2 }
              }}
               sx={{
                                  '& .MuiOutlinedInput-root': {
                                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
                                      '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
                                      color: 'white'
                                  },
                                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                  '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' }
                              }}
            />
          </Box>

          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
            slotProps={{
              paper: {
                sx: {
                  background: 'rgba(40, 50, 70, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  minWidth: '180px',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                  marginTop: '4px',
                  '& .MuiMenuItem-root': {
                    padding: '12px 16px',
                    fontSize: '0.875rem',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      margin: '2px 8px',
                      width: 'calc(100% - 16px)',
                    }
                  },
                  '& .MuiListItemIcon-root': {
                    minWidth: '36px',
                  }
                }
              }
            }}
            disableScrollLock={false}
            disablePortal={false}
            keepMounted={false}
          >
            {currentServerForMenu && [
              <MenuItem key="connect" component={Link} to={`/customers/${customerId}/servers/${currentServerForMenu.id}/console`} onClick={handleMenuClose}>
                <ListItemIcon><DnsIcon fontSize="small" sx={{ color: 'inherit' }} /></ListItemIcon>
                <ListItemText>Connect</ListItemText>
              </MenuItem>,
              <MenuItem key="info" onClick={() => { handleOpenInfoModal(currentServerForMenu); handleMenuClose(); }}>
                <ListItemIcon><InfoIcon fontSize="small" sx={{ color: 'inherit' }} /></ListItemIcon>
                <ListItemText>Get Server Info</ListItemText>
              </MenuItem>,
              <MenuItem key="change-password" onClick={() => { handleOpenChangePasswordDialog(currentServerForMenu); handleMenuClose(); }}>
                <ListItemIcon><LockResetIcon fontSize="small" sx={{ color: 'inherit' }} /></ListItemIcon>
                <ListItemText>Change Password</ListItemText>
              </MenuItem>,
              <MenuItem key="edit" onClick={() => { handleOpenModal(currentServerForMenu); handleMenuClose(); }}>
                <ListItemIcon><EditIcon fontSize="small" sx={{ color: 'inherit' }} /></ListItemIcon>
                <ListItemText>Edit</ListItemText>
              </MenuItem>,
              <MenuItem key="delete" onClick={() => { handleOpenDeleteDialog(currentServerForMenu); handleMenuClose(); }}>
                <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#f44336' }} /></ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>,

            ]}
          </Menu>
          <TableContainer sx={{ mt: 2 }}>
            <Table sx={{ minWidth: 650 }} aria-label="servers table">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)' } }}>
                  <TableCell>Server</TableCell>
                  <TableCell>Connection Details</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Connection Test</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredServers.map((server) => (
                  <React.Fragment key={server.id}>
                    <TableRow
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 }, opacity: testConnectionStatus[server.id]?.testing ? 0.5 : 1 }}
                    >
                      <TableCell component="th" scope="row">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <DnsIcon sx={{ mr: 1.5, color: 'text.secondary' }} />
                          <Typography variant="body1" fontWeight="medium">{server.server_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{server.server_ip}:{server.ssh_port}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          User: {server.login_using_root ? 'root' : (server.ssh_user || 'N/A')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={server.is_active ? 'Active' : 'Inactive'}
                          color={server.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={
                          testConnectionStatus[server.id]?.testing ? "Testing..." :
                          testConnectionStatus[server.id]?.status === 'success' ? "Connection Successful" :
                          testConnectionStatus[server.id]?.status === 'error' ? "Connection Failed" :
                          "Test Connection"
                        }>
                          <IconButton
                            aria-label="test connection"
                            tabIndex={0}
                            onClick={() => handleTestConnection(server.id)}
                            disabled={testConnectionStatus[server.id]?.testing}
                          >
                            {testConnectionStatus[server.id]?.testing ? <CircularProgress size={24} /> :
                              testConnectionStatus[server.id]?.status === 'success' ? <CheckCircleIcon color="success" /> :
                              testConnectionStatus[server.id]?.status === 'error' ? <ErrorIcon color="error" /> :
                              <PowerIcon />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label="more actions"
                          onClick={(e) => handleMenuOpen(e, server)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    {testConnectionStatus[server.id] && !testConnectionStatus[server.id]?.testing && (
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                          <Collapse in={true} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 1, p: 2, border: '1px dashed', borderColor: 'grey.400', borderRadius: 1, bgcolor: testConnectionStatus[server.id]?.status === 'error' ? 'rgba(255, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.03)' }}>
                              <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', color: testConnectionStatus[server.id]?.status === 'error' ? 'error.main' : 'text.secondary', fontWeight:'bold' }}>
                                Test Result:
                              </Typography>
                              <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', color: testConnectionStatus[server.id]?.status === 'error' ? 'error.main' : 'text.secondary', display: 'block', mt: 0.5 }}>
                                {testConnectionStatus[server.id]?.message}
                              </Typography>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {servers.length === 0 && !error && (
  <Box sx={{ textAlign: 'center', p: 5, color: 'rgba(255,255,255,0.7)' }}>
    <DnsIcon sx={{ fontSize: 60, opacity: 0.3, mb: 2 }} />
    <Typography variant="h6">No servers found for this customer.</Typography>
    <Typography variant="body2" sx={{ mt: 1 }}>Click "Add Server" to create your first server.</Typography>
  </Box>
)}

          <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
            <DialogTitle>Delete Server</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete the server "{serverToDelete?.server_name}"? This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
              <Button onClick={handleDelete} color="error">Delete</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={changePasswordDialogOpen} onClose={handleCloseChangePasswordDialog}>
            <DialogTitle>Change Server Password for {serverForPasswordChange?.server_name}</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Enter a new password for the server. You can also generate a complex password.
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                id="password"
                label="New Password"
                type="text"
                fullWidth
                variant="standard"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={!!changePasswordError}
                helperText={changePasswordError}
              />
              <Button onClick={generateComplexPassword} sx={{ mt: 2 }}>
                Generate Complex Password
              </Button>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseChangePasswordDialog}>Cancel</Button>
              <Button onClick={handleChangePassword}>Change Password</Button>
            </DialogActions>
          </Dialog>

          {/* Server Info Modal */}
          {infoModalOpen && (
            <Dialog open={infoModalOpen} onClose={handleCloseInfoModal} fullWidth maxWidth="md">
              <DialogTitle>Server Statistics: {serverInfo?.serverName}</DialogTitle>
              <DialogContent>
                {infoLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>
                ) : serverInfo?.error ? (
                  <Alert severity="error">{serverInfo.error}</Alert>
                ) : serverInfo?.data ? (
                  (() => {
                  // Safely destructure and parse CPU usage to a number
                  const { os, cpu_usage: cpuUsageStr, memory = {}, swap = {}, disks = [] } = serverInfo.data;
                  const cpu_usage = cpuUsageStr != null ? parseFloat(cpuUsageStr) : null;

                  // Prepare data for charts
                  const memoryChartData = [
                    { name: 'Used', value: memory.used_gb || 0 },
                    { name: 'Available', value: memory.available_gb || 0 }
                  ];
                  
                  const cpuChartData = cpu_usage != null ? [
                    { name: 'Used', value: cpu_usage },
                    { name: 'Free', value: 100 - cpu_usage }
                  ] : [];

                  return (
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                      {/* OS Info */}
                      <Grid item xs={12}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>System Overview</Typography>
                            {os && <Typography variant="body2"><strong>OS:</strong> {os}</Typography>}
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* CPU Usage Chart */}
                      {cpu_usage != null && (
                        <Grid item xs={12} md={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" gutterBottom>CPU Usage</Typography>
                              <ResponsiveContainer width="110%" height={170}>
                                <PieChart>
                                  <Pie
                                    data={cpuChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                  >
                                    {cpuChartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip formatter={(value) => `${value.toFixed(2)}%`} />
                                </PieChart>
                              </ResponsiveContainer>
                              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                                Usage: {cpu_usage.toFixed(2)}%
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      )}

                      {/* Memory Chart and Info */}
                      {memory.total_gb != null && (
                        <Grid item xs={12} md={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" gutterBottom>Memory Usage</Typography>
                              <ResponsiveContainer width="110%" height={170}>
                                <PieChart>
                                  <Pie
                                    data={memoryChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                  >
                                    {memoryChartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip formatter={(value) => `${value.toFixed(2)} GB`} />
                                </PieChart>
                              </ResponsiveContainer>
                              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                                Total: {memory.total_gb} GB | Used: {memory.used_gb} GB | Available: {memory.available_gb} GB
                              </Typography>
                              {swap.total_gb != null && (
                                <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                                  Swap: {swap.used_gb} GB / {swap.total_gb} GB
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      )}

                      {/* Disk Usage Chart */}
                      {disks.length > 0 && (
                        <Grid item xs={12}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" gutterBottom>Disk Usage (GB)</Typography>
                              <ResponsiveContainer width="110%" height={150}>
                                <BarChart data={disks} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" />
                                  <YAxis dataKey="mountpoint" type="category" width={80} />
                                  <RechartsTooltip formatter={(value) => `${value} GB`} />
                                  <Legend />
                                  <Bar dataKey="used_gb" name="Used" stackId="a" fill="#0088FE" />
                                  <Bar dataKey="available_gb" name="Available" stackId="a" fill="#FF8042" />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </Grid>
                      )}
                    </Grid>
                  );
                })()
                ) : (
                  <Typography>No information available.</Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseInfoModal}>Close</Button>
              </DialogActions>
            </Dialog>
          )}

          {/* Add/Edit Server Modal */}
          <Dialog
              open={isModalOpen}
              onClose={handleCloseModal}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(180%)', // Safari
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.125)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                  color: '#fff',
                }
              }}
            >
              <DialogTitle>{editingServer ? 'Edit Server' : 'Add New Server'}</DialogTitle>
              <DialogContent>
                {isModalOpen && (
                  <ServerForm
                    customerId={customerId}
                    serverData={editingServer}
                    onSaveSuccess={handleSaveSuccess}
                    onClose={handleCloseModal}
                  />
                )}
              </DialogContent>
          </Dialog>

        </CardContent>
      </GlassCard>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        ContentProps={{
          sx: {
            background: snackbar.severity === 'success' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(211, 47, 47, 0.9)',
            color: '#fff'
          }
        }}
      />
    </RootContainer>
  );
}