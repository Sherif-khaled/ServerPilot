import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Typography, Box, FormControl, InputLabel, Select, MenuItem, CircularProgress, Button, ButtonGroup, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Paper, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip, InputAdornment, TablePagination, FormControlLabel, Checkbox, Menu } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Add as AddIcon, AutoFixHigh as AutoFixHighIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { getAllApplications, createApplication, updateApplication, deleteApplication } from '../../../api/applicationService';
import ApplicationForm from '../components/ApplicationForm';

const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(38, 50, 56, 0.6)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    color: '#fff',
}));
const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
    '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
    color: 'white',
    borderRadius: '12px',
  },
  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' },
  '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.7)' }
};

const ApplicationsPage = () => {
  const { customerId } = useParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  const handleMenuOpen = (event, app) => {
    setAnchorEl(event.currentTarget);
    setSelectedApp(app);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedApp(null);
  };

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const apps = await getAllApplications();
        setApplications(apps);
      } catch (err) {
        setError(`Failed to fetch applications: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);


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
        setSnackbar({ open: true, message: 'Application updated successfully!', severity: 'success' });
      } else {
        response = await createApplication(appData);
        setSnackbar({ open: true, message: 'Application created successfully!', severity: 'success' });
      }
      const updatedApps = await getAllApplications();
      setApplications(updatedApps);
      handleCloseDialog();
    } catch (err) {
      setSnackbar({ open: true, message: `Failed to save application: ${err.message}`, severity: 'error' });
    }
  };

  const handleDeleteApplication = async (appId) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
        try {
            await deleteApplication(appId);
            setApplications(prev => prev.filter(app => app.id !== appId));
            setSnackbar({ open: true, message: 'Application deleted successfully!', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: `Failed to delete application: ${err.message}`, severity: 'error' });
        }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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
        <Button variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => handleOpenDialog()}
              sx={{
                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                color: 'white',
                borderRadius: '25px',
                padding: '10px 25px',
            }}>
                  Add Application
              </Button>
      </Box>
      <GlassCard sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <TextField
                variant="outlined"
                fullWidth
                placeholder="Search Applications..."
                sx={{ mb: 3, ...textFieldSx }}
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

        {loading && <CircularProgress />}
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
        }}
      >
        <MenuItem onClick={() => {
          handleOpenDialog(selectedApp);
          handleMenuClose();
        }}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>
        <MenuItem onClick={() => {
          handleDeleteApplication(selectedApp.id);
          handleMenuClose();
        }} sx={{ color: '#f44336' }}><DeleteIcon sx={{ mr: 1 }} /> Delete</MenuItem>
      </Menu>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApplicationsPage;
