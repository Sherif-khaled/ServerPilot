import React, { useState, useEffect } from 'react';
import {Box,Button,CircularProgress,FormControl,InputLabel,MenuItem,Select,TextField,Typography,Alert, Paper} from '@mui/material';
import { styled } from '@mui/material/styles';
import api from '../../../api/axiosConfig';
import { CustomSnackbar, useSnackbar } from '../../../common';


const GlassPaper = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    padding: theme.spacing(3),
    color: '#fff',
}));

const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
      '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
      color: 'white',
      borderRadius: '12px',
    },
    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' },
    '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.7)' }
  };

const AISettings = () => {
    const [provider, setProvider] = useState('OpenAI');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gpt-3.5-turbo');
    const [modelsList, setModelsList] = useState([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await api.get('ai/settings/');
                if (response.status === 200) {
                    const data = response.data;
                    setProvider(data.provider || 'OpenAI');
                    setModel(data.model || 'gpt-3.5-turbo');
                }
            } catch (err) {
                if (err.response && err.response.status !== 404) {
                    setError('Failed to fetch AI settings.');
                } else if (!err.response) {
                    setError('An error occurred while fetching settings.');
                }
            } finally {
                setLoading(false);
            }
        };
        const fetchModels = async () => {
            setModelsLoading(true);
            try {
                const response = await api.get('ai/models/');
                if (response.data.models) {
                    setModelsList(response.data.models);
                }
            } catch (err) {
                console.error('Failed to fetch AI models:', err);
                // Optionally set an error state here to inform the user
            } finally {
                setModelsLoading(false);
            }
        };

        fetchSettings();
        fetchModels();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const response = await api.put('ai/settings/', {
                provider,
                api_key: apiKey,
                model,
            });
            if (response.status === 200) {
                showSuccess('AI settings saved successfully!');
            } else {
                showError(response.data.error || 'Failed to save AI settings.');
            }
        } catch (err) {
            showError(err.response?.data?.error || 'An error occurred while saving settings.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GlassPaper>
             <Typography variant="h6" gutterBottom>
                AI Settings
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
                Configure the AI provider and model for generating explanations of security risks.
            </Typography>
            
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                    <CircularProgress sx={{ color: '#FE6B8B' }} />
                </Box>
            ) : (
                <Box component="form" noValidate autoComplete="off">
                    <FormControl fullWidth sx={{...textFieldSx, mb: 2 }} >
                        <InputLabel>Provider</InputLabel>
                        <Select
                            value={provider}
                            label="Provider"
                            onChange={(e) => setProvider(e.target.value)}
                        >
                            <MenuItem value={"OpenAI"}>OpenAI</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="API Key"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        sx={{ ...textFieldSx, mb: 2 }}
                        placeholder="Enter new API key to update"
                        helperText="Your API key is write-only and stored securely."
                    />
                    <FormControl fullWidth sx={{...textFieldSx, mb: 2 }} disabled={modelsLoading}>
                        <InputLabel>Model</InputLabel>
                        <Select
                            value={model}
                            label="Model"
                            onChange={(e) => setModel(e.target.value)}
                        >
                            {modelsLoading ? (
                                <MenuItem value="">
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
                                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                                boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                                color: 'white',
                                borderRadius: '25px',
                                padding: '10px 25px',
                                '&:disabled': {
                                    background: 'rgba(255, 255, 255, 0.3)',
                                },
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Settings'}
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
