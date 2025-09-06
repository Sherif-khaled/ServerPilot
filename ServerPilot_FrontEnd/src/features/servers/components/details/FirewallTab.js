import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  FormControl,
  InputLabel,
  Grid,
  Avatar,
  TablePagination,
} from '@mui/material';
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

import { GlassCard, ConfirmDialog, switchSx, textFieldSx, CircularProgressSx, gradientButtonSx, SelectSx  } from '../../../../common';

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
  const { t } = useTranslation();
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
      const errorMessage = err.response?.data?.error || t('monitoring.common.loadError', 'Failed to fetch firewall status.');
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
        const errorMessage = err.response?.data?.error || t('firewall.errors.fetchRules');
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
      const errorMessage = err.response?.data?.error || t('firewall.errors.toggle');
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.port && newRule.protocol !== 'icmp') {
      setError(t('firewall.errors.portRequired'));
      return;
    }
    setRulesLoading(true);
    try {
      await addUfwRule(customerId, serverId, newRule);
      setNewRule({ port: '', action: 'allow', source: 'Anywhere' });
      // Manually trigger fetchRules after adding a rule
      await fetchRules();
    } catch (err) {
      const errorMessage = err.response?.data?.error || t('firewall.errors.add');
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
      const errorMessage = err.response?.data?.error || t('firewall.errors.delete');
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
      const errorMessage = err.response?.data?.error || t('firewall.errors.edit');
      setError(errorMessage);
      console.error(err);
    } finally {
      setRulesLoading(false);
    }
  };

  return (
    <Box>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('firewall.confirmDeleteTitle')}
        message={t('firewall.confirmDeleteMessage')}
        confirmText={t('firewall.confirm')}
        cancelText={t('firewall.cancel')}
        severity="error"
      />
      <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)', mb: 3 }}>
        {t('firewall.title')}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { title: t('firewall.stats.total'), count: stats.total, icon: <ShieldOutlined sx={{ fontSize: 30 }} />, color: '#29b6f6' },
          { title: t('firewall.stats.allow'), count: stats.allow, icon: <CheckCircleOutline sx={{ fontSize: 30 }} />, color: '#66bb6a' },
          { title: t('firewall.stats.deny'), count: stats.deny, icon: <Block sx={{ fontSize: 30 }} />, color: '#ef5350' },
          { title: t('firewall.stats.reject'), count: stats.reject, icon: <ReportProblemOutlined sx={{ fontSize: 30 }} />, color: '#ffa726' },
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
        <CircularProgress size={20} sx={CircularProgressSx} />
      ) : (
        <GlassCard sx={{ p: 2, mt: 2 }}>
          <FormControlLabel
            control={<Switch checked={isFirewallEnabled || false} 
            sx={{
               ...switchSx
              }} 
            onChange={handleToggleFirewall} />}
            label={isFirewallEnabled ? t('firewall.enabled') : t('firewall.disabled')}
          />
        </GlassCard>
      )}

      {isFirewallEnabled && (
        <GlassCard sx={{ p: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{t('firewall.rulesTitle')}</Typography>
            <FormControl size="small" sx={{...textFieldSx, minWidth: 500 }}>
              <InputLabel>{t('firewall.filterByAction')}</InputLabel>
              <Select
                value={actionFilter}
                label={t('firewall.filterByAction')}
                onChange={(e) => setActionFilter(e.target.value)}
                sx={{...SelectSx}}
              >
                <MenuItem value="all">{t('firewall.actionAll')}</MenuItem>
                <MenuItem value="allow">{t('firewall.actionAllow')}</MenuItem>
                <MenuItem value="deny">{t('firewall.actionDeny')}</MenuItem>
                <MenuItem value="reject">{t('firewall.actionReject')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TableContainer>
            <Table sx={{ minWidth: 650 }} aria-label="قواعد الجدار الناري">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'rgba(255, 255, 255, 0.7)' } }}>
                  <TableCell>{t('firewall.table.id')}</TableCell>
                  <TableCell>{t('firewall.table.protocol')}</TableCell>
                  <TableCell>{t('firewall.table.port')}</TableCell>
                  <TableCell>{t('firewall.table.action')}</TableCell>
                  <TableCell>{t('firewall.table.source')}</TableCell>
                  <TableCell align="right">{t('firewall.table.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{t('firewall.table.new')}</TableCell>
                  <TableCell sx={textFieldSx}>
                    <Select size="small" value={newRule.protocol || 'custom_tcp'} onChange={(e) => handleProtocolChange(e.target.value, 'new')}>
                      <MenuItem value="custom_tcp">{t('firewall.protocol.customTcp')}</MenuItem>
                      <MenuItem value="custom_udp">{t('firewall.protocol.customUdp')}</MenuItem>
                      <MenuItem value="ssh">{t('firewall.protocol.ssh')}</MenuItem>
                      <MenuItem value="smtp">{t('firewall.protocol.smtp')}</MenuItem>
                      <MenuItem value="dns">{t('firewall.protocol.dns')}</MenuItem>
                      <MenuItem value="http">{t('firewall.protocol.http')}</MenuItem>
                      <MenuItem value="https">{t('firewall.protocol.https')}</MenuItem>
                      <MenuItem value="pop3">{t('firewall.protocol.pop3')}</MenuItem>
                      <MenuItem value="imap">{t('firewall.protocol.imap')}</MenuItem>
                      <MenuItem value="ldap">{t('firewall.protocol.ldap')}</MenuItem>
                      <MenuItem value="smb">{t('firewall.protocol.smb')}</MenuItem>
                      <MenuItem value="smtps">{t('firewall.protocol.smtps')}</MenuItem>
                      <MenuItem value="imaps">{t('firewall.protocol.imaps')}</MenuItem>
                      <MenuItem value="pop3s">{t('firewall.protocol.pop3s')}</MenuItem>
                      <MenuItem value="mysql">{t('firewall.protocol.mysql')}</MenuItem>
                      <MenuItem value="postgresql">{t('firewall.protocol.postgresql')}</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField size="small" label={t('firewall.table.port')} value={newRule.port} onChange={(e) => setNewRule({ ...newRule, port: e.target.value })} disabled={!isCustomProtocol(newRule.protocol) || newRule.protocol === 'icmp'} sx={{...textFieldSx}} />
                  </TableCell>
                  <TableCell sx={textFieldSx}>
                    <Select size="small" value={newRule.action} onChange={(e) => setNewRule({ ...newRule, action: e.target.value })} >
                      <MenuItem value="allow">{t('firewall.actionAllow')}</MenuItem>
                      <MenuItem value="deny">{t('firewall.actionDeny')}</MenuItem>
                      <MenuItem value="reject">{t('firewall.actionReject')}</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField size="small" value={newRule.source} onChange={(e) => setNewRule({ ...newRule, source: e.target.value })} sx={{...textFieldSx}}/>
                  </TableCell>
                  <TableCell align="right">
                    <Button variant="contained" onClick={handleAddRule}
                    startIcon={<AddIcon />}
                    disabled={rulesLoading}
                    sx={{
                       ...gradientButtonSx
                    }}
                    >{t('firewall.addRule')}</Button>
                  </TableCell>
                </TableRow>
                {rulesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center"><CircularProgress size={20} sx={CircularProgressSx} /></TableCell>
                  </TableRow>
                ) : filteredRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {actionFilter === 'all' ? t('firewall.noRules') : t('firewall.noRulesForFilter')}
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
                              <MenuItem value="ssh">{t('firewall.protocol.ssh')}</MenuItem>
                              <MenuItem value="smtp">{t('firewall.protocol.smtp')}</MenuItem>
                              <MenuItem value="dns">{t('firewall.protocol.dns')}</MenuItem>
                              <MenuItem value="http">{t('firewall.protocol.http')}</MenuItem>
                              <MenuItem value="https">{t('firewall.protocol.https')}</MenuItem>
                              <MenuItem value="pop3">{t('firewall.protocol.pop3')}</MenuItem>
                              <MenuItem value="imap">{t('firewall.protocol.imap')}</MenuItem>
                              <MenuItem value="ldap">{t('firewall.protocol.ldap')}</MenuItem>
                              <MenuItem value="smb">{t('firewall.protocol.smb')}</MenuItem>
                              <MenuItem value="smtps">{t('firewall.protocol.smtps')}</MenuItem>
                              <MenuItem value="imaps">{t('firewall.protocol.imaps')}</MenuItem>
                              <MenuItem value="pop3s">{t('firewall.protocol.pop3s')}</MenuItem>
                              <MenuItem value="mysql">{t('firewall.protocol.mysql')}</MenuItem>
                              <MenuItem value="postgresql">{t('firewall.protocol.postgresql')}</MenuItem>
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
                              <MenuItem value="allow">{t('firewall.actionAllow')}</MenuItem>
                              <MenuItem value="deny">{t('firewall.actionDeny')}</MenuItem>
                              <MenuItem value="reject">{t('firewall.actionReject')}</MenuItem>
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
