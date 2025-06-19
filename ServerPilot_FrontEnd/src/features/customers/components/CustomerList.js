import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Button, Typography, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, CircularProgress,
  Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Tooltip,
  Grid, TextField, InputAdornment, CardContent, Chip, TablePagination, Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Dns as DnsIcon, // Servers icon
  PeopleAltOutlined as PeopleAltOutlinedIcon, // Total customers icon
  CheckCircleOutline as CheckCircleOutlineIcon, // Active customers icon
  HighlightOffOutlined as HighlightOffOutlinedIcon // Inactive customers icon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getCustomers, deleteCustomer, getCustomerTypes } from '../../../api/customerService';
import { useAuth } from '../../../AuthContext';

// Styled root component for the background
const RootContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
}));

// Glassmorphism Card
const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(38, 50, 56, 0.6)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
}));

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, ] = useState('all');
  const [statusFilter, ] = useState('all');
  const [yearFilter, ] = useState('all');
  const [monthFilter, ] = useState('all');
  const [, setCustomerTypes] = useState([]);
  const [order, ] = useState('asc');
  const [orderBy, ] = useState('company_name');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);


  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  };

  const getComparator = useCallback((order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }, []);

  const stableSort = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchCustomerTypes = async () => {
        try {
            const response = await getCustomerTypes();
            setCustomerTypes(response.data || []);
        } catch (error) {
            console.error('Failed to fetch customer types:', error);
        }
    };
    fetchCustomerTypes();
  }, []);

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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredCustomers = useMemo(() => {
    const filtered = customers.filter(customer => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = (
        customer.company_name.toLowerCase().includes(searchTermLower) ||
        customer.email.toLowerCase().includes(searchTermLower) ||
        (customer.first_name && customer.first_name.toLowerCase().includes(searchTermLower)) ||
        (customer.last_name && customer.last_name.toLowerCase().includes(searchTermLower)) ||
        (customer.phone_number && customer.phone_number.includes(searchTerm))
      );

      const matchesType = typeFilter === 'all' || customer.customer_type_name === typeFilter;
      const matchesStatus = statusFilter === 'all' || String(customer.is_active) === statusFilter;
      
      const createdAt = new Date(customer.created_at);
      const matchesYear = yearFilter === 'all' || createdAt.getFullYear() === parseInt(yearFilter);
      const matchesMonth = monthFilter === 'all' || (createdAt.getMonth() + 1) === parseInt(monthFilter);

      return matchesSearch && matchesType && matchesStatus && matchesYear && matchesMonth;
    });

    return stableSort(filtered, getComparator(order, orderBy));
  }, [customers, searchTerm, typeFilter, statusFilter, yearFilter, monthFilter, order, orderBy, getComparator]);


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


  if (!user) {
    return <Typography>Please log in to manage customers.</Typography>;
  }

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.is_active).length;
  const inactiveCustomers = totalCustomers - activeCustomers;

  return (
      <RootContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  Customer Management
              </Typography>
              <Box>
                  <Tooltip title="Refresh Customers">
                      <IconButton onClick={fetchCustomers} sx={{ color: 'white', mr: 1 }}>
                          <RefreshIcon />
                      </IconButton>
                  </Tooltip>
                  <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/customers/new')}
                      sx={{
                          background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                          boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                          color: 'white',
                          borderRadius: '25px',
                          padding: '10px 25px',
                      }}
                  >
                      Add Customer
                  </Button>
              </Box>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2, background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>}
          <Grid container spacing={4} sx={{ mb: 4, position: 'relative', zIndex: 2 }}>
              <Grid item xs={12} sm={4}>
                  <GlassCard>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                          <Box sx={{ flexGrow: 1 }}>
                              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} variant="subtitle2">Total Customers</Typography>
                              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>{totalCustomers}</Typography>
                          </Box>
                          <PeopleAltOutlinedIcon sx={{ fontSize: 48, color: '#fff', opacity: 0.8 }} />
                      </CardContent>
                  </GlassCard>
              </Grid>
              <Grid item xs={12} sm={4}>
                  <GlassCard>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                          <Box sx={{ flexGrow: 1 }}>
                              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} variant="subtitle2">Active Customers</Typography>
                              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>{activeCustomers}</Typography>
                          </Box>
                          <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#66bb6a', opacity: 0.8 }} />
                      </CardContent>
                  </GlassCard>
              </Grid>
              <Grid item xs={12} sm={4}>
                  <GlassCard>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                          <Box sx={{ flexGrow: 1 }}>
                              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }} variant="subtitle2">Inactive Customers</Typography>
                              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>{inactiveCustomers}</Typography>
                          </Box>
                          <HighlightOffOutlinedIcon sx={{ fontSize: 48, color: '#f44336', opacity: 0.8 }} />
                      </CardContent>
                  </GlassCard>
              </Grid>
          </Grid>
          <GlassCard sx={{ position: 'relative', zIndex: 2 }}>
              <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12}>
                          <TextField
                              fullWidth
                              label="Search Customers"
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
                                  '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' }
                              }}
                              InputProps={{
                                  startAdornment: (
                                      <InputAdornment position="start">
                                          <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                                      </InputAdornment>
                                  ),
                              }}
                          />
                      </Grid>
                      {/* Filters with updated styling */}
                  </Grid>
              </CardContent>

              {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                      <CircularProgress sx={{ color: '#FE6B8B' }} />
                  </Box>
              ) : !error && filteredCustomers.length === 0 ? (
                  <Typography sx={{ textAlign: 'center', p: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
                      {customers.length === 0 ? "You haven't added any customers yet." : "No customers found matching your criteria."}
                  </Typography>
              ) : (
                  <TableContainer component={Paper} sx={{ background: 'transparent' }}>
                      <Table stickyHeader aria-label="customers table">
                          <TableHead>
                              <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)' } }}>
                                  {['Name', 'Email', 'Company', 'Phone', 'Status', 'Actions'].map((headCell, index) => (
                                      <TableCell key={headCell} align={index === 5 ? 'right' : 'left'} sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold' }}>
                                          {headCell}
                                      </TableCell>
                                  ))}
                              </TableRow>
                          </TableHead>
                          <TableBody>
                              {filteredCustomers
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((customer) => (
                                  <TableRow key={customer.id} sx={{
                                      '&:hover': {
                                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                      },
                                      '& .MuiTableCell-root': {
                                          color: '#fff',
                                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                      },
                                      '&:hover .MuiTableCell-root': {
                                          color: '#FE6B8B',
                                      }
                                  }}>
                                      <TableCell>{customer.company_name || `${customer.first_name} ${customer.last_name}`}</TableCell>
                                      <TableCell>{customer.email}</TableCell>
                                      <TableCell>{customer.company_name || 'N/A'}</TableCell>
                                      <TableCell>{customer.phone_number || 'N/A'}</TableCell>
                                      <TableCell>
                                          <Chip
                                              label={customer.is_active ? 'Active' : 'Inactive'}
                                              color={customer.is_active ? 'success' : 'error'}
                                              size="small"
                                              variant="outlined"
                                              sx={{
                                                  borderColor: customer.is_active ? 'rgba(102, 187, 106, 0.7)' : 'rgba(244, 67, 54, 0.7)',
                                                  color: customer.is_active ? '#66bb6a' : '#f44336',
                                                  '.MuiChip-icon': { color: 'inherit' }
                                              }}
                                          />
                                      </TableCell>
                                      <TableCell align="right">
                                          <Tooltip title="Manage Servers">
                                              <IconButton onClick={() => navigate(`/customers/${customer.id}/servers`)} size="small" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                  <DnsIcon />
                                              </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Edit Customer">
                                              <IconButton onClick={() => handleEditCustomer(customer.id)} size="small" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                                  <EditIcon />
                                              </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Delete Customer">
                                              <IconButton onClick={() => openDeleteDialog(customer)} size="small" sx={{ color: '#f44336' }}>
                                                  <DeleteIcon />
                                              </IconButton>
                                          </Tooltip>
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                      <TablePagination
                          sx={{ color: 'rgba(255, 255, 255, 0.7)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
                          rowsPerPageOptions={[5, 10, 25]}
                          component="div"
                          count={filteredCustomers.length}
                          rowsPerPage={rowsPerPage}
                          page={page}
                          onPageChange={handleChangePage}
                          onRowsPerPageChange={handleChangeRowsPerPage}
                      />
                  </TableContainer>
              )}
          </GlassCard>
          <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} PaperProps={{ sx: { background: 'rgba(30, 40, 57, 0.9)', color: '#fff', backdropFilter: 'blur(5px)' } }}>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogContent>
                  <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      Are you sure you want to delete this customer? This action cannot be undone.
                  </DialogContentText>
              </DialogContent>
              <DialogActions>
                  <Button onClick={closeDeleteDialog} sx={{ color: '#fff' }}>Cancel</Button>
                  <Button onClick={handleDeleteCustomer} color="error" autoFocus>
                      Delete
                  </Button>
              </DialogActions>
          </Dialog>
      </RootContainer>
  );
}
