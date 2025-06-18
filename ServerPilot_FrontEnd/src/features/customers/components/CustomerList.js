import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Button, Typography, Card, Table, TableBody, TableCell, TableSortLabel,
  TableContainer, TableHead, TableRow, IconButton, CircularProgress,
  Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Tooltip,
  Grid, TextField, InputAdornment, CardContent, Switch, Chip, MenuItem, TablePagination
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
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
import { getCustomers, deleteCustomer, updateCustomerStatus, getCustomerTypes } from '../../../api/customerService';
import { useAuth } from '../../../AuthContext';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [customerTypes, setCustomerTypes] = useState([]);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('company_name');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

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
  }, [customers, searchTerm, typeFilter, statusFilter, yearFilter, monthFilter, order, orderBy]);

  const uniqueYears = useMemo(() => [...new Set(customers.map(c => new Date(c.created_at).getFullYear()))].sort((a, b) => b - a), [customers]);
  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

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
              <Grid
                  size={{
                      xs: 12,
                      sm: 6,
                      md: 3
                  }}>
                  <Card sx={{ display: 'flex', alignItems: 'center', p: 2, boxShadow: 3 }}>
                      <Box sx={{ flexGrow: 1 }}>
                          <Typography color="text.secondary" variant="subtitle2">Total Customers</Typography>
                          <Typography variant="h4" sx={{ color: 'primary.main' }}>{totalCustomers}</Typography>
                      </Box>
                      <PeopleAltOutlinedIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  </Card>
              </Grid>
              <Grid
                  size={{
                      xs: 12,
                      sm: 6,
                      md: 3
                  }}>
                  <Card sx={{ display: 'flex', alignItems: 'center', p: 2, boxShadow: 3 }}>
                      <Box sx={{ flexGrow: 1 }}>
                          <Typography color="text.secondary" variant="subtitle2">Active Customers</Typography>
                          <Typography variant="h4" sx={{ color: 'success.main' }}>{activeCustomers}</Typography>
                      </Box>
                      <CheckCircleOutlineIcon sx={{ fontSize: 40, color: 'success.main' }} />
                  </Card>
              </Grid>
              <Grid
                  size={{
                      xs: 12,
                      sm: 6,
                      md: 3
                  }}>
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
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid size={12}>
                          <TextField
                              fullWidth
                              label="Search Customers"
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
                      </Grid>
                      <Grid
                          size={{
                              xs: 12,
                              sm: 6,
                              md: 3
                          }}>
                          <TextField select fullWidth label="Customer Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                              <MenuItem value="all">All Types</MenuItem>
                              {customerTypes.map(type => (
                                  <MenuItem key={type.id} value={type.name}>{type.name}</MenuItem>
                              ))}
                          </TextField>
                      </Grid>
                      <Grid
                          size={{
                              xs: 12,
                              sm: 6,
                              md: 3
                          }}>
                          <TextField select fullWidth label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                              <MenuItem value="all">All Statuses</MenuItem>
                              <MenuItem value="true">Active</MenuItem>
                              <MenuItem value="false">Inactive</MenuItem>
                          </TextField>
                      </Grid>
                      <Grid
                          size={{
                              xs: 12,
                              sm: 6,
                              md: 3
                          }}>
                          <TextField select fullWidth label="Year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                              <MenuItem value="all">All Years</MenuItem>
                              {uniqueYears.map(year => (
                                  <MenuItem key={year} value={year}>{year}</MenuItem>
                              ))}
                          </TextField>
                      </Grid>
                      <Grid
                          size={{
                              xs: 12,
                              sm: 6,
                              md: 3
                          }}>
                          <TextField select fullWidth label="Month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                              <MenuItem value="all">All Months</MenuItem>
                              {months.map(month => (
                                  <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                              ))}
                          </TextField>
                      </Grid>
                  </Grid>
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
                          <TableHead sx={{ backgroundColor: 'action.hover' }}>
                              <TableRow>
                                  <TableCell 
                                    sortDirection={orderBy === 'first_name' ? order : false}
                                    onClick={(e) => handleRequestSort(e, 'first_name')}
                                    sx={{ cursor: 'pointer' }}
                                  >
                                    <TableSortLabel
                                      active={orderBy === 'first_name'}
                                      direction={orderBy === 'first_name' ? order : 'asc'}
                                    >
                                      Name
                                      {orderBy === 'first_name' ? (
                                        <Box component="span" sx={visuallyHidden}>
                                          {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                        </Box>
                                      ) : null}
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell 
                                    sortDirection={orderBy === 'email' ? order : false}
                                    onClick={(e) => handleRequestSort(e, 'email')}
                                    sx={{ cursor: 'pointer' }}
                                  >
                                    <TableSortLabel
                                      active={orderBy === 'email'}
                                      direction={orderBy === 'email' ? order : 'asc'}
                                    >
                                      Email
                                      {orderBy === 'email' ? (
                                        <Box component="span" sx={visuallyHidden}>
                                          {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                        </Box>
                                      ) : null}
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell 
                                    sortDirection={orderBy === 'company_name' ? order : false}
                                    onClick={(e) => handleRequestSort(e, 'company_name')}
                                    sx={{ cursor: 'pointer' }}
                                  >
                                    <TableSortLabel
                                      active={orderBy === 'company_name'}
                                      direction={orderBy === 'company_name' ? order : 'asc'}
                                    >
                                      Company
                                      {orderBy === 'company_name' ? (
                                        <Box component="span" sx={visuallyHidden}>
                                          {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                        </Box>
                                      ) : null}
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell>Phone</TableCell>
                                  <TableCell 
                                    sortDirection={orderBy === 'is_active' ? order : false}
                                    onClick={(e) => handleRequestSort(e, 'is_active')}
                                    sx={{ cursor: 'pointer' }}
                                  >
                                    <TableSortLabel
                                      active={orderBy === 'is_active'}
                                      direction={orderBy === 'is_active' ? order : 'asc'}
                                    >
                                      Status
                                      {orderBy === 'is_active' ? (
                                        <Box component="span" sx={visuallyHidden}>
                                          {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                        </Box>
                                      ) : null}
                                    </TableSortLabel>
                                  </TableCell>
                                  <TableCell align="right">Actions</TableCell>
                              </TableRow>
                          </TableHead>
                          <TableBody>
                              {filteredCustomers
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((customer) => (
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
                      <TablePagination
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
