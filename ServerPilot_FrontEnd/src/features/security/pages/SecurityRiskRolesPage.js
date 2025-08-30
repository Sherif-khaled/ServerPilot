import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SecurityRiskDialog from '../components/SecurityRiskDialog';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  TextField,
  MenuItem,
  Alert,
  CardContent,
  Grid,
  IconButton,
  Menu,
  Chip,
  Tooltip,
  Select,
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShieldIcon from '@mui/icons-material/Security';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { CustomSnackbar, useSnackbar, CircularProgressSx, GlassCard, gradientButtonSx, textFieldSx, MenuActionsSx, ConfirmDialog, SelectSx } from '../../../common';
import { useTranslation } from 'react-i18next';

import {getSecurityRisks,deleteSecurityRisk,} from '../../../api/serverService';

const RootContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

const SecurityRiskRolesPage = () => {
  const { t, i18n } = useTranslation();
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRiskForMenu, setSelectedRiskForMenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const isRtl = typeof i18n?.dir === 'function' ? i18n.dir() === 'rtl' : (i18n?.language || '').toLowerCase().startsWith('ar');

  const fetchRisks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getSecurityRisks();
      // The API returns an array directly, not a paginated object
      setRisks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load security risks.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const openDialog = (risk = null) => {
    setEditingRisk(risk);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRisk(null);
  };

  const handleMenuOpen = (event, risk) => {
    setAnchorEl(event.currentTarget);
    setSelectedRiskForMenu(risk);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRiskForMenu(null);
  };

  const handleEditFromMenu = () => {
    if (selectedRiskForMenu) {
      openDialog(selectedRiskForMenu);
    }
    handleMenuClose();
  };

  const handleDeleteFromMenu = () => {
    if (selectedRiskForMenu) {
      handleDelete(selectedRiskForMenu);
    }
    handleMenuClose();
  };

  const handleDelete = (risk) => {
    setRiskToDelete(risk);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteSecurityRisk(riskToDelete.id);
      showSuccess('Risk deleted successfully!');
      fetchRisks();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message;
      showError(`Failed to delete risk: ${errorMessage}`);
    } finally {
      setDeleteConfirmOpen(false);
      setRiskToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setRiskToDelete(null);
  };

  const filteredRisks = useMemo(() => {
    return risks.filter(risk => {
      const matchesSearch =
        searchTerm === '' ||
        risk.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLevel = levelFilter === 'all' || risk.risk_level === levelFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'enabled' && risk.is_enabled) ||
        (statusFilter === 'disabled' && !risk.is_enabled);

      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [risks, searchTerm, levelFilter, statusFilter]);

  const statItems = [
    { title: t('securityRisks.stats.total'), value: risks.length, icon: <ShieldIcon sx={{ fontSize: 30 }} />, color: 'primary.main' },
    { title: t('securityRisks.stats.enabled'), value: risks.filter((r) => r.is_enabled).length, icon: <CheckCircleOutlineIcon sx={{ fontSize: 30 }} />, color: 'success.main' },
    { title: t('securityRisks.stats.critical'), value: risks.filter((r) => r.risk_level === 'critical').length, icon: <ReportProblemOutlinedIcon sx={{ fontSize: 30 }} />, color: 'error.main' },
  ];

  const getRiskLevelChip = (level) => {
    const style = {
      color: '#fff',
      fontWeight: 'bold',
    };
    switch (level) {
      case 'critical':
        return <Chip label="Critical" size="small" sx={{ ...style, backgroundColor: 'error.main' }} />;
      case 'high':
        return <Chip label="High" size="small" sx={{ ...style, backgroundColor: 'warning.dark' }} />;
      case 'medium':
        return <Chip label="Medium" size="small" sx={{ ...style, backgroundColor: 'warning.light' }} />;
      case 'low':
        return <Chip label="Low" size="small" sx={{ ...style, backgroundColor: 'info.main' }} />;
      default:
        return <Chip label={level} size="small" />;
    }
  };

  return (
    <RootContainer>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          {t('securityRisks.pageTitle')}
        </Typography>
       <Box>
        <Tooltip title={t('securityRisks.refresh')}>
              <IconButton onClick={fetchRisks} sx={{ color: 'white', mr: 1 }}>
              <RefreshIcon />
                </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ml: isRtl ? 1 : 0}}/>}
            onClick={() => openDialog()}
            sx={{
              ...gradientButtonSx
            }}
          >
            {t('securityRisks.addNewRisk')}
          </Button>
       </Box>
      </Box>

      <Grid container spacing={4} sx={{ mb: 4, position: 'relative', zIndex: 2 }}>
                {statItems.map((item, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <GlassCard>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                                {isRtl && React.cloneElement(item.icon, { sx: { fontSize: 48, color: '#fff', opacity: 0.8, ml: 2 } })}
                                <Box sx={{ flexGrow: 1, textAlign: isRtl ? 'right' : 'left' }}>
                                    <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} variant="subtitle2">{item.title}</Typography>
                                    <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>{item.value}</Typography>
                                </Box>
                                {!isRtl && React.cloneElement(item.icon, { sx: { fontSize: 48, color: '#fff', opacity: 0.8 } })}
                            </CardContent>
                        </GlassCard>
                    </Grid>
                ))}
      </Grid>

      <GlassCard>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder={t('securityRisks.filters.searchPlaceholder')}
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                ...textFieldSx
              }}
            />
            <FormControl sx={{...textFieldSx, minWidth: 200}}>
              <InputLabel id="risk-level-label">{t('securityRisks.filters.level')}</InputLabel>
              <Select
                labelId="risk-level-label"
                id="risk-level-select"
                value={levelFilter}
                label={t('securityRisks.filters.level')}
                onChange={(e) => setLevelFilter(e.target.value)}
                MenuProps={{
                  PaperProps: { sx: { ...SelectSx } }
                }}
              >
                <MenuItem value="all">{t('securityRisks.filters.allLevels')}</MenuItem>
                <MenuItem value="critical">{t('securityRiskDialog.critical')}</MenuItem>
                <MenuItem value="high">{t('securityRiskDialog.high')}</MenuItem>
                <MenuItem value="medium">{t('securityRiskDialog.medium')}</MenuItem>
                <MenuItem value="low">{t('securityRiskDialog.low')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{...textFieldSx, minWidth: 200}}>
              <InputLabel id="risk-status-label">{t('securityRisks.filters.status')}</InputLabel>
              <Select
                labelId="risk-status-label"
                id="risk-status-select"
                value={statusFilter}
                label={t('securityRisks.filters.status')}
                onChange={(e) => setStatusFilter(e.target.value)}
                MenuProps={{
                  PaperProps: { sx: { ...SelectSx } }
                }}
              >
                <MenuItem value="all">{t('securityRisks.filters.allStatuses')}</MenuItem>
                <MenuItem value="enabled">{t('securityRisks.table.enabled')}</MenuItem>
                <MenuItem value="disabled">{t('securityRisks.table.disabled')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress sx={CircularProgressSx} /></Box>
          ) : error ? (
            <Alert severity="error" sx={{ background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ background: 'transparent' }}>
              <Table>
              <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)' } }}>
                          {[t('securityRisks.table.title'), t('securityRisks.table.level'), t('securityRisks.table.status'), t('securityRisks.table.actions')].map((headCell, index) => (
                              <TableCell key={headCell} align={index === 3 ? 'right' : 'left'} sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' }}>
                                  {headCell}
                              </TableCell>
                          ))}
                      </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRisks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((risk) => (
                    <TableRow key={risk.id}  sx={{
                      '& .MuiTableCell-root': {
                          color: '#fff',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      },
                      '&:hover': {
                          background: 'rgba(254,107,139,0.08)',
                          transition: 'background 0.2s',
                      }
                        }}>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>{risk.title}</TableCell>
                      <TableCell>{getRiskLevelChip(risk.risk_level)}</TableCell>
                      <TableCell>
                        <Chip label={risk.is_enabled ? t('securityRisks.table.enabled') : t('securityRisks.table.disabled')} size="small" sx={{ color: '#fff', backgroundColor: risk.is_enabled ? 'success.main' : 'action.disabledBackground' }} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={(e) => handleMenuOpen(e, risk)} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                sx={{ color: 'rgba(255, 255, 255, 0.7)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredRisks.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage={t('common.rowsPerPage')}
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
              />
            </TableContainer>
          )}
        </CardContent>
      </GlassCard>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            ...MenuActionsSx
          },
        }}
      >
        <MenuItem 
          onClick={handleEditFromMenu}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('securityRisks.menu.edit')}</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleDeleteFromMenu} 
          sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{t('securityRisks.menu.delete')}</ListItemText>
        </MenuItem>
      </Menu>

      <SecurityRiskDialog
        open={dialogOpen}
        onClose={closeDialog}
        editingRisk={editingRisk}
        onSaveSuccess={() => {
          fetchRisks();
          closeDialog();
        }}
        showSuccess={showSuccess}
        showError={showError}
      />

      <CustomSnackbar
        open={snackbar.open}
        onClose={hideSnackbar}
        severity={snackbar.severity}
        message={snackbar.message}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={t('securityRisks.dialog.deleteTitle')}
        message={t('securityRisks.dialog.deleteMessage', { title: riskToDelete?.title })}
        confirmText={t('securityRisks.dialog.confirm')}
        cancelText={t('securityRisks.dialog.cancel')}
        severity="error"
      />
    </RootContainer>
  );
};

export default SecurityRiskRolesPage;
