import apiClient from './apiClient';


export const getAuditSystem = (queryParams) => {
    if (!queryParams) {
        return apiClient.get('/audit/system/');
    }
    if (typeof queryParams === 'string') {
        return apiClient.get(`/audit/system/?${queryParams}`);
    }
    return apiClient.get('/audit/system/', { params: queryParams });
};

export const getAuditLogs = (queryParams) => {
    if (!queryParams) {
        return apiClient.get('/audit/logs/');
    }
    if (typeof queryParams === 'string') {
        return apiClient.get(`/audit/logs/?${queryParams}`);
    }
    return apiClient.get('/audit/logs/', { params: queryParams });
};
export const getAllUsers = () => {
    return apiClient.get('/users/?all=true');
};
