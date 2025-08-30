import React, { useState, useEffect } from 'react';
import { Box, CircularProgress,TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, InputAdornment, FormControlLabel, Checkbox, IconButton } from '@mui/material';
import { AutoFixHigh as AutoFixHighIcon, Save as SaveIcon} from '@mui/icons-material';
import { generatApplicationInfo } from '../../../api/aiService';
import { textFieldSx, glassDialogSx, checkBoxSx, gradientButtonSx, CancelButton } from '../../../common';
import { useTranslation } from 'react-i18next';

const ApplicationForm = ({ open, handleClose, application, onSave }) => {
  const { t, i18n } = useTranslation();
  const [appName, setAppName] = useState('');
  const [description, setDescription] = useState('');
  const [checkCommand, setCheckCommand] = useState('');
  const [version, setVersion] = useState('');
  const [icon, setIcon] = useState('');
  const [detectVersion, setDetectVersion] = useState(true);
  const [errors, setErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const isRtl = typeof i18n?.dir === 'function' ? i18n.dir() === 'rtl' : (i18n?.language || '').toLowerCase().startsWith('ar');

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
    setErrors({});
  }, [application, open]);

  const handleChange = (field, value) => {
    switch (field) {
      case 'appName':
        setAppName(value);
        break;
      case 'description':
        setDescription(value);
        break;
      case 'checkCommand':
        setCheckCommand(value);
        break;
      case 'version':
        setVersion(value);
        break;
      case 'icon':
        setIcon(value);
        break;
      case 'detectVersion':
        setDetectVersion(value);
        break;
      default:
        break;
    }
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!appName.trim()) {
      newErrors.appName = t('applicationForm.errors.enterName');
    }
    
    if (!checkCommand.trim()) {
      newErrors.checkCommand = t('applicationForm.errors.enterCheck');
    } else if (detectVersion && !checkCommand.includes('command -v')) {
      newErrors.checkCommand = t('applicationForm.errors.detectVersionOnly');
    }
    
    if (!detectVersion && !version.trim()) {
      newErrors.version = t('applicationForm.errors.enterVersion');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

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
    if (!appName.trim()) {
      setErrors({ appName: t('applicationForm.errors.enterName') });
      return;
    }
    
    setIsGenerating(true);
    setErrors({});
    try {
      const response = await generatApplicationInfo(appName)
      if (response.data) {
        setDescription(response.data.description || '');
        setIcon(response.data.icon_url || '');
      }
    } catch (error) {
      console.error('Failed to generate app info:', error);
      const errorMessage = error.response?.data?.error || error.message || t('applicationForm.errors.aiFailed');
      setErrors({ appName: errorMessage });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperComponent={glassDialogSx}>
      <DialogTitle fontSize={36} fontWeight="bold">
        {application ? t('applicationForm.editTitle') : t('applicationForm.addTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
          <TextField
            label={t('applicationForm.name')}
            fullWidth
            value={appName}
            onChange={(e) => handleChange('appName', e.target.value)}
            error={!!errors.appName}
            helperText={errors.appName || t('applicationForm.nameHint')}
            sx={{...textFieldSx}}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={t('applicationForm.generate')}>
                    <IconButton onClick={handleGenerateInfo} disabled={isGenerating} edge="end">
                      {isGenerating ? <CircularProgress size={24} sx={{ color: '#FE6B8B' }} /> : <AutoFixHighIcon />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label={t('applicationForm.description')}
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => handleChange('description', e.target.value)}
            helperText={t('applicationForm.descriptionHint')}
            sx={{...textFieldSx}}
          />
          <TextField
            label={t('applicationForm.iconUrl')}
            fullWidth
            value={icon}
            onChange={(e) => handleChange('icon', e.target.value)}
            helperText={t('applicationForm.iconHint')}
            sx={{...textFieldSx}}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={detectVersion}
                onChange={(e) => handleChange('detectVersion', e.target.checked)}
                sx={{ 
                  ...checkBoxSx
                }} 
              />
            }
            label={t('applicationForm.detectVersion')}
          />
          {!detectVersion && (
            <TextField
              label={t('applicationForm.version')}
              fullWidth
              value={version}
              error={!!errors.version}
              helperText={errors.version || ''}
              onChange={(e) => handleChange('version', e.target.value)}
              sx={{...textFieldSx}}
            />
          )}
          <TextField
            label={t('applicationForm.checkCommand')}
            fullWidth
            value={checkCommand}
            onChange={(e) => handleChange('checkCommand', e.target.value)}
            error={!!errors.checkCommand}
            helperText={errors.checkCommand || t('applicationForm.checkHint')}
            sx={{...textFieldSx}}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box>
          <CancelButton 
            onClick={handleClose}
            disabled={isGenerating}
            >{t('applicationForm.cancel')}</CancelButton>
        </Box>
        <Box>
          <Button 
            onClick={handleSave}
            startIcon={<SaveIcon sx={{ml: isRtl ? 1 : 0}}/>}
            variant="contained"
            disabled={isGenerating}
            sx={{...gradientButtonSx}}
          >
            {application ? t('applicationForm.update') : t('applicationForm.create')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ApplicationForm;
