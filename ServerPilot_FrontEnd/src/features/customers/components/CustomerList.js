import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Typography, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, CircularProgress,
  Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Tooltip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Dns as DnsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getCustomers, deleteCustomer } from '../../../api/customerService';
import { useAuth } from '../../../AuthContext';


export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  


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
      setError(`Failed to delete customer. Please try again.`);
      closeDeleteDialog();
    }
  };

  if (!user) {
    return <Typography>Please log in to manage customers.</Typography>;
  }

  return (
    <Card sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          My Customers
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

      {loading && <CircularProgress sx={{ alignSelf: 'center', my: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && customers.length === 0 && (
        <Typography sx={{ textAlign: 'center', my: 2 }}>
          You haven't added any customers yet.
        </Typography>
      )}

      {!loading && !error && customers.length > 0 && (
        <TableContainer>
          <Table stickyHeader aria-label="customers table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer) => (
                <TableRow hover key={customer.id}>
                  <TableCell>{customer.company_name || `${customer.first_name} ${customer.last_name}`}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.company_name || 'N/A'}</TableCell>
                  <TableCell>{customer.phone_number || 'N/A'}</TableCell>
                  <TableCell>{customer.customer_type_name || 'N/A'}</TableCell>
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
    </Card>
  );
}
