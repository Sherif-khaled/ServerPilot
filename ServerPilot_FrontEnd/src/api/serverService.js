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

// Test connection using provided credentials without persisting a server (pre-create/update)
const testServerConnectionWithPayload = (customerId, data) => {
  return apiClient.post(`/customers/${customerId}/servers/test_connection/`, data);
};

const getServerHealth = (customerId, serverId) => {
  return apiClient.get(`/customers/${customerId}/servers/${serverId}/server-info/health/`);
};

const getServerMetrics = (customerId, serverId) => {
  return apiClient.get(`/customers/${customerId}/servers/${serverId}/server-info/metrics/`);
};

const changeServerPassword = (customerId, serverId, password) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/change_password/`, { password });
};

const runSecurityScan = (customerId, serverId) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/security-advisor/run-security-scan/`);
};

const getLatestSecurityScan = (customerId, serverId) => {
  return apiClient.get(`/customers/${customerId}/servers/${serverId}/security-advisor/latest-security-scan/`);
};

const updateRecommendationStatus = (customerId, serverId, recommendation_id, status) => {
  return apiClient.patch(`/customers/${customerId}/servers/${serverId}/security-advisor/recommendations/update-status/`, { recommendation_id, status });
};

const fixRecommendation = (customerId, serverId, recommendationId) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/security-advisor/fix_recommendation/`, { recommendation_id: recommendationId });
};

const scanApplications = (customerId, serverId) => {
  return apiClient.get(`/customers/${customerId}/servers/${serverId}/installed-applications/`);
};


const monitorApplication = (customerId, serverId, appName) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/installed-applications/${appName}/monitor-application/`);
};

const manageApplication = (customerId, serverId, appName, action) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/installed-applications/${appName}/manage-application/`, { action });
};


const getSecurityRisks = () => {
  return apiClient.get('/security/risks/');
};

const updateSecurityRisk = (riskId, riskData) => {
  return apiClient.put(`/security/risks/${riskId}/`, riskData);
};

const createSecurityRisk = (riskData) => {
  return apiClient.post('/security/risks/', riskData);
};

const deleteSecurityRisk = (riskId) => {
  return apiClient.delete(`/security/risks/${riskId}/`);
};

const toggleFirewall = (customerId, serverId) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/firewall/toggle/`);
};

const getUfwRules = (customerId, serverId) => {
  return apiClient.get(`/customers/${customerId}/servers/${serverId}/firewall/rules/`);
};

const getFirewallStatus = (customerId, serverId) => {
  return apiClient.get(`/customers/${customerId}/servers/${serverId}/firewall/status/`);
};

const addUfwRule = (customerId, serverId, ruleData) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/firewall/rules/add/`, ruleData);
};

const deleteUfwRule = (customerId, serverId, ruleId) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/firewall/rules/delete/`, { id: ruleId });
};

const editUfwRule = (customerId, serverId, ruleData) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/firewall/rules/edit/`, ruleData);
};

const getServerLogs = (customerId, serverId, appName) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/installed-applications/${appName}/application-logs/`, { name: appName });
};

const executeFix = (customerId, serverId, commands) => {
  return apiClient.post(`/customers/${customerId}/servers/${serverId}/installed-applications/execute-fix/`, { commands });
};

export {
  getServers,
  getServerDetails,
  createServer,
  updateServer,
  deleteServer,
  testServerConnection,
  testServerConnectionWithPayload,
  changeServerPassword,
  runSecurityScan,
  getLatestSecurityScan,
  updateRecommendationStatus,
  fixRecommendation,
  scanApplications,
  monitorApplication,
  manageApplication,
  getSecurityRisks,
  updateSecurityRisk,
  createSecurityRisk,
  deleteSecurityRisk,
  toggleFirewall,
  getUfwRules,
  getFirewallStatus,
  addUfwRule,
  deleteUfwRule,
  editUfwRule,
  getServerHealth,
  getServerMetrics,
  getServerLogs,
  executeFix,
};
