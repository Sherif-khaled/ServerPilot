import apiClient from './apiClient';

const POLICY_URL = '/security/policy/1/';
const SESSIONS_URL = '/users/sessions/';
const RISKS_URL = '/security/risks/';

export const getPasswordPolicy = () => {
  return apiClient.get(POLICY_URL);
};

export const updatePasswordPolicy = (policyData) => {
  return apiClient.put(POLICY_URL, policyData);
};

export const getUserSessions = () => {
  return apiClient.get(SESSIONS_URL);
};

export const revokeUserSession = (sessionId) => {
  return apiClient.delete(`${SESSIONS_URL}${sessionId}/revoke/`);
};

// ---------------- Security Risks ----------------
export const getSecurityRisks = () => apiClient.get(RISKS_URL);
export const createSecurityRisk = (data) => apiClient.post(RISKS_URL, data);
export const updateSecurityRisk = (id, data) => apiClient.put(`${RISKS_URL}${id}/`, data);
export const deleteSecurityRisk = (id) => apiClient.delete(`${RISKS_URL}${id}/`);
