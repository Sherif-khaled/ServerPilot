import axios from './axiosConfig';

// Base URL for user-related API endpoints (non-admin)
const API_URL_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/';
const USER_API_PREFIX = 'users/'; // Specific prefix for user related actions within the API

// Note: withCredentials is already set to true in axiosConfig

// Function to initialize CSRF token for Axios
// This should be called once when the application loads or before the first API call.
export const initializeCsrfToken = async () => {
    try {
        // The get-csrf-token endpoint is under /api/users/
        const response = await axios.get(`${API_URL_BASE}${USER_API_PREFIX}get-csrf-token/`);
        const csrfToken = response.data.csrfToken;
        if (csrfToken) {
            axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
            console.log('CSRF token initialized successfully.');
        } else {
            console.error('CSRF token not found in response from /get-csrf-token/');
        }
    } catch (error) {
        console.error('Failed to initialize CSRF token:', error);
        // Handle error appropriately, maybe retry or show a message to the user
    }
}

// Initialize CSRF token when this module is loaded.
// Note: This is an async operation. If calls are made before this completes,
// they might not have the CSRF token. Consider a more robust solution like
// an Axios interceptor or ensuring this completes before app initialization if issues persist.
initializeCsrfToken();

// Construct the full API_URL for user operations
const API_URL = `${API_URL_BASE}${USER_API_PREFIX}`;

export const registerUser = (data) => axios.post(API_URL, data);
export const loginUser = async (data) => {
    try {
        // The login endpoint should return a session cookie
        const response = await axios.post(`${API_URL}login/`, data, {
            withCredentials: true, // Important for cookies
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        
        // After successful login, we need to update the CSRF token
        // as Django will rotate it on login
        await initializeCsrfToken();
        
        return response.data; // Return the response data (if any)
    } catch (error) {
        // Handle login error (e.g., invalid credentials)
        // Optionally, if the error indicates a CSRF issue itself during login (less common),
        // you might want to re-initialize CSRF here too, but typically login errors are about credentials.
        console.error('Login failed:', error);
        throw error; // Re-throw the error so the calling component can handle it
    }
};
export const getProfile = () => axios.get(`${API_URL}profile/`);
export const updateProfile = (data) => axios.patch(`${API_URL}profile/`, data);
export const listUsers = () => axios.get(API_URL); // General user listing
export const logoutUser = async () => {
    try {
        const response = await axios.post(`${API_URL}logout/`, {});
        // Django also rotates/clears CSRF token on logout.
        // Re-initialize to get a new token for subsequent anonymous/guest actions or a new login.
        await initializeCsrfToken(); 
        return response;
    } catch (error) {
        console.error('Logout failed:', error);
        // Even if logout API call fails, try to get a fresh CSRF token for a clean state.
        await initializeCsrfToken(); 
        throw error;
    }
};

// Admin User Management Endpoints
// Admin User Management Endpoints
const ADMIN_API_URL = `${API_URL}admin/users/`;

export const adminListUsers = () => axios.get(ADMIN_API_URL);
export const adminGetUser = (userId) => axios.get(`${ADMIN_API_URL}${userId}/`);
export const adminCreateUser = (userData) => axios.post(ADMIN_API_URL, userData);
export const adminUpdateUser = (userId, userData) => axios.put(`${ADMIN_API_URL}${userId}/`, userData);
export const adminDeleteUser = (userId) => axios.delete(`${ADMIN_API_URL}${userId}/`);
export const adminBulkDeleteUsers = (userIds) => axios.post(`${ADMIN_API_URL}bulk-delete/`, { ids: userIds });

export const adminSetUserPassword = async (userId, newPassword) => {
    return axios.post(`${ADMIN_API_URL}${userId}/set-password/`, { new_password: newPassword });
};

export const changePassword = async (passwords) => {
    return axios.post(`users/password/change/`, passwords, {
        headers: {
            'Content-Type': 'application/json',
        }
    });
};

export const setupMfa = async () => {
  // First ensure we have a CSRF token
  await initializeCsrfToken();
  // Get the CSRF token from cookies
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  
  return axios.post(`${API_URL}mfa/setup/`, {}, {
    headers: {
      'X-CSRFToken': csrfToken,
      'Content-Type': 'application/json'
    },
    withCredentials: true
  });
};

export const verifyMfa = async (token) => {
  try {
    // Get the CSRF token from cookies
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];

    const response = await axios.post(
      `${API_URL}mfa/verify/`, 
      { otp_token: token },
      {
        headers: {
          'X-CSRFToken': csrfToken,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      }
    );
    return { data: response.data, error: null };
  } catch (error) {
    console.error('MFA verification error:', error.response?.data || error.message);
    return { 
      data: null, 
      error: error.response?.data || { 
        status: 'error', 
        code: 'verification_failed', 
        detail: 'Failed to verify MFA token' 
      } 
    };
  }
};

export const disableMfa = async () => {
  // Get the CSRF token from cookies
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
    
  return axios.post(
    `${API_URL}mfa/disable/`,
    {},
    {
      headers: {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    }
  );
};

export const challengeMfa = async (token) => {
  // Get the CSRF token from cookies
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
    
  return axios.post(
    `${API_URL}mfa/challenge/`,
    { otp_token: token },
    {
      headers: {
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    }
  );
};

// Admin User Statistics Endpoint
export const getUserStats = () => axios.get(`${API_URL}admin/stats/`);

// Customer Management Endpoints (for authenticated users, non-admin)
const CUSTOMER_API_URL = `${API_URL_BASE}customers/`; // Updated to new endpoint /api/customers/

export const getCustomers = () => axios.get(CUSTOMER_API_URL);
export const getCustomerDetails = (customerId) => axios.get(`${CUSTOMER_API_URL}${customerId}/`);
export const createCustomer = (customerData) => axios.post(CUSTOMER_API_URL, customerData);
export const updateCustomer = (customerId, customerData) => axios.put(`${CUSTOMER_API_URL}${customerId}/`, customerData);
export const deleteCustomer = (customerId) => axios.delete(`${CUSTOMER_API_URL}${customerId}/`);

// Customer Type Endpoints
export const getCustomerTypes = () => axios.get(`${CUSTOMER_API_URL}types/`);
