import apiClient from './apiClient';

const POLICY_URL = '/security/policy/1/';
const SESSIONS_URL = '/users/sessions/';

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
