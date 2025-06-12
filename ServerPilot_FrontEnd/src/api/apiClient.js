import axios from 'axios';

// Helper function to get CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Enable credentials for session/auth cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Add CSRF token to requests
apiClient.interceptors.request.use(
  (config) => {
    // Add CSRF token to all requests
    if (config.method) {
      const csrfToken = getCookie('csrftoken');
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      } else {
        console.warn('CSRF token not found. Make sure you are logged in.');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication and other common responses
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle password expiration
    if (error.response?.status === 403 && error.response.data?.error === 'password_expired') {
      console.error('Password has expired - redirecting to change password page');
      window.location.href = '/change-password';
      return Promise.reject(error); // Prevent further processing
    }

    // Handle session expiration or authentication errors
    if (error.response?.status === 401) {
      console.error('Authentication required - redirecting to login');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
