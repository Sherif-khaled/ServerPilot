import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT from localStorage if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle authentication and other common responses
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Try refresh flow if refresh token stored
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !error.config.__isRetryRequest) {
        return axios
          .post(`${API_BASE_URL}/users/token/refresh/`, { refresh: refreshToken })
          .then((res) => {
            const newAccess = res.data.access;
            localStorage.setItem('accessToken', newAccess);
            const retryConfig = { ...error.config, __isRetryRequest: true };
            retryConfig.headers = { ...(retryConfig.headers || {}), Authorization: `Bearer ${newAccess}` };
            return apiClient.request(retryConfig);
          })
          .catch(() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(error);
          });
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
