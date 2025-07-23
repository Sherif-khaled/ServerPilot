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
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
  Alert,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  Grid,
  IconButton,
  Menu,
  Chip,
  Snackbar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShieldIcon from '@mui/icons-material/Security';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';

import {
  getSecurityRisks,
  createSecurityRisk,
  updateSecurityRisk,
  deleteSecurityRisk,
} from '../../../api/serverService';

const RootContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
}));

const GlassCard = styled(Card)(({ theme }) => ({
  background: 'rgba(38, 50, 56, 0.6)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.125)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
}));

const defaultFormData = {
  title: '',
  description: '',
  risk_level: 'medium',
  check_command: '',
  match_pattern: '',
  fix_command: '',
  is_enabled: true,
  expect_non_zero_exit: false,
  required_role: 'user',
};

const SecurityRiskRolesPage = () => {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRiskForMenu, setSelectedRiskForMenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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
      handleDelete(selectedRiskForMenu.id);
    }
    handleMenuClose();
  };

  

  const handleDelete = async (id) => {
    try {
      await deleteSecurityRisk(id);
      setNotification({ open: true, message: 'Risk deleted successfully!', severity: 'success' });
      fetchRisks();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message;
      setNotification({ open: true, message: `Failed to delete risk: ${errorMessage}`, severity: 'error' });
    }
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
    { title: 'Total Risks', value: risks.length, icon: <ShieldIcon sx={{ fontSize: 30 }} />, color: 'primary.main' },
    { title: 'Risks Enabled', value: risks.filter((r) => r.is_enabled).length, icon: <CheckCircleOutlineIcon sx={{ fontSize: 30 }} />, color: 'success.main' },
    { title: 'Critical Risks', value: risks.filter((r) => r.risk_level === 'critical').length, icon: <ReportProblemOutlinedIcon sx={{ fontSize: 30 }} />, color: 'error.main' },
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
      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          Security Risk Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openDialog()}
          sx={{
            background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
            color: 'white',
            borderRadius: '25px',
            padding: '10px 25px',
          }}
        >
          Add New Risk
        </Button>
      </Box>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        {statItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <GlassCard>
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} variant="subtitle2">{item.title}</Typography>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>{item.value}</Typography>
                </Box>
                {React.cloneElement(item.icon, { sx: { fontSize: 48, color: '#fff', opacity: 0.8 } })}
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
              placeholder="Search Risks..."
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
                  '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
                  color: 'white'
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
              }}
            />
            <TextField
              select
              label="Level"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              sx={{ minWidth: 150, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }, '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.7)' } }}
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </TextField>
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 150, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }, '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.7)' } }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="enabled">Enabled</MenuItem>
              <MenuItem value="disabled">Disabled</MenuItem>
            </TextField>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress sx={{ color: '#fff' }} /></Box>
          ) : error ? (
            <Alert severity="error" sx={{ background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Title</TableCell>
                    <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Level</TableCell>
                    <TableCell sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Status</TableCell>
                    <TableCell align="right" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRisks.map((risk) => (
                    <TableRow key={risk.id} hover sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' } }}>
                      <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>{risk.title}</TableCell>
                      <TableCell>{getRiskLevelChip(risk.risk_level)}</TableCell>
                      <TableCell>
                        <Chip label={risk.is_enabled ? 'Enabled' : 'Disabled'} size="small" sx={{ color: '#fff', backgroundColor: risk.is_enabled ? 'success.main' : 'action.disabledBackground' }} />
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
            background: 'rgba(50, 50, 50, 0.8)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
          },
        }}
      >
        <MenuItem onClick={handleEditFromMenu}><EditIcon sx={{ mr: 1 }} /> Edit</MenuItem>
        <MenuItem onClick={handleDeleteFromMenu} sx={{ color: 'error.main' }}><DeleteIcon sx={{ mr: 1 }} /> Delete</MenuItem>
      </Menu>

      <SecurityRiskDialog
        open={dialogOpen}
        onClose={closeDialog}
        editingRisk={editingRisk}
        onSaveSuccess={() => {
          fetchRisks();
          closeDialog();
        }}
        setNotification={setNotification}
      />
    </RootContainer>
  );
};

export default SecurityRiskRolesPage;
