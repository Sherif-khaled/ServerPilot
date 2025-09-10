import React, { useState, useEffect, useCallback } from 'react';
// import { useParams } from 'react-router-dom';
import { Avatar, Typography, Box, MenuItem,ListItemText,ListItemIcon, CircularProgress, Button, Alert, Paper, Table, TableBody,Tooltip,
   TableCell, TableContainer, TableHead, TableRow, IconButton, InputAdornment, TablePagination, Menu, TextField } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Add as AddIcon, MoreVert as MoreVertIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { getAllApplications, createApplication, updateApplication, deleteApplication } from '../../../api/applicationService';
import ApplicationForm from '../components/ApplicationForm';
import { CustomSnackbar, useSnackbar, CircularProgressSx, GlassCard, gradientButtonSx, textFieldSx, MenuActionsSx, ConfirmDialog } from '../../../common';
import { useTranslation } from 'react-i18next';


const ApplicationsPage = () => {
  // const { customerId } = useParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
  const { t, i18n } = useTranslation();
  const isRtl = typeof i18n?.dir === 'function' ? i18n.dir() === 'rtl' : (i18n?.language || '').toLowerCase().startsWith('ar');

  const handleMenuOpen = (event, app) => {
    setAnchorEl(event.currentTarget);
    setSelectedApp(app);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedApp(null);
  };

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const apps = await getAllApplications();
      setApplications(apps);
      setError(null);
    } catch (err) {
      setError(t('forgotPassword.genericError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);


  const handleOpenDialog = (app = null) => {
    setEditingApp(app);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingApp(null);
  };

  const handleSaveApplication = async (appData, appId) => {
    try {
      if (appId) {
        await updateApplication(appId, appData);
        showSuccess(t('applicationForm.update'));
      } else {
        await createApplication(appData);
        showSuccess(t('applicationForm.create'));
      }
      const updatedApps = await getAllApplications();
      setApplications(updatedApps);
      handleCloseDialog();
    } catch (err) {
      showError(t('forgotPassword.genericError'));
    }
  };

  const handleDeleteApplication = (app) => {
    setAppToDelete(app);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteApplication(appToDelete.id);
      setApplications(prev => prev.filter(app => app.id !== appToDelete.id));
      showSuccess(t('applications.confirm'));
    } catch (err) {
      showError(t('forgotPassword.genericError'));
    } finally {
      setDeleteConfirmOpen(false);
      setAppToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setAppToDelete(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredApplications = applications.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <ApplicationForm
        open={dialogOpen}
        handleClose={handleCloseDialog}
        application={editingApp}
        onSave={handleSaveApplication}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
        <Typography variant="h3" component="h1" sx={{p: 3, fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{t('applications.management')}</Typography>
        <Box>
          <Tooltip title={t('applications.refresh')}>
              <IconButton onClick={fetchApplications} sx={{ color: 'white', mr: 1 }}>
              <RefreshIcon />
              </IconButton>
          </Tooltip>
          <Button variant="contained" 
                startIcon={<AddIcon sx={{ml: isRtl ? 1 : 0}} />} 
                onClick={() => handleOpenDialog()}
                sx={{
                ...gradientButtonSx
              }}>
                    {t('applications.add')}
          </Button>
        </Box>
      </Box>
      <GlassCard sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <TextField
                fullWidth
                placeholder={t('applications.searchPlaceholder')}
                sx={{...textFieldSx }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
               InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                        </InputAdornment>
                    ),
                }}
            />

        </Box>

        {loading && <CircularProgress size={20} sx={CircularProgressSx}/>}
        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && (
            <TableContainer component={Paper} sx={{ background: 'transparent' }}>
                <Table>
                  <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)' } }}>
                          {[t('applications.headers.icon'), t('applications.headers.name'), t('applications.headers.description'), t('applications.headers.version'), t('applications.headers.checkCommand'), t('applications.headers.actions')].map((headCell, index) => (
                              <TableCell key={headCell} align={index === 5 ? 'right' : 'left'} sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' }}>
                                  {headCell}
                              </TableCell>
                          ))}
                      </TableRow>
                  </TableHead>
 
                    <TableBody>
                        {filteredApplications.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(app => (
                            <TableRow 
                            key={app.id} 
                            sx={{
                              '& .MuiTableCell-root': {
                                  color: '#fff',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                              },
                              '&:hover': {
                                  background: 'rgba(254,107,139,0.08)',
                                  transition: 'background 0.2s',
                              }
                                }}>   
                                <TableCell sx={{ color: 'white' }}>
                                    <Avatar src={app.icon} alt={app.name} sx={{ width: 32, height: 32 }}>
                                        {app.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                </TableCell>
                                <TableCell sx={{ color: 'white' }}>{app.name}</TableCell>
                                <TableCell sx={{ color: 'white' }}>{app.description}</TableCell>
                                <TableCell sx={{ color: 'white' }}>{app.version}</TableCell>
                                <TableCell sx={{ color: 'white' }}>{app.check_command}</TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        aria-label="actions"
                                        aria-controls={`actions-menu-${app.id}`}
                                        aria-haspopup="true"
                                        onClick={(event) => handleMenuOpen(event, app)}
                                    >
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
                    count={filteredApplications.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage={t('common.rowsPerPage')}
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
                />
            </TableContainer>
        )}
      </GlassCard>

      <ApplicationForm 
        open={dialogOpen} 
        handleClose={handleCloseDialog} 
        application={editingApp} 
        onSave={handleSaveApplication} 
      />

      <Menu
        id="actions-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            ...MenuActionsSx
          }
        }}
      >

        <MenuItem onClick={() => {
          handleOpenDialog(selectedApp);handleOpenDialog(selectedApp);
          handleMenuClose();
        }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t('applications.edit')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleDeleteApplication(selectedApp);
          handleMenuClose();
        }} sx={{ color: '#f44336' }}>
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t('applications.delete')}</ListItemText>
        </MenuItem>
      </Menu>

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
        title={t('applications.confirmDeleteTitle')}
        message={t('applications.confirmDeleteMessage', { name: appToDelete?.name || '' })}
        confirmText={t('applications.confirm')}
        cancelText={t('applications.cancel')}
        severity="error"
      />
    </Box>
  );
};

export default ApplicationsPage;
