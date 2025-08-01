import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Typography, Box, FormControl, InputLabel, Select, MenuItem, CircularProgress, Button, ButtonGroup, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Paper, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip, InputAdornment, TablePagination, FormControlLabel, Checkbox, Menu } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Add as AddIcon, AutoFixHigh as AutoFixHighIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { getAllApplications, createApplication, updateApplication, deleteApplication } from '../../../api/applicationService';
import api from '../../../api/axiosConfig';

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

const ApplicationForm = ({ open, handleClose, application, onSave }) => {
  const [appName, setAppName] = useState('');
  const [description, setDescription] = useState('');
  const [checkCommand, setCheckCommand] = useState('');
  const [version, setVersion] = useState('');
  const [icon, setIcon] = useState('');
  const [detectVersion, setDetectVersion] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (application) {
      setAppName(application.name || '');
      setDescription(application.description || '');
      setCheckCommand(application.check_command || '');
      setVersion(application.version || '');
      setIcon(application.icon || '');
      setDetectVersion(application.detect_version !== undefined ? application.detect_version : true);
    } else {
      setAppName('');
      setDescription('');
      setCheckCommand('');
      setVersion('');
      setIcon('');
      setDetectVersion(true);
    }
    setValidationError('');
  }, [application, open]);

  const handleSave = () => {
    if (detectVersion && checkCommand && !checkCommand.includes('command -v')) {
      setValidationError("The 'Detect Version' option only works with the 'command -v' command.");
      return;
    }

    const appData = {
      name: appName,
      description: description,
      check_command: checkCommand,
      version: detectVersion ? '' : version,
      icon: icon,
      detect_version: detectVersion,
    };
    onSave(appData, application ? application.id : null);
  };

  const handleGenerateInfo = async () => {
    if (!appName) {
      setValidationError('Please enter an application name first.');
      return;
    }
    setIsGenerating(true);
    setValidationError('');
    try {
      const response = await api.post('/ai/generate-app-info/', { app_name: appName });
      if (response.data) {
        setDescription(response.data.description || '');
        setIcon(response.data.icon_url || '');
      }
    } catch (error) {
      console.error('Failed to generate app info:', error);
      setValidationError('Failed to generate AI content. Please check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{application ? 'Edit Application' : 'Add Application'}</DialogTitle>
      <DialogContent>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
          <TextField
            label="Application Name"
            fullWidth
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            sx={{ mb: 3, ...textFieldSx }}
            helperText="Use Technical Name of the Application e.g., 'nginx' or 'node'"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Generate Description and Icon with AI">
                    <IconButton onClick={handleGenerateInfo} disabled={isGenerating} edge="end">
                      {isGenerating ? <CircularProgress size={24} /> : <AutoFixHighIcon />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 3, ...textFieldSx }}
            helperText="A brief description of the application"
          />
          <TextField
            label="Icon URL"
            fullWidth
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            sx={{ mb: 3, ...textFieldSx }}
            helperText="URL for the application's icon"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={detectVersion}
                onChange={(e) => setDetectVersion(e.target.checked)}
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-checked': {
                    color: '#FE6B8B',
                    '& .MuiSvgIcon-root': {
                      border: '2px solid #FE6B8B',
                      borderRadius: '3px',
                    }
                  },
                  '&.Mui-checked:hover': {
                    backgroundColor: 'rgba(254, 107, 139, 0.1)',
                  },
                  '& .MuiSvgIcon-root': {
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '3px',
                  }
                }} 
              />
            }
            label="Detect Application Version"
          />
          {!detectVersion && (
            <TextField
              label="Version"
              fullWidth
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              sx={{ mt: 2, mb: 3, ...textFieldSx }}
            />
          )}
          <TextField
            label="Check Command"
            fullWidth
            value={checkCommand}
            onChange={(e) => setCheckCommand(e.target.value)}
            sx={{ mb: 3, ...textFieldSx }}
            error={!!validationError}
            helperText={validationError || "e.g., 'command -v node' or 'systemctl status nginx'"}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose}
          variant="outlined"
          color="error"
          disabled={isGenerating}
          sx={{ flex: 1, borderRadius: 25, p: '10px 25px' }}
          >Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={isGenerating}
          sx={{
            flex: 1,
            background: 'linear-gradient(45deg,#FE6B8B 30%,#FF8E53 90%)',
            boxShadow: '0 3px 5px 2px rgba(255,105,135,.3)',
            borderRadius: 25,
            p: '10px 25px',
          }}
          >Save</Button>
      </DialogActions>
    </Dialog>
  );
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
      <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>Applications Management</Typography>
      
      <GlassCard sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <TextField
                variant="outlined"
                size="small"
                placeholder="Search Applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                        </InputAdornment>
                    ),
                    sx: { 
                        color: 'white', 
                        background: 'rgba(255, 255, 255, 0.1)',
                        '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    }
                }}
            />
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

        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && (
            <TableContainer component={Paper} sx={{ background: 'transparent', boxShadow: 'none' }}>
                <Table>
                    <TableHead>
                        <TableRow>
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
                            <TableRow key={app.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
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
