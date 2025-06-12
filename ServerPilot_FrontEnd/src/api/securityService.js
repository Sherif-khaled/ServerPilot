import apiClient from './apiClient';

const POLICY_URL = '/security/policy/1/';

export const getPasswordPolicy = () => {
  return apiClient.get(POLICY_URL);
};

export const updatePasswordPolicy = (policyData) => {
  return apiClient.put(POLICY_URL, policyData);
};
