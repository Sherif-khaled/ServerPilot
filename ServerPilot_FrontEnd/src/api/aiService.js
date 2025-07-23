import apiClient from './apiClient';

/**
 * Fetches the AI security settings, including provider and connection status.
 */
export const getAISettings = async () => {
    try {
        const response = await apiClient.get('/users/ai-security-settings/');
        return response.data;
    } catch (error) {
        console.error('Error fetching AI settings:', error.response ? error.response.data : error.message);
        throw error;
    }
};

/**
 * Updates the AI security settings.
 * @param {object} settings - The settings object.
 * @param {string} [settings.provider] - The AI provider ('openai', 'gemini').
 * @param {string} [settings.api_key] - The AI API key.
 * @param {string} [settings.security_token] - The security token.
 */
export const updateAISettings = async (settings) => {
    try {
        const response = await apiClient.put('/users/ai-security-settings/', settings);
        return response.data;
    } catch (error) {
        console.error('Error updating AI settings:', error.response ? error.response.data : error.message);
        throw error;
    }
};

/**
 * Tests the connection to the AI provider and saves the settings upon success.
 * @param {object} credentials - The credentials to test.
 * @param {string} credentials.provider - The AI provider.
 * @param {string} credentials.api_key - The API key.
 * @param {string} [credentials.security_token] - The security token.
 */
export const testAIConnection = async (credentials) => {
    try {
        const response = await apiClient.post('/users/test-ai-connection/', credentials);
        return response.data;
    } catch (error) {
        console.error('Error testing AI connection:', error.response ? error.response.data : error.message);
        throw error;
    }
};

/**
 * Checks if the AI security settings are configured.
 */
export const getAIConfigStatus = async () => {
    try {
        const response = await apiClient.get('/users/ai-config-status/');
        return response.data;
    } catch (error) {
        console.error('Error fetching AI config status:', error.response ? error.response.data : error.message);
        throw error;
    }
};
