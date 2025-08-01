import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Grid,
  Avatar,
  TablePagination,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { ShieldOutlined, CheckCircleOutline, Block, ReportProblemOutlined } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import {
  addUfwRule,
  deleteUfwRule,
  editUfwRule,
  getFirewallStatus,
  getUfwRules,
  toggleFirewall,
} from '../../../../api/serverService';

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
const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.6)' },
    '&.Mui-focused fieldset': { borderColor: 'transparent' },
    '&.Mui-focused': {
      boxShadow: '0 0 0 2px #FE6B8B, 0 0 0 1px #FF8E53',
      borderRadius: 1,
    },
    color: '#fff',
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' },
  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.7)' },
};
const protocolPorts = {
  ssh: 22,
  smtp: 25,
  dns: 53,
  http: 80,
  https: 443,
  pop3: 110,
  imap: 143,
  ldap: 389,
  smb: 445,
  smtps: 465,
  imaps: 993,
  pop3s: 995,
  mysql: 3306,
  postgresql: 5432,
};

const FirewallTab = () => {
  const isCustomProtocol = (protocol) => {
    return protocol?.startsWith('custom');
  };

  const handleProtocolChange = (protocol, ruleType) => {
    const port = protocolPorts[protocol] || '';
    if (ruleType === 'new') {
      setNewRule(prev => ({ ...prev, protocol, port }));
    } else {
      setEditedRuleData(prev => ({ ...prev, protocol, port }));
    }
  };
  const { customerId, serverId } = useParams();
  const [isFirewallEnabled, setIsFirewallEnabled] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [newRule, setNewRule] = useState({ protocol: 'custom_tcp', port: '', action: 'allow', source: 'Anywhere' });
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editedRuleData, setEditedRuleData] = useState({});
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const stats = useMemo(() => ({
    total: rules.length,
    allow: rules.filter(rule => rule.action.toLowerCase() === 'allow').length,
    deny: rules.filter(rule => rule.action.toLowerCase() === 'deny').length,
    reject: rules.filter(rule => rule.action.toLowerCase() === 'reject').length,
  }), [rules]);

  const fetchStatus = useCallback(async () => {
    try {
      setError('');
      const statusRes = await getFirewallStatus(customerId, serverId);
      setIsFirewallEnabled(statusRes.data.firewall_enabled);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch firewall status.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [customerId, serverId]);

  const fetchRules = useCallback(async () => {
    if (isFirewallEnabled) {
      setRulesLoading(true);
      setError('');
      try {
        const rulesRes = await getUfwRules(customerId, serverId);
        // The backend returns the array directly, so we use rulesRes.data
        setRules(rulesRes.data || []);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to fetch firewall rules.';
        setError(errorMessage);
        console.error(err);
      } finally {
        setRulesLoading(false);
      }
    } else {
      // If firewall is not enabled, ensure rules are cleared.
      setRules([]);
    }
  }, [customerId, serverId, isFirewallEnabled]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    // This effect runs when the component mounts and whenever isFirewallEnabled changes.
    if (isFirewallEnabled !== null) {
      fetchRules();
    }
  }, [isFirewallEnabled, fetchRules]);

  const handleToggleFirewall = async () => {
    setLoading(true);
    try {
      const response = await toggleFirewall(customerId, serverId);
      setIsFirewallEnabled(response.data.firewall_enabled);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to toggle firewall.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.port && newRule.protocol !== 'icmp') {
      setError('Port is required to add a rule.');
      return;
    }
    setRulesLoading(true);
    try {
      await addUfwRule(customerId, serverId, newRule);
      setNewRule({ port: '', action: 'allow', source: 'Anywhere' });
      // Manually trigger fetchRules after adding a rule
      await fetchRules();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to add rule.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setRulesLoading(false);
    }
  };

  const handleDeleteClick = (ruleId) => {
    setRuleToDelete(ruleId);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;
    setRulesLoading(true);
    try {
      await deleteUfwRule(customerId, serverId, ruleToDelete);
      fetchRules();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to delete rule.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setRulesLoading(false);
      setConfirmDeleteOpen(false);
      setRuleToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteOpen(false);
    setRuleToDelete(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredRules = rules.filter(rule => actionFilter === 'all' || rule.action.toLowerCase() === actionFilter);

  const handleEditClick = (rule) => {
    setEditingRuleId(rule.id);
    setEditedRuleData({ ...rule, protocol: rule.protocol || 'custom_tcp', action: rule.action.toLowerCase() });
  };

  const handleCancelClick = () => {
    setEditingRuleId(null);
    setEditedRuleData({});
  };

  const handleSaveClick = async () => {
    setRulesLoading(true);
    try {
      // Pass the whole editedRuleData object, which includes the id
      await editUfwRule(customerId, serverId, editedRuleData);
      setEditingRuleId(null);
      fetchRules();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save rule changes.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setRulesLoading(false);
    }
  };

  return (
    <Box>
      <Dialog
        open={confirmDeleteOpen}
        onClose={handleDeleteCancel}
        PaperProps={{ sx: { background: 'rgba(30, 40, 57, 0.9)', color: '#fff', backdropFilter: 'blur(5px)' } }}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this firewall rule? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)', mb: 3 }}>
        Firewall Management
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { title: 'Total Rules', count: stats.total, icon: <ShieldOutlined sx={{ fontSize: 30 }} />, color: '#29b6f6' },
          { title: 'Allowed', count: stats.allow, icon: <CheckCircleOutline sx={{ fontSize: 30 }} />, color: '#66bb6a' },
          { title: 'Denied', count: stats.deny, icon: <Block sx={{ fontSize: 30 }} />, color: '#ef5350' },
          { title: 'Rejected', count: stats.reject, icon: <ReportProblemOutlined sx={{ fontSize: 30 }} />, color: '#ffa726' },
        ].map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <GlassCard sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: item.color, width: 56, height: 56, mr: 2 }}>
                {item.icon}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{item.count}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{item.title}</Typography>
              </Box>
            </GlassCard>
          </Grid>
        ))}
      </Grid>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      
      {loading ? (
        <CircularProgress sx={{ color: '#FE6B8B' }} />
      ) : (
        <GlassCard sx={{ p: 2, mt: 2 }}>
          <FormControlLabel
            control={<Switch checked={isFirewallEnabled || false} sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#FE6B8B',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#FE6B8B',
                },
            }} onChange={handleToggleFirewall} />}
            label={isFirewallEnabled ? 'Firewall is ON' : 'Firewall is OFF'}
          />
        </GlassCard>
      )}

      {isFirewallEnabled && (
        <GlassCard sx={{ p: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>Firewall Rules</Typography>
            <FormControl size="small" sx={{...textFieldSx, minWidth: 120 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={actionFilter}
                label="Action"
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="allow">Allow</MenuItem>
                <MenuItem value="deny">Deny</MenuItem>
                <MenuItem value="reject">Reject</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TableContainer>
            <Table sx={{ minWidth: 650 }} aria-label="Firewall rules">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'rgba(255, 255, 255, 0.7)' } }}>
                  <TableCell>#</TableCell>
                  <TableCell >Protocol</TableCell>
                  <TableCell>Port</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>New</TableCell>
                  <TableCell sx={textFieldSx}>
                    <Select size="small" value={newRule.protocol || 'custom_tcp'} onChange={(e) => handleProtocolChange(e.target.value, 'new')}>
                      <MenuItem value="custom_tcp">Custom TCP</MenuItem>
                      <MenuItem value="custom_udp">Custom UDP</MenuItem>
                      <MenuItem value="ssh">SSH</MenuItem>
                      <MenuItem value="smtp">SMTP</MenuItem>
                      <MenuItem value="dns">DNS</MenuItem>
                      <MenuItem value="http">HTTP</MenuItem>
                      <MenuItem value="https">HTTPS</MenuItem>
                      <MenuItem value="pop3">POP3</MenuItem>
                      <MenuItem value="imap">IMAP</MenuItem>
                      <MenuItem value="ldap">LDAP</MenuItem>
                      <MenuItem value="smb">SMB</MenuItem>
                      <MenuItem value="smtps">SMTPS</MenuItem>
                      <MenuItem value="imaps">IMAPS</MenuItem>
                      <MenuItem value="pop3s">POP3S</MenuItem>
                      <MenuItem value="mysql">MYSQL</MenuItem>
                      <MenuItem value="postgresql">PostgreSQL</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField size="small" label="Port" value={newRule.port} onChange={(e) => setNewRule({ ...newRule, port: e.target.value })} disabled={!isCustomProtocol(newRule.protocol) || newRule.protocol === 'icmp'} />
                  </TableCell>
                  <TableCell sx={textFieldSx}>
                    <Select size="small" value={newRule.action} onChange={(e) => setNewRule({ ...newRule, action: e.target.value })} >
                      <MenuItem value="allow">ALLOW</MenuItem>
                      <MenuItem value="deny">DENY</MenuItem>
                      <MenuItem value="reject">REJECT</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField size="small" value={newRule.source} onChange={(e) => setNewRule({ ...newRule, source: e.target.value })} />
                  </TableCell>
                  <TableCell align="right">
                    <Button variant="contained" onClick={handleAddRule}
                    startIcon={<AddIcon />} 
                    disabled={rulesLoading}
                    sx={{
                        background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                        boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                        color: 'white',
                        borderRadius: '25px',
                        padding: '10px 25px',
                    }}
                    >Add Rule</Button>
                  </TableCell>
                </TableRow>
                {rulesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center"><CircularProgress sx={{ color: '#FE6B8B' }} /></TableCell>
                  </TableRow>
                ) : filteredRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {actionFilter === 'all' ? 'No rules defined.' : 'No rules match the current filter.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  (rowsPerPage > 0
                    ? filteredRules.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    : filteredRules
                  ).map((rule) => (
                    <TableRow key={rule.id}>
                      {editingRuleId === rule.id ? (
                        <>
                          <TableCell>{rule.id}</TableCell>
                          <TableCell>
                            <Select 
                              size="small" 
                              value={editedRuleData.protocol}
                              onChange={(e) => handleProtocolChange(e.target.value, 'edit')}
                            >
                              <MenuItem value="ssh">SSH</MenuItem>
                              <MenuItem value="smtp">SMTP</MenuItem>
                              <MenuItem value="dns">DNS</MenuItem>
                              <MenuItem value="http">HTTP</MenuItem>
                              <MenuItem value="https">HTTPS</MenuItem>
                              <MenuItem value="pop3">POP3</MenuItem>
                              <MenuItem value="imap">IMAP</MenuItem>
                              <MenuItem value="ldap">LDAP</MenuItem>
                              <MenuItem value="smb">SMB</MenuItem>
                              <MenuItem value="smtps">SMTPS</MenuItem>
                              <MenuItem value="imaps">IMAPS</MenuItem>
                              <MenuItem value="pop3s">POP3S</MenuItem>
                              <MenuItem value="mysql">MYSQL</MenuItem>
                              <MenuItem value="postgresql">PostgreSQL</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <TextField 
                              size="small" 
                              value={editedRuleData.port}
                              onChange={(e) => setEditedRuleData({...editedRuleData, port: e.target.value})}
                              disabled={!isCustomProtocol(editedRuleData.protocol) || editedRuleData.protocol === 'icmp'}
                            />
                          </TableCell>
                          <TableCell>
                            <Select 
                              size="small" 
                              value={editedRuleData.action || rule.action.toLowerCase()}
                              onChange={(e) => setEditedRuleData({...editedRuleData, action: e.target.value})}
                            >
                              <MenuItem value="allow">ALLOW</MenuItem>
                              <MenuItem value="deny">DENY</MenuItem>
                              <MenuItem value="reject">REJECT</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <TextField size="small" value={rule.source} disabled />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton onClick={handleSaveClick} color="primary" disabled={rulesLoading}><SaveIcon /></IconButton>
                            <IconButton onClick={handleCancelClick} disabled={rulesLoading}><DeleteIcon /></IconButton>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{rule.id}</TableCell>
                          <TableCell>{rule.protocol}</TableCell>
                          <TableCell>{rule.port}</TableCell>
                          <TableCell>{rule.action}</TableCell>
                          <TableCell>{rule.source}</TableCell>
                          <TableCell align="right">
                            <IconButton onClick={() => handleEditClick(rule)} disabled={rulesLoading} color="primary">
                              <EditIcon />
                            </IconButton>
                            <IconButton onClick={() => handleDeleteClick(rule.id)} disabled={rulesLoading} color="error">
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
            component="div"
            count={filteredRules.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          />
        </GlassCard>
      )}
    </Box>
  );
};

export default FirewallTab;
