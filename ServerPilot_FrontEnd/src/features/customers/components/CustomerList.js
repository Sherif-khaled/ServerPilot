import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {Box, Button, Typography, Table, TableBody, TableCell,TableContainer, TableHead, TableRow, IconButton, CircularProgress,
  Alert, Tooltip,Grid, TextField, InputAdornment, CardContent, Chip, TablePagination, Paper} from '@mui/material';
import { styled } from '@mui/material/styles';
import {Add as AddIcon,Refresh as RefreshIcon,Edit as EditIcon,Delete as DeleteIcon,Search as SearchIcon,Dns as DnsIcon, // Servers icon
  PeopleAltOutlined as PeopleAltOutlinedIcon, CheckCircleOutline as CheckCircleOutlineIcon, HighlightOffOutlined as HighlightOffOutlinedIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getCustomers, deleteCustomer, getCustomerTypes } from '../../../api/customerService';
import { useAuth } from '../../../AuthContext';
import CustomerForm from './CustomerForm';
import { CustomSnackbar, useSnackbar, gradientButtonSx, textFieldSx, CircularProgressSx, ConfirmDialog, GlassCard } from '../../../common';
import { useTranslation } from 'react-i18next';

// Styled root component for the background
const RootContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
}));

// Using shared GlassCard from common

export default function CustomerList() {
  const { t, i18n } = useTranslation();
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
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  
  // Use the custom snackbar hook
  const { snackbar, showSuccess, hideSnackbar } = useSnackbar();

  const isRtl = typeof i18n?.dir === 'function' ? i18n.dir() === 'rtl' : (i18n?.language || '').toLowerCase().startsWith('ar');

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
      setError(t('forgotPassword.genericError'));
    }
    setLoading(false);
  }, [user, t]);

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

  const handleAddCustomer = () => {
    setEditingCustomerId(null);
    setCustomerFormOpen(true);
  };

  const handleEditCustomer = (customerId) => {
    setEditingCustomerId(customerId);
    setCustomerFormOpen(true);
  };

  const handleCustomerFormClose = () => {
    setCustomerFormOpen(false);
    setEditingCustomerId(null);
  };

  const handleCustomerFormSuccess = (message) => {
    fetchCustomers();
    handleCustomerFormClose();
    if (message) {
      showSuccess(message);
    }
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
    return <Typography>{t('auth.login')}</Typography>;
  }

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.is_active).length;
  const inactiveCustomers = totalCustomers - activeCustomers;

  const statItems = [
    { title: t('customers.metrics.total'), value: totalCustomers, icon: <PeopleAltOutlinedIcon sx={{ fontSize: 30 }} />, color: 'primary.main' },
    { title: t('customers.metrics.active'), value: activeCustomers, icon: <CheckCircleOutlineIcon sx={{ fontSize: 30 }} />, color: 'success.main' },
    { title: t('customers.metrics.inactive'), value: inactiveCustomers, icon: <HighlightOffOutlinedIcon sx={{ fontSize: 30 }} />, color: 'warning.main' }, 
  ];

  return (
      <RootContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {t('customers.management')}
              </Typography>
              <Box>
                  <Tooltip title={t('customers.refresh')}>
                      <IconButton onClick={fetchCustomers} sx={{ color: 'white', mr: 1 }}>
                          <RefreshIcon />
                      </IconButton>
                  </Tooltip>
                  <Button
                      variant="contained"
                      startIcon={<AddIcon sx={{ml: isRtl ? 1 : 0}}/>}
                      onClick={handleAddCustomer}
                      sx={{...gradientButtonSx}}
                  >
                      {t('customers.add')}
                  </Button>
              </Box>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2, background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>}
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

          <GlassCard sx={{ position: 'relative', zIndex: 2 }}>
              <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                          <TextField
                              fullWidth
                              variant="outlined"
                              placeholder={t('customers.searchPlaceholder')}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              sx={{...textFieldSx}}
                              InputProps={{
                                  startAdornment: (
                                      <InputAdornment position="start">
                                          <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                                      </InputAdornment>
                                  ),
                              }}
                          />
                      </Box>
              </CardContent>

              {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                      <CircularProgress size={20} sx={CircularProgressSx} />
                  </Box>
              ) : !error && filteredCustomers.length === 0 ? (
                  <Typography sx={{ textAlign: 'center', p: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
                      {customers.length === 0 ? t('customers.noneYet') : t('customers.noneFound')}
                  </Typography>
              ) : (
                  <TableContainer component={Paper} sx={{ background: 'transparent' }}>
                      <Table aria-label="customers table">
                          <TableHead>
                              <TableRow sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255, 255, 255, 0.2)' } }}>
                                  {[t('customers.headers.name'), t('customers.headers.email'), t('customers.headers.company'), t('customers.headers.phone'), t('customers.headers.status'), t('customers.headers.actions')].map((headCell, index) => (
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
                                <TableRow
                                  key={customer.id}
                                  sx={{
                                    '& .MuiTableCell-root': {
                                      color: '#fff',
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                    },
                                    '&:hover': {
                                      background: 'rgba(254,107,139,0.08)', // subtle glassy pink
                                      cursor: 'pointer',
                                      transition: 'background 0.2s',
                                    }
                                  }}
                                >
                                  <TableCell>{customer.company_name || `${customer.first_name} ${customer.last_name}`}</TableCell>
                                  <TableCell>{customer.email}</TableCell>
                                  <TableCell>{customer.company_name || 'N/A'}</TableCell>
                                  <TableCell>{customer.phone_number || 'N/A'}</TableCell>
                                  <TableCell>
                                      <Chip
                                          label={customer.is_active ? t('customers.active') : t('customers.inactive')}
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
                                      <Tooltip title={t('customers.manageServers')}>
                                          <IconButton onClick={() => navigate(`/customers/${customer.id}/servers`)} size="small" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                              <DnsIcon />
                                          </IconButton>
                                      </Tooltip>
                                      <Tooltip title={t('customers.edit')}>
                                          <IconButton onClick={() => handleEditCustomer(customer.id)} size="small" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                              <EditIcon />
                                          </IconButton>
                                      </Tooltip>
                                      <Tooltip title={t('customers.delete')}>
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
                          labelRowsPerPage={t('common.rowsPerPage')}
                          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
                      />
                  </TableContainer>
              )}
          </GlassCard>
          
          {/* Customer Form Modal */}
          <CustomerForm
            open={customerFormOpen}
            onClose={handleCustomerFormClose}
            customerId={editingCustomerId}
            onSuccess={handleCustomerFormSuccess}
          />
          <ConfirmDialog
                    open={deleteDialogOpen}
                    onClose={closeDeleteDialog}
                    onConfirm={handleDeleteCustomer}
                    title={t('customers.confirmDeleteTitle')}
                    message={t('customers.confirmDeleteMessage')}
                    confirmText={t('customers.yesDelete')}
                    cancelText={t('customers.cancel')}
                    severity="info"
            />

          <CustomSnackbar
            open={snackbar.open}
            onClose={hideSnackbar}
            severity={snackbar.severity}
            message={snackbar.message}
          />
      </RootContainer>
  );
}
