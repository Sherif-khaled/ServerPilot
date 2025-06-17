import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Button, Typography, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, CircularProgress,
  Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Tooltip,
  Grid, TextField, InputAdornment, CardContent, Switch, Chip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Refresh as RefreshIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Dns as DnsIcon, // Servers icon
  PeopleAltOutlined as PeopleAltOutlinedIcon, // Total customers icon
  CheckCircleOutline as CheckCircleOutlineIcon, // Active customers icon
  HighlightOffOutlined as HighlightOffOutlinedIcon // Inactive customers icon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getCustomers, deleteCustomer, updateCustomerStatus } from '../../../api/customerService';
import { useAuth } from '../../../AuthContext';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const response = await getCustomers();
      setCustomers(response.data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError('Failed to load customers. Please try again.');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
        const searchTermLower = searchTerm.toLowerCase();
        const name = customer.company_name || `${customer.first_name} ${customer.last_name}`;
        const email = customer.email || '';
        const company = customer.company_name || '';
        const phone = customer.phone_number || '';

        return searchTerm === '' ||
            name.toLowerCase().includes(searchTermLower) ||
            email.toLowerCase().includes(searchTermLower) ||
            company.toLowerCase().includes(searchTermLower) ||
            phone.toLowerCase().includes(searchTermLower);
    });
  }, [customers, searchTerm]);

  const handleEditCustomer = (customerId) => {
    navigate(`/customers/${customerId}/edit`);
  };

  const openDeleteDialog = (customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setCustomerToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      await deleteCustomer(customerToDelete.id);
      setCustomers(customers.filter(c => c.id !== customerToDelete.id));
      closeDeleteDialog();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      setError('Failed to delete customer.');
    }
  };

  const handleStatusToggle = async (customerId, currentStatus) => {
    const originalCustomers = [...customers];
    const newStatus = !currentStatus;

    // Optimistically update the UI
    setCustomers(prevCustomers =>
      prevCustomers.map(c => (c.id === customerId ? { ...c, is_active: newStatus } : c))
    );

    try {
      await updateCustomerStatus(customerId, newStatus);
      setStatusUpdateError(''); // Clear previous errors on success
    } catch (err) {
      // Revert the UI change on error
      setCustomers(originalCustomers);
      setStatusUpdateError(`Failed to update status for customer ${customerId}. Please try again.`);
    }
  };

  if (!user) {
    return <Typography>Please log in to manage customers.</Typography>;
  }

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.is_active).length;
  const inactiveCustomers = totalCustomers - activeCustomers;

  return (
    <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Customer Management
            </Typography>
            <Box>
                <Tooltip title="Refresh Customers">
                    <IconButton onClick={fetchCustomers} color="primary" sx={{ mr: 1 }}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/customers/new')}
                >
                    Add Customer
                </Button>
            </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ display: 'flex', alignItems: 'center', p: 2, boxShadow: 3 }}>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography color="text.secondary" variant="subtitle2">Total Customers</Typography>
                        <Typography variant="h4" sx={{ color: 'primary.main' }}>{totalCustomers}</Typography>
                    </Box>
                    <PeopleAltOutlinedIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ display: 'flex', alignItems: 'center', p: 2, boxShadow: 3 }}>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography color="text.secondary" variant="subtitle2">Active Customers</Typography>
                        <Typography variant="h4" sx={{ color: 'success.main' }}>{activeCustomers}</Typography>
                    </Box>
                    <CheckCircleOutlineIcon sx={{ fontSize: 40, color: 'success.main' }} />
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ display: 'flex', alignItems: 'center', p: 2, boxShadow: 3 }}>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography color="text.secondary" variant="subtitle2">Inactive Customers</Typography>
                        <Typography variant="h4" sx={{ color: 'error.main' }}>{inactiveCustomers}</Typography>
                    </Box>
                    <HighlightOffOutlinedIcon sx={{ fontSize: 40, color: 'error.main' }} />
                </Card>
            </Grid>
        </Grid>

        <Card sx={{ boxShadow: 3 }}>
            <CardContent>
                <TextField
                    fullWidth
                    label="Search Customers by name, email, company, or phone"
                    variant="outlined"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </CardContent>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                    <CircularProgress />
                </Box>
            ) : !error && filteredCustomers.length === 0 ? (
                <Typography sx={{ textAlign: 'center', p: 3 }}>
                    {customers.length === 0 ? "You haven't added any customers yet." : "No customers found matching your criteria."}
                </Typography>
            ) : (
                <TableContainer>
                    <Table stickyHeader aria-label="customers table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Company</TableCell>
                                <TableCell>Phone</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCustomers.map((customer) => (
                                <TableRow hover key={customer.id}>
                                    <TableCell>{customer.company_name || `${customer.first_name} ${customer.last_name}`}</TableCell>
                                    <TableCell>{customer.email}</TableCell>
                                    <TableCell>{customer.company_name || 'N/A'}</TableCell>
                                    <TableCell>{customer.phone_number || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Switch
                                                checked={customer.is_active}
                                                onChange={() => handleStatusToggle(customer.id, customer.is_active)}
                                                color="success"
                                            />
                                            <Chip 
                                                label={customer.is_active ? 'Active' : 'Inactive'} 
                                                color={customer.is_active ? 'success' : 'error'} 
                                                size="small" 
                                                variant="outlined"
                                            />
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Manage Servers">
                                            <IconButton onClick={() => navigate(`/customers/${customer.id}/servers`)} size="small" color="primary">
                                                <DnsIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Edit Customer">
                                            <IconButton onClick={() => handleEditCustomer(customer.id)} size="small">
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete Customer">
                                            <IconButton onClick={() => openDeleteDialog(customer)} size="small" color="error">
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Card>

        <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Are you sure you want to delete this customer? This action cannot be undone.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={closeDeleteDialog}>Cancel</Button>
                <Button onClick={handleDeleteCustomer} color="error" autoFocus>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    </Box>
  );
}
