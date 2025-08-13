import React, { useState, useEffect } from 'react';
import { Box, CircularProgress,TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, InputAdornment, FormControlLabel, Checkbox, IconButton } from '@mui/material';
import { AutoFixHigh as AutoFixHighIcon, Save as SaveIcon} from '@mui/icons-material';
import { generatApplicationInfo } from '../../../api/aiService';
import { textFieldSx, glassDialogSx, checkBoxSx, gradientButtonSx, CancelButton } from '../../../common';

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
      const response = await generatApplicationInfo(appName)
      if (response.data) {
        setDescription(response.data.description || '');
        setIcon(response.data.icon_url || '');
      }
    } catch (error) {
      console.error('Failed to generate app info:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate AI content.';
      setValidationError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperComponent={glassDialogSx}>
      <DialogTitle fontSize={36} fontWeight="bold">{application ? 'Edit Application' : 'Add Application'}</DialogTitle>
      <DialogContent dividers>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
          <TextField
            label="Application Name *"
            fullWidth
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            error={!!validationError}
            helperText={validationError || "Use Technical Name of the Application e.g., 'nginx' or 'node'"}
            sx={{...textFieldSx}}
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
            helperText="A brief description of the application"
            sx={{...textFieldSx}}
          />
          <TextField
            label="Icon URL"
            fullWidth
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            helperText="URL for the application's icon"
            sx={{...textFieldSx}}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={detectVersion}
                onChange={(e) => setDetectVersion(e.target.checked)}
                sx={{ 
                  ...checkBoxSx
                }} 
              />
            }
            label="Detect Application Version"
          />
          {!detectVersion && (
            <TextField
              label="Version *"
              fullWidth
              value={version}
              error={!!validationError}
              helperText={validationError || ''}
              onChange={(e) => setVersion(e.target.value)}
              sx={{...textFieldSx}}
            />
          )}
          <TextField
            label="Check Command *"
            fullWidth
            value={checkCommand}
            onChange={(e) => setCheckCommand(e.target.value)}
            error={!!validationError}
            helperText={validationError || "e.g., 'command -v node' or 'systemctl status nginx'"}
            sx={{...textFieldSx}}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box>
          <CancelButton 
            onClick={handleClose}
            disabled={isGenerating}
            >Cancel</CancelButton>
        </Box>
        <Box>
          <Button 
            onClick={handleSave}
            startIcon={<SaveIcon />}
            variant="contained"
            disabled={isGenerating}
            sx={{...gradientButtonSx}}
          >
            {application ? 'Update' : 'Create'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ApplicationForm;
