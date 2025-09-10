import apiClient from './apiClient';

export const getCustomers = () => {
  const token = localStorage.getItem('accessToken');
  return apiClient.get('/customers/', { headers: { Authorization: `Bearer ${token}` } });
};

export const getCustomerDetails = (id) => {
  const token = localStorage.getItem('accessToken');
  return apiClient.get(`/customers/${id}/`, { headers: { Authorization: `Bearer ${token}` } });
};

export const createCustomer = (customerData) => {
  const token = localStorage.getItem('accessToken');
  return apiClient.post('/customers/', customerData, { headers: { Authorization: `Bearer ${token}` } });
};

export const updateCustomer = (id, customerData) => {
  const token = localStorage.getItem('accessToken');
  return apiClient.put(`/customers/${id}/`, customerData, { headers: { Authorization: `Bearer ${token}` } });
};

export const deleteCustomer = (id) => {
  const token = localStorage.getItem('accessToken');
  return apiClient.delete(`/customers/${id}/`, { headers: { Authorization: `Bearer ${token}` } });
};

export const updateCustomerStatus = (id, isActive) => {
  const token = localStorage.getItem('accessToken');
  return apiClient.patch(`/customers/${id}/`, { is_active: isActive }, { headers: { Authorization: `Bearer ${token}` } });
};

export const getCustomerTypes = () => {
  const token = localStorage.getItem('accessToken');
  return apiClient.get('/customers/types/', { headers: { Authorization: `Bearer ${token}` } });
};
