import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, TextField, MenuItem, Box, Typography, Select, InputLabel, FormControl, Alert, CircularProgress, FormHelperText,
  Dialog, DialogTitle, DialogContent, DialogActions, Stepper, Step, StepLabel, IconButton
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon, NavigateNext as NavigateNextIcon, NavigateBefore as NavigateBeforeIcon } from '@mui/icons-material';
import { createCustomer, getCustomerDetails, updateCustomer, getCustomerTypes } from '../../../api/customerService';
import {gradientButtonSx, textFieldSx, CircularProgressSx, SelectSx, glassDialogSx } from '../../../common';


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

const steps = ['Basic Information', 'Address', 'Notes'];

export default function CustomerForm({ open, onClose, customerId = null, onSuccess }) {
  const isEditMode = Boolean(customerId);
  const [activeStep, setActiveStep] = useState(0);
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
          setSelectedTypeName(currentType.name.toLowerCase());
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
    if (isEditMode && customerTypes.length > 0) {
      fetchCustomerData();
    } else if (!isEditMode && open) {
      setFormData(initialFormData);
      setSelectedTypeName('');
      setErrors({});
      setApiFormError('');
      setActiveStep(0);
    }
  }, [isEditMode, customerId, customerTypes, fetchCustomerData, open]);

  // Handle customer type changes
  useEffect(() => {
    if (formData.customer_type && customerTypes.length > 0) {
      const selectedType = customerTypes.find(t => t.id === formData.customer_type);
      if (selectedType) {
        setSelectedTypeName(selectedType.name.toLowerCase());
      }
    }
  }, [formData.customer_type, customerTypes]);

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
    if (apiFormError) setApiFormError('');
  };

  const validateStep = (step) => {
    const newErrors = {};
    const selectedType = customerTypes.find(t => t.id === formData.customer_type);
    const isCompany = selectedType?.name.toLowerCase() === 'company';

    switch (step) {
      case 0: // Basic Information
        if (!formData.customer_type) {
          newErrors.customer_type = 'Customer type is required.';
        } else {
          if (isCompany) {
            if (!formData.company_name?.trim()) newErrors.company_name = 'Company name is required.';
            if (!formData.delegated_person_name?.trim()) newErrors.delegated_person_name = 'Delegated person name is required.';
          } else {
            if (!formData.first_name?.trim()) newErrors.first_name = 'First name is required.';
            if (!formData.last_name?.trim()) newErrors.last_name = 'Last name is required.';
          }
          
          if (!formData.email?.trim()) {
            newErrors.email = 'Email is required.';
          } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is not valid.';
          }
        }
        break;
      case 1: // Address - no validation required
        break;
      case 2: // Notes - no validation required
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) {
      return;
    }
    
    setLoading(true);
    setApiFormError('');

    const submissionData = { ...formData };
    const selectedType = customerTypes.find(t => t.id === formData.customer_type);
    const isCompany = selectedType?.name.toLowerCase() === 'company';
    
    if (isCompany) {
      submissionData.first_name = '';
      submissionData.last_name = '';
    } else {
      submissionData.company_name = '';
      submissionData.delegated_person_name = '';
    }

    try {
      if (isEditMode) {
        await updateCustomer(customerId, submissionData);
        onSuccess && onSuccess('Customer updated successfully!');
      } else {
        await createCustomer(submissionData);
        onSuccess && onSuccess('Customer created successfully!');
      }
      onClose();
    } catch (err) {
      console.error('Failed to save customer:', err);
      const errorData = err.response?.data;
      if (errorData) {
        if (typeof errorData === 'string') {
          setApiFormError(errorData);
        } else {
          const backendErrors = {};
          for (const key in errorData) {
            if (Array.isArray(errorData[key])) {
              backendErrors[key] = errorData[key].join(' ');
            } else {
              backendErrors[key] = errorData[key];
            }
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

  const handleClose = () => {
    if (!loading) {
      setActiveStep(0);
      setFormData(initialFormData);
      setSelectedTypeName('');
      setErrors({});
      setApiFormError('');
      onClose();
    }
  };

  const renderStepContent = (step) => {
    const selectedType = customerTypes.find(t => t.id === formData.customer_type);
    const isCompany = selectedType?.name.toLowerCase() === 'company';
    
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Customer Type */}
            <Box sx={{ width: '100%' }}>
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
                      sx: {...SelectSx}},
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

            {isCompany ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    fullWidth
                    id="company_name"
                    name="company_name"
                    label="Company Name"
                    value={formData.company_name}
                    onChange={handleChange}
                    error={!!errors.company_name}
                    helperText={errors.company_name}
                    sx={{ ...textFieldSx, flex: '1 1 48%', minWidth: 250 }}
                    required
                  />
                  <TextField
                    fullWidth
                    id="delegated_person_name"
                    name="delegated_person_name"
                    label="Delegated Person"
                    value={formData.delegated_person_name}
                    onChange={handleChange}
                    error={!!errors.delegated_person_name}
                    helperText={errors.delegated_person_name}
                    sx={{ ...textFieldSx, flex: '1 1 48%', minWidth: 250 }}
                    required
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                    sx={{ ...textFieldSx, flex: '1 1 48%', minWidth: 250 }}
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
                    sx={{ ...textFieldSx, flex: '1 1 48%', minWidth: 250 }}
                  />
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    fullWidth
                    id="first_name"
                    name="first_name"
                    label="First Name"
                    value={formData.first_name}
                    onChange={handleChange}
                    error={!!errors.first_name}
                    helperText={errors.first_name}
                    sx={{ ...textFieldSx, flex: '1 1 48%', minWidth: 250 }}
                    required
                  />
                  <TextField
                    fullWidth
                    id="last_name"
                    name="last_name"
                    label="Last Name"
                    value={formData.last_name}
                    onChange={handleChange}
                    error={!!errors.last_name}
                    helperText={errors.last_name}
                    sx={{ ...textFieldSx, flex: '1 1 48%', minWidth: 250 }}
                    required
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                    sx={{ ...textFieldSx, flex: '1 1 48%', minWidth: 250 }}
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
                    sx={{ ...textFieldSx, flex: '1 1 48%', minWidth: 250 }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                fullWidth
                id="address_line1"
                name="address_line1"
                label="Address"
                value={formData.address_line1}
                onChange={handleChange}
                sx={{ ...textFieldSx, flex: '1 1 100%' }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                fullWidth
                id="city"
                name="city"
                label="City"
                value={formData.city}
                onChange={handleChange}
                sx={{ ...textFieldSx, flex: '1 1 48%', minWidth: 250 }}
              />
              <TextField
                fullWidth
                id="country"
                name="country"
                label="Country"
                value={formData.country}
                onChange={handleChange}
                sx={{ ...textFieldSx, flex: '1 1 48%', minWidth: 250 }}
              />
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              id="notes"
              name="notes"
              label="Notes"
              multiline
              rows={8}
              value={formData.notes}
              onChange={handleChange}
              sx={textFieldSx}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperComponent={glassDialogSx}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ textShadow: '0 2px 8px rgba(0,0,0,.5)' }}>
          {isEditMode ? 'Edit Customer' : 'Add New Customer'}
        </Typography>
        <IconButton onClick={handleClose} disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {apiFormError && (
          <Alert severity="error" sx={{ mb: 2, background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>
            {apiFormError}
          </Alert>
        )}

        {/* Stepper */}
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep} sx={{ 
            '& .MuiStepLabel-root .Mui-completed': { color: '#FE6B8B' },
            '& .MuiStepLabel-root .Mui-active': { color: '#FE6B8B' },
            '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.7)' },
            '& .MuiStepLabel-label.Mui-active': { color: '#FE6B8B' },
            '& .MuiStepLabel-label.Mui-completed': { color: '#FE6B8B' },
            '& .MuiStepConnector-line': { borderColor: 'rgba(255,255,255,0.3)' },
            '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': { borderColor: '#FE6B8B' },
            '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': { borderColor: '#FE6B8B' },
            '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.3)' },
            '& .MuiStepIcon-root.Mui-active': { color: '#FE6B8B' },
            '& .MuiStepIcon-root.Mui-completed': { color: '#FE6B8B' },
          }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Step Content */}
        {loading && !formData.email ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
            <CircularProgress sx={CircularProgressSx} />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            {renderStepContent(activeStep)}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
            startIcon={<NavigateBeforeIcon />}
            sx={{ 
              color: 'rgba(255,255,255,0.7)',
              '&:hover': { color: '#FE6B8B' }
            }}
          >
            Back
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeStep === steps.length - 1 ? (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress sx={CircularProgressSx} /> : <SaveIcon />}
              sx={{...gradientButtonSx}}
            >
              {loading ? 'Saving...' : 'Save Customer'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              variant="contained"
              disabled={loading}
              endIcon={<NavigateNextIcon />}
              sx={{...gradientButtonSx}}
            >
              Next
            </Button>
          )}
        </Box>
      </DialogActions>

    </Dialog>
  );
}
