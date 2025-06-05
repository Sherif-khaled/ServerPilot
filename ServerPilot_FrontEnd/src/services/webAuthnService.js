import axios from 'axios';

const API_URL = '/api/users/webauthn/';

// Function to get all security keys for the current user
export const getKeys = () => {
    return axios.get(`${API_URL}`);
};

// Function to begin the registration process
export const beginRegistration = () => {
    return axios.get(`${API_URL}begin_registration/`);
};

// Function to complete the registration process
export const completeRegistration = (credential, keyName) => {
    // The backend expects the raw credential object along with the key name.
    const payload = {
        ...credential,
        name: keyName
    };
    return axios.post(`${API_URL}complete_registration/`, payload, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

// Function to delete a security key
export const deleteKey = (keyId) => {
    return axios.delete(`${API_URL}${keyId}/`);
};

// Function to begin the authentication process
export const beginAuthentication = () => {
    return axios.get(`${API_URL}begin_authentication/`);
};

// Function to complete the authentication process
export const completeAuthentication = (credential) => {
    return axios.post(`${API_URL}complete_authentication/`, credential, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

// Function to generate new recovery codes
export const generateRecoveryCodes = async () => {
    const response = await axios.post('/api/users/recovery-codes/generate/');
    return response.data;
};

export const confirmRecoveryCodes = async () => {
    const response = await axios.post('/api/users/recovery-codes/confirm/');
    return response.data;
};
