import apiClient from './apiClient';

const USER_API_URL = '/users';
const ADMIN_API_URL = '/users/admin'; // Base for admin-related user actions
const CUSTOMER_API_URL = '/customers';

// --- User-facing endpoints ---
export const registerUser = (data) => apiClient.post(`${USER_API_URL}/`, data);
export const loginUser = (data) => apiClient.post(`${USER_API_URL}/login/`, data);
export const getProfile = () => apiClient.get(`${USER_API_URL}/profile/`);
export const updateProfile = (data) => apiClient.patch(`${USER_API_URL}/profile/`, data);
export const logoutUser = () => apiClient.post(`${USER_API_URL}/logout/`, {});
export const changePassword = (passwords) => apiClient.post(`${USER_API_URL}/password/change/`, passwords);

// --- MFA Endpoints ---
export const setupMfa = () => apiClient.post(`${USER_API_URL}/mfa/setup/`);
export const verifyMfa = (token) => apiClient.post(`${USER_API_URL}/mfa/verify/`, { otp_token: token });
export const challengeMfa = (token) => apiClient.post(`${USER_API_URL}/mfa/challenge/`, { otp_token: token });
export const disableMfa = () => apiClient.post(`${USER_API_URL}/mfa/disable/`);

// --- Recovery Codes ---
export const getRecoveryCodes = () => apiClient.get(`${USER_API_URL}/mfa/recovery-codes/`);
export const verifyRecoveryCode = (code) => apiClient.post(`${USER_API_URL}/mfa/verify-recovery-code/`, { code });
export const generateNewRecoveryCodes = () => apiClient.post(`${USER_API_URL}/mfa/generate-recovery-codes/`);

// --- Admin User Management Endpoints ---
const ADMIN_USERS_URL = `${ADMIN_API_URL}/users`;
export const adminListUsers = () => apiClient.get(`${ADMIN_USERS_URL}/`);
export const adminGetUser = (userId) => apiClient.get(`${ADMIN_USERS_URL}/${userId}/`);
export const adminCreateUser = (userData) => apiClient.post(`${ADMIN_USERS_URL}/`, userData);
export const adminUpdateUser = (userId, userData) => apiClient.put(`${ADMIN_USERS_URL}/${userId}/`, userData);
export const adminPatchUser = (userId, userData) => apiClient.patch(`${ADMIN_USERS_URL}/${userId}/`, userData);
export const adminDeleteUser = (userId) => apiClient.delete(`${ADMIN_USERS_URL}/${userId}/`);
export const adminBulkDeleteUsers = (userIds) => apiClient.post(`${ADMIN_USERS_URL}/bulk-delete/`, { ids: userIds });
export const adminSetUserPassword = (userId, newPassword) => apiClient.post(`${ADMIN_USERS_URL}/${userId}/set-password/`, { new_password: newPassword });

// --- Admin User Statistics Endpoint ---
export const getUserStats = () => {
    return apiClient.get('/api/users/stats/');
};

export const getDashboardStats = () => {
    return apiClient.get('/stats/dashboard/');
};

export const checkUsernameExists = (username) => apiClient.get(`${USER_API_URL}/check-username/?username=${username}`);

// --- Customer Management Endpoints ---
export const getCustomers = () => apiClient.get(CUSTOMER_API_URL);
export const getCustomerDetails = (customerId) => apiClient.get(`${CUSTOMER_API_URL}/${customerId}/`);
export const createCustomer = (customerData) => apiClient.post(CUSTOMER_API_URL, customerData);
export const updateCustomer = (customerId, customerData) => apiClient.put(`${CUSTOMER_API_URL}/${customerId}/`, customerData);
export const deleteCustomer = (customerId) => apiClient.delete(`${CUSTOMER_API_URL}/${customerId}/`);

// --- Customer Type Endpoints ---
export const getCustomerTypes = () => apiClient.get(`${CUSTOMER_API_URL}/types/`);
