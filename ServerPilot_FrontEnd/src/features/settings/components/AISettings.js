import React, { useState, useEffect } from 'react';
import {Box,Button,CircularProgress,FormControl,InputLabel,MenuItem,Select,TextField,Typography} from '@mui/material';
import apiClient from '../../../api/apiClient';

import { CustomSnackbar, useSnackbar, textFieldSx, gradientButtonSx,GlassPaper,SelectSx, CircularProgressSx } from '../../../common';
import { useTranslation } from 'react-i18next';


const AISettings = () => {
    const [provider, setProvider] = useState('OpenAI');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gpt-3.5-turbo');
    const [modelsList, setModelsList] = useState([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();
    const { t } = useTranslation();

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get('/ai/settings/');
                if (response.status === 200) {
                    const data = response.data;
                    setProvider(data.provider || 'OpenAI');
                    setModel(data.model || 'gpt-3.5-turbo');
                }
            } catch (err) {
                if (err.response && err.response.status !== 404) {
                    showError(t('settingsAI.loadFail'));
                } else if (!err.response) {
                    showError(t('settingsAI.loadGenericFail'));
                }
            } finally {
                setLoading(false);
            }
        };
        const fetchModels = async () => {
            setModelsLoading(true);
            try {
                const response = await apiClient.get('/ai/models/');
                if (response.data.models) {
                    setModelsList(response.data.models);
                }
            } catch (err) {
                showError(t('settingsAI.loadModelsFail'));
            } finally {
                setModelsLoading(false);
            }
        };

        fetchSettings();
        fetchModels();
    }, [showError, showSuccess, t]);

    // Ensure that the currently selected model is available in the options
    // once models are loaded, to avoid MUI out-of-range value warnings.
    useEffect(() => {
        if (model && modelsList.length && !modelsList.includes(model)) {
            setModelsList((prev) => [model, ...prev]);
        }
    }, [model, modelsList]);

    // If the backend returns no models, still provide the current model as the only option
    useEffect(() => {
        if (!modelsLoading && model && modelsList.length === 0) {
            setModelsList([model]);
        }
    }, [modelsLoading, model, modelsList.length]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await apiClient.put('/ai/settings/', {
                provider,
                api_key: apiKey,
                model,
            });
            if (response.status === 200) {
                showSuccess(t('settingsAI.saveSuccess'));
            } else {
                showError(response.data.error || t('settingsAI.saveFail'));
            }
        } catch (err) {
            showError(err.response?.data?.error || t('settingsAI.saveGenericFail'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <GlassPaper>
             <Typography variant="h6" gutterBottom>
                {t('settingsAI.title')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
                {t('settingsAI.description')}
            </Typography>
            
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                    <CircularProgress size={20} sx={{ color: '#FE6B8B' }} />
                </Box>
            ) : (
                <Box component="form" noValidate autoComplete="off">
                    <FormControl fullWidth sx={{...textFieldSx, mb: 2 }} >
                        <InputLabel>{t('settingsAI.provider')}</InputLabel>
                        <Select
                            value={provider}
                            label={t('settingsAI.provider')}
                            onChange={(e) => setProvider(e.target.value)}
                            MenuProps={{
                                PaperProps: {
                                  sx: {
                                    ...SelectSx
                                  },
                                },
                              }}
                        >
                            <MenuItem value={"OpenAI"}>OpenAI</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label={t('settingsAI.apiKey')}
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        sx={{ ...textFieldSx, mb: 2 }}
                        placeholder={t('settingsAI.apiKeyPlaceholder')}
                        helperText={t('settingsAI.apiKeyHelper')}
                    />
                    <FormControl fullWidth sx={{...textFieldSx, mb: 2 }} disabled={modelsLoading}>
                        <InputLabel>{t('settingsAI.model')}</InputLabel>
                        <Select
                            value={model}
                            label={t('settingsAI.model')}
                            onChange={(e) => setModel(e.target.value)}
                            MenuProps={{
                                PaperProps: {
                                  sx: {
                                    ...SelectSx
                                  },
                                },
                              }}
                        >
                            {modelsLoading ? (
                                // Provide a temporary option that matches the current value
                                // so the Select does not warn about an out-of-range value.
                                <MenuItem value={model}>
                                    <CircularProgress size={20} sx={{ color: '#FE6B8B' }} />
                                </MenuItem>
                            ) : (
                                modelsList.map((modelName) => (
                                    <MenuItem key={modelName} value={modelName}>
                                        {modelName}
                                    </MenuItem>
                                ))
                            )}
                        </Select>
                    </FormControl>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                        <Button
                            variant="contained"
                            onClick={handleSave}
                            disabled={loading || !apiKey}
                            sx={{
                               ...gradientButtonSx
                            }}
                        >
                            {loading ? <CircularProgress size={20} sx={CircularProgressSx} /> : t('settingsAI.save')}
                        </Button>
                    </Box>
                </Box>
            )}
            <CustomSnackbar
                open={snackbar.open}
                onClose={hideSnackbar}
                severity={snackbar.severity}
                message={snackbar.message}
            />
        </GlassPaper>
    );
};

export default AISettings;
