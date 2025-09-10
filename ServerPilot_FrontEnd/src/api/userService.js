import apiClient from './apiClient';

const USER_API_URL = '/users';
const ADMIN_API_URL = '/users/admin'; // Base for admin-related user actions
const CUSTOMER_API_URL = '/customers';

// --- User-facing endpoints ---
export const registerUser = (data) => apiClient.post(`${USER_API_URL}/register/`, data, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });

// Session login: used to initiate login and determine if MFA is required
export const loginSession = (data) => apiClient.post(`${USER_API_URL}/login/`, data, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });

// JWT login: obtain tokens and persist them
export const loginUser = async ({ username, password }) => {
    const res = await apiClient.post(`${USER_API_URL}/token/`, { username, password });
    const { access, refresh } = res.data || {};
    if (access) localStorage.setItem('accessToken', access);
    if (refresh) localStorage.setItem('refreshToken', refresh);
    return res;
};
export const getProfile = () => apiClient.get(`${USER_API_URL}/profile/`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const updateProfile = (data) => apiClient.patch(`${USER_API_URL}/profile/`, data, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const logoutUser = async () => {
    // Best-effort backend logout (optional with JWT), then clear local tokens
    try { await apiClient.post(`${USER_API_URL}/logout/`, {}); } catch (e) {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
};
export const changePassword = (passwords) => apiClient.post(`${USER_API_URL}/password/change/`, passwords, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });

// --- MFA Endpoints ---
export const setupMfa = () => apiClient.post(`${USER_API_URL}/mfa/setup/`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const verifyMfa = (token) => apiClient.post(`${USER_API_URL}/mfa/verify/`, { otp_token: token }, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const challengeMfa = (token) => apiClient.post(`${USER_API_URL}/mfa/challenge/`, { otp_token: token }, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const disableMfa = () => apiClient.post(`${USER_API_URL}/mfa/disable/`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });

// --- Recovery Codes ---
export const getRecoveryCodes = () => apiClient.get(`${USER_API_URL}/mfa/recovery-codes/`);
// Verify a recovery code during MFA challenge using the existing challenge endpoint
export const verifyRecoveryCode = (code) => apiClient.post(`${USER_API_URL}/mfa/challenge/`, { recovery_code: code });
export const generateNewRecoveryCodes = () => apiClient.post(`${USER_API_URL}/mfa/generate-recovery-codes/`);

// --- Admin User Management Endpoints ---
const ADMIN_USERS_URL = `${ADMIN_API_URL}/users`;
export const adminListUsers = () => apiClient.get(`${ADMIN_USERS_URL}/`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const adminGetUser = (userId) => apiClient.get(`${ADMIN_USERS_URL}/${userId}/`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const adminCreateUser = (userData) => apiClient.post(`${ADMIN_USERS_URL}/`, userData, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const adminUpdateUser = (userId, userData) => apiClient.put(`${ADMIN_USERS_URL}/${userId}/`, userData, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const adminPatchUser = (userId, userData) => apiClient.patch(`${ADMIN_USERS_URL}/${userId}/`, userData, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const adminDeleteUser = (userId) => apiClient.delete(`${ADMIN_USERS_URL}/${userId}/`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const adminBulkDeleteUsers = (userIds) => apiClient.post(`${ADMIN_USERS_URL}/bulk-delete/`, { ids: userIds }, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
export const adminSetUserPassword = (userId, newPassword) => apiClient.post(`${ADMIN_USERS_URL}/${userId}/set-password/`, { new_password: newPassword }, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });

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
