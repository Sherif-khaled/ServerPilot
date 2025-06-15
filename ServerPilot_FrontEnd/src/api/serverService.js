import apiClient from './apiClient';

const getServers = (customerId) => {
  return apiClient.get(`/customers/${customerId}/servers/`);
};

const getServerDetails = (customerId, serverId) => {
  return apiClient.get(`/customers/${customerId}/servers/${serverId}/`);
};

const createServer = (customerId, serverData) => {
  return apiClient.post(`/customers/${customerId}/servers/`, serverData);
};

const updateServer = (customerId, serverId, serverData) => {
  return apiClient.put(`/customers/${customerId}/servers/${serverId}/`, serverData);
};

const deleteServer = (customerId, serverId) => {
  return apiClient.delete(`/customers/${customerId}/servers/${serverId}/`);
};

const testServerConnection = (customerId, serverId, command = null) => {
  const payload = command ? { command } : {};
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/test_connection/`, payload);
};

const getServerInfo = (customerId, serverId) => {
  return apiClient.get(`/customers/${customerId}/servers/${serverId}/get-info/`);
};

const changeServerPassword = (customerId, serverId, password) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/change_password/`, { password });
};

export {
  getServers,
  getServerDetails,
  createServer,
  updateServer,
  deleteServer,
  testServerConnection,
  getServerInfo,
  changeServerPassword,
};
