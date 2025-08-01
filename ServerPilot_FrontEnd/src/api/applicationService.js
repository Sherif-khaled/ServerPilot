import apiClient from './apiClient';

export const getApplications = async (serverId) => {
  const response = await apiClient.get(`/servers/${serverId}/applications/`);
  return response.data;
};

export const getAllApplications = async () => {
  const response = await apiClient.get('/applications/');
  return response.data;
};

export const createApplication = async (appData) => {
  const response = await apiClient.post('/applications/', appData);
  return response.data;
};

export const updateApplication = async (appId, appData) => {
  const response = await apiClient.put(`/applications/${appId}/`, appData);
  return response.data;
};

export const deleteApplication = async (appId) => {
  const response = await apiClient.delete(`/applications/${appId}/`);
  return response.data;
};
