import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip, InputAdornment, FormControlLabel, Checkbox, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { AutoFixHigh as AutoFixHighIcon } from '@mui/icons-material';
import api from '../../../api/axiosConfig';

const GlassCard = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
  backdropFilter: 'blur(8px) saturate(160%)',
  WebkitBackdropFilter: 'blur(8px) saturate(160%)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
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

const ApplicationForm = ({ open, handleClose, application, onSave }) => {
  const [appName, setAppName] = useState('');
  const [description, setDescription] = useState('');
  const [checkCommand, setCheckCommand] = useState('');
  const [version, setVersion] = useState('');
  const [icon, setIcon] = useState('');
  const [detectVersion, setDetectVersion] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (application) {
      setAppName(application.name || '');
      setDescription(application.description || '');
      setCheckCommand(application.check_command || '');
      setVersion(application.version || '');
      setIcon(application.icon || '');
      setDetectVersion(application.detect_version !== undefined ? application.detect_version : true);
    } else {
      setAppName('');
      setDescription('');
      setCheckCommand('');
      setVersion('');
      setIcon('');
      setDetectVersion(true);
    }
    setValidationError('');
  }, [application, open]);

  const handleSave = () => {
    if (detectVersion && checkCommand && !checkCommand.includes('command -v')) {
      setValidationError("The 'Detect Version' option only works with the 'command -v' command.");
      return;
    }
    else if (!appName) {
      setValidationError('Please enter an application name first.');
      return;
    }
    else if (!checkCommand) {
      setValidationError('Please enter a check command first.');
      return;
    }
    else if (!version && !detectVersion) {
      setValidationError('Please enter a version first.');
      return;
    }

    const appData = {
      name: appName,
      description: description,
      check_command: checkCommand,
      version: detectVersion ? '' : version,
      icon: icon,
      detect_version: detectVersion,
    };
    onSave(appData, application ? application.id : null);
  };

  const handleGenerateInfo = async () => {
    if (!appName) {
      setValidationError('Please enter an application name first.');
      return;
    }
    setIsGenerating(true);
    setValidationError('');
    try {
      const response = await api.post('/ai/generate-app-info/', { app_name: appName });
      if (response.data) {
        setDescription(response.data.description || '');
        setIcon(response.data.icon_url || '');
      }
    } catch (error) {
      console.error('Failed to generate app info:', error);
      setValidationError('Failed to generate AI content. Please check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperComponent={GlassCard}>
      <DialogTitle fontSize={24}>{application ? 'Edit Application' : 'Add Application'}</DialogTitle>
      <DialogContent>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
          <TextField
            label="Application Name"
            fullWidth
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            sx={{ mb: 3, ...textFieldSx }}
            error={!!validationError}
            helperText={validationError || "Use Technical Name of the Application e.g., 'nginx' or 'node'"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Generate Description and Icon with AI">
                    <IconButton onClick={handleGenerateInfo} disabled={isGenerating} edge="end">
                      {isGenerating ? <CircularProgress size={24} sx={{ color: '#FE6B8B' }} /> : <AutoFixHighIcon />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 3, ...textFieldSx }}
            helperText="A brief description of the application"
          />
          <TextField
            label="Icon URL"
            fullWidth
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            sx={{ mb: 3, ...textFieldSx }}
            helperText="URL for the application's icon"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={detectVersion}
                onChange={(e) => setDetectVersion(e.target.checked)}
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-checked': {
                    color: '#FE6B8B',
                    '& .MuiSvgIcon-root': {
                      border: '2px solid #FE6B8B',
                      borderRadius: '3px',
                    }
                  },
                  '&.Mui-checked:hover': {
                    backgroundColor: 'rgba(254, 107, 139, 0.1)',
                  },
                  '& .MuiSvgIcon-root': {
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '3px',
                  }
                }} 
              />
            }
            label="Detect Application Version"
          />
          {!detectVersion && (
            <TextField
              label="Version"
              fullWidth
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              sx={{ mt: 2, mb: 3, ...textFieldSx }}
            />
          )}
          <TextField
            label="Check Command"
            fullWidth
            value={checkCommand}
            onChange={(e) => setCheckCommand(e.target.value)}
            sx={{ mb: 3, ...textFieldSx }}
            error={!!validationError}
            helperText={validationError || "e.g., 'command -v node' or 'systemctl status nginx'"}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose}
          variant="outlined"
          color="error"
          disabled={isGenerating}
          sx={{ flex: 1, borderRadius: 25, p: '10px 25px' }}
          >Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={isGenerating}
          sx={{ flex: 1, borderRadius: 25, p: '10px 25px', background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)', color: 'white', boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)' }}
        >
          {application ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplicationForm;
