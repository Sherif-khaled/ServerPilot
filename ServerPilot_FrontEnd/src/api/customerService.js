import apiClient from './apiClient';

export const getCustomers = () => {
  return apiClient.get('/customers/');
};

export const getCustomerDetails = (id) => {
  return apiClient.get(`/customers/${id}/`);
};

export const createCustomer = (customerData) => {
  return apiClient.post('/customers/', customerData);
};

export const updateCustomer = (id, customerData) => {
  return apiClient.put(`/customers/${id}/`, customerData);
};

export const deleteCustomer = (id) => {
  return apiClient.delete(`/customers/${id}/`);
};

export const updateCustomerStatus = (id, isActive) => {
  return apiClient.patch(`/customers/${id}/`, { is_active: isActive });
};

export const getCustomerTypes = () => {
  return apiClient.get('/customers/types/');
};
