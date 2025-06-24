import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, TextField, MenuItem, Box, Typography, Select, InputLabel, FormControl, Paper, Alert, CircularProgress, FormHelperText
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Save as SaveIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { createCustomer, getCustomerDetails, updateCustomer, getCustomerTypes } from '../../../api/customerService';

/*********************  THEME HELPERS  ************************/ 
// Glassmorphic helpers
const glassBg = 'rgba(255,255,255,0.08)';
const glassBorder = '1px solid rgba(255,255,255,0.125)';
const blurProps = {
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
};
/*********************  STYLED COMPONENTS  ************************/
const RootContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(3),
    background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
    backdropFilter: 'blur(8px) saturate(160%)',
    WebkitBackdropFilter: 'blur(8px) saturate(160%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
    color: '#fff',
}));

// Glassmorphism Card
const GlassCard = styled(Paper)(({ theme }) => ({
    background: 'linear-gradient(45deg, #0f2027, #2c5364, #2c5364)',
    backdropFilter: 'blur(8px) saturate(160%)',
    WebkitBackdropFilter: 'blur(8px) saturate(160%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
    padding: theme.spacing(3),
    color: '#fff',
}));

// Common TextField sx with gradient focus ring
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

const initialFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  company_name: '',
  delegated_person_name: '',
  address_line1: '',
  city: '',
  country: '',
  notes: '',
  customer_type: '',
};

export default function CustomerForm() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(customerId);

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [apiFormError, setApiFormError] = useState('');
  const [errors, setErrors] = useState({});
  
  const [customerTypes, setCustomerTypes] = useState([]);
  const [selectedTypeName, setSelectedTypeName] = useState('');

  const fetchCustomerTypes = useCallback(async () => {
    try {
      const typesResponse = await getCustomerTypes();
      setCustomerTypes(typesResponse.data || []);
    } catch (err) {
      console.error('Failed to fetch customer types:', err);
      setApiFormError('Failed to load customer types.');
    }
  }, []);

  const fetchCustomerData = useCallback(async () => {
    if (!isEditMode) return;
    
    setLoading(true);
    try {
      const response = await getCustomerDetails(customerId);
      const customerData = response.data;
      setFormData({
        first_name: customerData.first_name || '',
        last_name: customerData.last_name || '',
        email: customerData.email || '',
        phone_number: customerData.phone_number || '',
        company_name: customerData.company_name || '',
        delegated_person_name: customerData.delegated_person_name || '',
        address_line1: customerData.address_line1 || '',
        city: customerData.city || '',
        country: customerData.country || '',
        notes: customerData.notes || '',
        customer_type: customerData.customer_type || '',
      });
      if (customerTypes.length > 0) {
        const currentType = customerTypes.find(t => t.id === customerData.customer_type);
        if (currentType) {
          setSelectedTypeName(currentType.name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch customer details:', err);
      setApiFormError('Failed to load customer data.');
    }
    setLoading(false);
  }, [customerId, isEditMode, customerTypes]);

  useEffect(() => {
    fetchCustomerTypes();
  }, [fetchCustomerTypes]);

  useEffect(() => {
    if (isEditMode) {
      if (customerTypes.length > 0) {
        fetchCustomerData();
      }
    } else {
      setFormData(initialFormData);
      setSelectedTypeName('');
      setErrors({});
      setApiFormError('');
    }
  }, [isEditMode, customerId, customerTypes, fetchCustomerData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    
    setFormData(prevData => ({ ...prevData, [name]: value }));

    if (name === 'customer_type') {
        const selectedType = customerTypes.find(t => t.id === value);
        setSelectedTypeName(selectedType ? selectedType.name.toLowerCase() : '');
        if (selectedType?.name.toLowerCase() === 'company') {
            setFormData(prev => ({ ...prev, first_name: '', last_name: '' }));
        } else {
            setFormData(prev => ({ ...prev, company_name: '', delegated_person_name: '' }));
        }
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    if(apiFormError) setApiFormError('');
  };

  const validateForm = () => {
    const newErrors = {};
    const isCompany = selectedTypeName === 'company';

    if (!formData.customer_type) {
        newErrors.customer_type = 'Customer type is required.';
    }

    if (isCompany) {
        if (!formData.company_name.trim()) newErrors.company_name = 'Company name is required.';
        if (!formData.delegated_person_name.trim()) newErrors.delegated_person_name = 'Delegated person name is required.';
    } else {
        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required.';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required.';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is not valid.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    setApiFormError('');

    const submissionData = { ...formData };
    if (selectedTypeName === 'company') {
        submissionData.first_name = '';
        submissionData.last_name = '';
    } else {
        submissionData.company_name = '';
        submissionData.delegated_person_name = '';
    }

    try {
      if (isEditMode) {
        await updateCustomer(customerId, submissionData);
      } else {
        await createCustomer(submissionData);
      }
      navigate('/customers');
    } catch (err) {
      console.error('Failed to save customer:', err);
      const errorData = err.response?.data;
      if (errorData) {
        if (typeof errorData === 'string') {
          setApiFormError(errorData);
        } else {
          const backendErrors = {};
          for (const key in errorData) {
            backendErrors[key] = errorData[key].join(' ');
          }
          setErrors(prev => ({ ...prev, ...backendErrors }));
          setApiFormError('Please correct the errors below.');
        }
      } else {
        setApiFormError('An unexpected error occurred. Please try again.');
      }
    }
    setLoading(false);
  };

  return (
    <RootContainer>
      <GlassCard>
         <Typography variant="h4" gutterBottom sx={{ textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>
          {isEditMode ? 'Edit Customer' : 'Add New Customer'}
        </Typography>
        
        {loading && !formData.email ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
            <CircularProgress sx={{ color: '#FE6B8B' }} />
          </Box>
        ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {apiFormError && (
              <Box>
                <Alert severity="error" sx={{ background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{apiFormError}</Alert>
              </Box>
            )}

            {/* Basic Information Section */}
            <Box>
              <GlassCard>
                <Typography variant="subtitle1" sx={{ mb: 1, opacity: 0.8 }}>Basic Information</Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    mt: 2,
                  }}
                >
                  {/* Customer Type always full width */}
                  <Box sx={{ flex: '1 1 100%', minWidth: 0 }}>
                    <FormControl fullWidth error={!!errors.customer_type} sx={textFieldSx}>
                      <InputLabel id="customer-type-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Customer Type</InputLabel>
                      <Select
                        labelId="customer-type-label"
                        id="customer_type"
                        name="customer_type"
                        value={formData.customer_type}
                        label="Customer Type"
                        onChange={handleChange}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              ...blurProps,
                              background: glassBg,
                              border: glassBorder,
                              borderRadius: 2,
                              color: '#fff',
                              boxShadow: '0 8px 32px rgba(0,0,0,.37)',
                            },
                          },
                        }}
                        required
                      >
                        <MenuItem value=""><em>Select a type</em></MenuItem>
                        {customerTypes.map((type) => (
                          <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
                        ))}
                      </Select>
                      {errors.customer_type && <FormHelperText>{errors.customer_type}</FormHelperText>}
                    </FormControl>
                  </Box>

                  {selectedTypeName === 'company' ? (
                    <>
                      {/* Company Name - left column */}
                      <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' }, minWidth: 0 }}>
                        <TextField
                          fullWidth
                          id="company_name"
                          name="company_name"
                          label="Company Name"
                          value={formData.company_name}
                          onChange={handleChange}
                          error={!!errors.company_name}
                          helperText={errors.company_name}
                          sx={{ ...textFieldSx }}
                          required
                        />
                      </Box>
                      {/* Delegated Person - right column */}
                      <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' }, minWidth: 0 }}>
                        <TextField
                          fullWidth
                          id="delegated_person_name"
                          name="delegated_person_name"
                          label="Delegated Person"
                          value={formData.delegated_person_name}
                          onChange={handleChange}
                          error={!!errors.delegated_person_name}
                          helperText={errors.delegated_person_name}
                          sx={{ ...textFieldSx }}
                          required
                        />
                      </Box>
                      {/* Email - left column */}
                      <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' }, minWidth: 0 }}>
                        <TextField
                          fullWidth
                          id="email"
                          name="email"
                          label="Email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          error={!!errors.email}
                          helperText={errors.email}
                          sx={{ ...textFieldSx }}
                          required
                        />
                      </Box>
                      {/* Phone Number - right column */}
                      <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' }, minWidth: 0 }}>
                        <TextField
                          fullWidth
                          id="phone_number"
                          name="phone_number"
                          label="Phone Number"
                          value={formData.phone_number}
                          onChange={handleChange}
                          error={!!errors.phone_number}
                          helperText={errors.phone_number}
                          sx={{ ...textFieldSx }}
                        />
                      </Box>
                    </>
                  ) : (
                    // Personal fields: two columns, left and right
                    <>
                      <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' }, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <TextField
                          fullWidth
                          id="first_name"
                          name="first_name"
                          label="First Name"
                          value={formData.first_name}
                          onChange={handleChange}
                          error={!!errors.first_name}
                          helperText={errors.first_name}
                          sx={{ ...textFieldSx }}
                          required
                        />
                        <TextField
                          fullWidth
                          id="email"
                          name="email"
                          label="Email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          error={!!errors.email}
                          helperText={errors.email}
                          sx={{ ...textFieldSx }}
                          required
                        />
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 48%' }, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <TextField
                          fullWidth
                          id="last_name"
                          name="last_name"
                          label="Last Name"
                          value={formData.last_name}
                          onChange={handleChange}
                          error={!!errors.last_name}
                          helperText={errors.last_name}
                          sx={{ ...textFieldSx }}
                          required
                        />
                        <TextField
                          fullWidth
                          id="phone_number"
                          name="phone_number"
                          label="Phone Number"
                          value={formData.phone_number}
                          onChange={handleChange}
                          error={!!errors.phone_number}
                          helperText={errors.phone_number}
                          sx={{ ...textFieldSx }}
                        />
                      </Box>
                    </>
                  )}
                </Box>
              </GlassCard>
            </Box>

            {/* Address Section */}
            <Box>
              <GlassCard sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, opacity: 0.8 }}>Address</Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    mt: 2,
                  }}
                >
                  <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 32%' }, minWidth: 0 }}>
                    <TextField
                      fullWidth
                      id="address_line1"
                      name="address_line1"
                      label="Address"
                      value={formData.address_line1}
                      onChange={handleChange}
                      sx={{ ...textFieldSx }}
                    />
                  </Box>
                  <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 32%' }, minWidth: 0 }}>
                    <TextField
                      fullWidth
                      id="city"
                      name="city"
                      label="City"
                      value={formData.city}
                      onChange={handleChange}
                      sx={{ ...textFieldSx }}
                    />
                  </Box>
                  <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 32%' }, minWidth: 0 }}>
                    <TextField
                      fullWidth
                      id="country"
                      name="country"
                      label="Country"
                      value={formData.country}
                      onChange={handleChange}
                      sx={{ ...textFieldSx }}
                    />
                  </Box>
                </Box>
              </GlassCard>
            </Box>

            {/* Notes Section */}
            <Box>
              <GlassCard sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, opacity: 0.8 }}>Notes</Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    mt: 2,
                  }}
                >
                  <Box sx={{ flex: '1 1 100%' }}>
                    <TextField
                      fullWidth
                      id="notes"
                      name="notes"
                      label="Notes"
                      multiline
                      rows={8}
                      value={formData.notes}
                      onChange={handleChange}
                      sx={{ ...textFieldSx }}
                    />
                  </Box>
                </Box>
              </GlassCard>
            </Box>
          </Box>
          
          {/* ───── Actions ───── */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
              <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={loading}
                  sx={{
                    flex: 1,
                    background: 'linear-gradient(45deg,#FE6B8B 30%,#FF8E53 90%)',
                    boxShadow: '0 3px 5px 2px rgba(255,105,135,.3)',
                    borderRadius: 25,
                    p: '10px 25px',
                  }}
              >
                  {loading ? 'Saving...' : 'Save Customer'}
              </Button>
              <Button 
                onClick={() => navigate('/customers')}
                color="error"
                sx={{ flex: 1, borderRadius: 25, p: '10px 25px', border: '0.5px solid #da3633' }}
                disabled={loading}>
                  Cancel
              </Button>
          </Box>
        </form>
        )}
      </GlassCard>
    </RootContainer>
  );
}
