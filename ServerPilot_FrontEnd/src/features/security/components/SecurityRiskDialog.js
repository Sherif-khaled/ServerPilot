import React, { useState, useEffect } from 'react';
import {Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, CircularProgress,MenuItem, FormControlLabel, Checkbox, Alert, Select, FormControl, InputLabel} from '@mui/material';
import {createSecurityRisk, updateSecurityRisk} from '../../../api/serverService';
import { checkBoxSx, CircularProgressSx, glassDialogSx, gradientButtonSx, textFieldSx, CancelButton, SelectSx } from '../../../common';
import { Save as SaveIcon } from '@mui/icons-material';

import { useTranslation } from 'react-i18next';


const defaultFormData = {
  title: '',
  description: '',
  risk_level: 'medium',
  check_command: '',
  match_pattern: '',
  fix_command: '',
  is_enabled: true,
  expect_non_zero_exit: false,
  required_role: 'user',
};

const SecurityRiskDialog = ({ open, onClose, editingRisk, onSaveSuccess, showSuccess, showError }) => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiFormError, setApiFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRtl = typeof i18n?.dir === 'function' ? i18n.dir() === 'rtl' : (i18n?.language || '').toLowerCase().startsWith('ar');

  useEffect(() => {
    if (open) {
      if (editingRisk) {
        setFormData(editingRisk);
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
      setApiFormError('');
    }
  }, [editingRisk, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = t('securityRiskDialog.errors.enterTitle');
    if (!formData.check_command.trim()) newErrors.check_command = t('securityRiskDialog.errors.enterCheckCommand');
    if (!formData.match_pattern.trim()) newErrors.match_pattern = t('securityRiskDialog.errors.enterMatchPattern');
    if (!formData.fix_command.trim()) newErrors.fix_command = t('securityRiskDialog.errors.enterFixCommand');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setApiFormError('');
    setSaving(true);
    try {
      if (editingRisk) {
        await updateSecurityRisk(editingRisk.id, formData);
        showSuccess(t('securityRiskDialog.updateSuccess'));
      } else {
        await createSecurityRisk(formData);
        showSuccess(t('securityRiskDialog.createSuccess'));
      }
      onSaveSuccess();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message;
      setApiFormError(errorMessage);
      showError(`${t('securityRiskDialog.saveFailPrefix')} ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperComponent={glassDialogSx}>
      <DialogTitle fontSize={36} fontWeight="bold">
        {editingRisk ? t('securityRiskDialog.editTitle') : t('securityRiskDialog.addTitle')}
      </DialogTitle>
      <Box component="div" noValidate autoComplete="off" sx={{ mt: 2 }}>

        <DialogContent dividers>
          <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
            {apiFormError && <Alert severity="error" sx={{ mb: 2, background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{apiFormError}</Alert>}
            <TextField 
              fullWidth 
              margin="normal" 
              label={t('securityRiskDialog.title')} 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              error={!!errors.title}
              helperText={errors.title || t('securityRiskDialog.titleHint')}
              sx={textFieldSx} />
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                <TextField 
                  fullWidth 
                  margin="normal" 
                  label={t('securityRiskDialog.checkCommand')} 
                  name="check_command" 
                  value={formData.check_command} 
                  onChange={handleChange} 
                  error={!!errors.check_command}
                  helperText={errors.check_command || t('securityRiskDialog.checkCommandHint')}
                  sx={textFieldSx} />
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                  <TextField 
                    fullWidth 
                    margin="normal" 
                    label={t('securityRiskDialog.matchPattern')} 
                    name="match_pattern" 
                    value={formData.match_pattern} 
                    onChange={handleChange} 
                    error={!!errors.match_pattern}
                    helperText={errors.match_pattern || t('securityRiskDialog.matchPatternHint')}
                    sx={textFieldSx} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                <TextField 
                  fullWidth 
                  margin="normal" 
                  label={t('securityRiskDialog.fixCommand')} 
                  name="fix_command" 
                  value={formData.fix_command} 
                  onChange={handleChange}
                  error={!!errors.fix_command} 
                  helperText={errors.fix_command || t('securityRiskDialog.fixCommandHint')}
                  sx={textFieldSx} />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                <FormControl fullWidth sx={{...textFieldSx, mt: 2}}>
                  <InputLabel id="securityrisk-risk-level" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{t('securityRiskDialog.riskLevel')}</InputLabel>
                  <Select 
                    fullWidth 
                    margin="normal" 
                    label={t('securityRiskDialog.riskLevel')} 
                    name="risk_level" value={formData.risk_level} 
                    onChange={handleChange} sx={textFieldSx} 
                    MenuProps={{
                      PaperProps: {
                        sx: {...SelectSx}},
                    }}
                    required
                    >
                    <MenuItem value="low">{t('securityRiskDialog.low')}</MenuItem>
                    <MenuItem value="medium">{t('securityRiskDialog.medium')}</MenuItem>
                    <MenuItem value="high">{t('securityRiskDialog.high')}</MenuItem>
                    <MenuItem value="critical">{t('securityRiskDialog.critical')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <TextField 
              fullWidth 
              margin="normal" 
              multiline 
              minRows={2} 
              label={t('securityRiskDialog.description')} 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              helperText={t('securityRiskDialog.descriptionHint')}
              sx={textFieldSx} />
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={<Checkbox checked={formData.is_enabled} onChange={handleChange} name="is_enabled" sx={checkBoxSx}/>}
                label={t('securityRiskDialog.isEnabled')}
              />
              <FormControlLabel
                control={<Checkbox checked={formData.expect_non_zero_exit} onChange={handleChange} name="expect_non_zero_exit" sx={checkBoxSx}/>}
                label={t('securityRiskDialog.expectNonZero')}
              />
            </Box>
          </Box>
        </DialogContent>
      </Box>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box>
          <CancelButton onClick={onClose} disabled={saving}>{t('securityRiskDialog.cancel')}</CancelButton>
        </Box>
        <Box>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} sx={CircularProgressSx}/> : <SaveIcon sx={{ml: isRtl ? 1 : 0}}/>}
            sx={{
              ...gradientButtonSx
            }}
          >
            {saving ? <CircularProgress sx={CircularProgressSx} /> : t('securityRiskDialog.save')}
          </Button>   
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SecurityRiskDialog;
