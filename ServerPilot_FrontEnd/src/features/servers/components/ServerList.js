import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Paper, List, ListItem, ListItemText,
  ListItemIcon, IconButton, CircularProgress, Alert, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Chip,
  Tooltip, Menu, MenuItem, Grid, Card, CardContent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DnsIcon from '@mui/icons-material/Dns';
import PowerIcon from '@mui/icons-material/Power';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

import { getServers, deleteServer, testServerConnection, getServerInfo } from '../../../api/serverService';
import ServerForm from './ServerForm';

const COLORS = ['#0088FE', '#FF8042']; // Blue for Used, Orange for Available 

export default function ServerList({ customerId: propCustomerId }) {
  const { customerId: paramCustomerId } = useParams(); 
  const customerId = propCustomerId || paramCustomerId;
  const navigate = useNavigate();

  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [serverInfo, setServerInfo] = useState({ data: null, error: null, serverName: '' });
  const [infoLoading, setInfoLoading] = useState(false);
  const [testConnectionStatus, setTestConnectionStatus] = useState({}); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);

  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [currentServerForMenu, setCurrentServerForMenu] = useState(null);

  const handleMenuOpen = (event, server) => {
    setMenuAnchorEl(event.currentTarget);
    setCurrentServerForMenu(server);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setCurrentServerForMenu(null);
  };

  const fetchServers = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError('');
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

  const handleDelete = async () => {
    if (!serverToDelete) return;
    try {
      await deleteServer(customerId, serverToDelete.id);
      setServers(servers.filter(server => server.id !== serverToDelete.id));
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Failed to delete server:', err);
      setError(`Failed to delete server ${serverToDelete.server_name}. Please try again.`);
      handleCloseDeleteDialog(); 
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
    return <Alert severity="warning">Customer ID not provided. Cannot load servers.</Alert>;
  }

  if (loading) {
    return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;
  }

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">Servers</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenModal()}
        >
          Add Server
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {servers.length === 0 && !error && (
        <Typography sx={{mt: 2, textAlign: 'center'}}>No servers found for this customer.</Typography>
      )}

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {currentServerForMenu && [
          <MenuItem key="connect" component={Link} to={`/servers/${currentServerForMenu.id}/console`} onClick={handleMenuClose}>
            <ListItemIcon><DnsIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Connect</ListItemText>
          </MenuItem>,
          <MenuItem key="info" onClick={() => { handleOpenInfoModal(currentServerForMenu); handleMenuClose(); }}>
            <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Get Server Info</ListItemText>
          </MenuItem>,
          <MenuItem key="edit" onClick={() => { handleOpenModal(currentServerForMenu); handleMenuClose(); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>,
          <MenuItem key="delete" onClick={() => { handleOpenDeleteDialog(currentServerForMenu); handleMenuClose(); }}>
            <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        ]}
      </Menu>
      <List>
        {servers.map(server => (
          <React.Fragment key={server.id}>
            <ListItem 
              secondaryAction={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Test Connection">
                    <IconButton edge="end" aria-label="test" onClick={() => handleTestConnection(server.id)} disabled={testConnectionStatus[server.id]?.testing}>
                      {testConnectionStatus[server.id]?.testing ? <CircularProgress size={24} /> : 
                       testConnectionStatus[server.id]?.status === 'success' ? <CheckCircleIcon color="success" /> : 
                       testConnectionStatus[server.id]?.status === 'error' ? <ErrorIcon color="error" /> : 
                       <PowerIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Actions">
                    <IconButton
                      aria-label="more"
                      onClick={(e) => handleMenuOpen(e, server)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemIcon>
                <DnsIcon />
              </ListItemIcon>
              <ListItemText 
                primary={server.server_name}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      {server.server_ip}:{server.ssh_port}
                    </Typography>
                    {` - User: ${server.login_using_root ? 'root' : (server.ssh_user || 'N/A')}`}
                    <Chip label={server.is_active ? 'Active' : 'Inactive'} color={server.is_active ? 'success' : 'default'} size="small" sx={{ml: 1}}/>
                  </>
                }
              />
            </ListItem>
            {testConnectionStatus[server.id] && !testConnectionStatus[server.id]?.testing && (
              <ListItem sx={{ pl: 9, pt:0, pb: 1}}>
                 <Typography variant="caption" sx={{whiteSpace: 'pre-wrap', color: testConnectionStatus[server.id]?.status === 'error' ? 'error.main' : 'text.secondary'}}>
                    {testConnectionStatus[server.id]?.message}
                 </Typography>
              </ListItem>
            )}
            <Divider component="li" />
          </React.Fragment>
        ))}
      </List>

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
      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>{editingServer ? 'Edit Server' : 'Add New Server'}</DialogTitle>
        <DialogContent>
          {/* Render ServerForm only when modal is open to ensure fresh state or correct data loading */}
          {isModalOpen && (
            <ServerForm
              customerId={customerId}
              serverData={editingServer} // Pass null for add, server object for edit
              onSaveSuccess={handleSaveSuccess}
              onClose={handleCloseModal}
            />
          )}
        </DialogContent>
        {/* DialogActions can be part of ServerForm or here if ServerForm doesn't have its own submit/cancel buttons */}
        {/* For now, assuming ServerForm handles its own actions, or actions are passed down to it */}
      </Dialog>
    </Paper>
  );
}
