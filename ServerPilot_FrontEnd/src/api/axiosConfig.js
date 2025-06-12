import axios from 'axios';

// Function to get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const instance = axios.create({
    baseURL: '/api/',
    withCredentials: true, // Send cookies with requests
});

// Add a request interceptor to attach the CSRF token to every state-changing request
instance.interceptors.request.use(function (config) {
    // We only need to add the token for methods that can cause side effects
    if (!(['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(config.method.toUpperCase()))) {
        const token = getCookie('csrftoken');
        if (token) {
            config.headers['X-CSRFToken'] = token;
        }
    }
    return config;
});

export default instance;
