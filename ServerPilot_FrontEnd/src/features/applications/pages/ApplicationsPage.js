import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Typography, Box, MenuItem, CircularProgress, Button, Alert, Paper, Table, TableBody,Tooltip,
   TableCell, TableContainer, TableHead, TableRow, IconButton, InputAdornment, TablePagination, Menu, TextField } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Add as AddIcon, MoreVert as MoreVertIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { getAllApplications, createApplication, updateApplication, deleteApplication } from '../../../api/applicationService';
import ApplicationForm from '../components/ApplicationForm';
import { CustomSnackbar, useSnackbar, CircularProgressSx, GlassCard, gradientButtonSx, textFieldSx, MenuActionsSx, ConfirmDialog } from '../../../common';


const ApplicationsPage = () => {
  const { customerId } = useParams();
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
      setError(`Failed to fetch applications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

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
      let response;
      if (appId) {
        response = await updateApplication(appId, appData);
        showSuccess('Application updated successfully!');
      } else {
        response = await createApplication(appData);
        showSuccess('Application created successfully!');
      }
      const updatedApps = await getAllApplications();
      setApplications(updatedApps);
      handleCloseDialog();
    } catch (err) {
      showError(`Failed to save application: ${err.message}`);
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
      showSuccess('Application deleted successfully!');
    } catch (err) {
      showError(`Failed to delete application: ${err.message}`);
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
        <Typography variant="h3" component="h1" sx={{p: 3, fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>Applications Management</Typography>
        <Box>
          <Tooltip title="Refresh Applications">
              <IconButton onClick={fetchApplications} sx={{ color: 'white', mr: 1 }}>
              <RefreshIcon />
              </IconButton>
          </Tooltip>
          <Button variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => handleOpenDialog()}
                sx={{
                ...gradientButtonSx
              }}>
                    Add Application
          </Button>
        </Box>
      </Box>
      <GlassCard sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <TextField
                fullWidth
                placeholder="Search Applications..."
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

        {loading && <CircularProgress  sx={CircularProgressSx}/>}
        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && (
            <TableContainer component={Paper} sx={{ background: 'transparent' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)' } }}>
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Icon</TableCell>
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Name</TableCell>
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Description</TableCell>
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Version</TableCell>
                            <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Check Command</TableCell>
                            <TableCell align="right" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Actions</TableCell>
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
                                  background: 'rgba(254,107,139,0.08)', // subtle glassy pink
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
          handleOpenDialog(selectedApp);
          handleMenuClose();
        }}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>
        <MenuItem onClick={() => {
          handleDeleteApplication(selectedApp);
          handleMenuClose();
        }} sx={{ color: '#f44336' }}><DeleteIcon sx={{ mr: 1 }} /> Delete</MenuItem>
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
        title="Delete Application"
        message={`Are you sure you want to delete "${appToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
      />
    </Box>
  );
};

export default ApplicationsPage;
