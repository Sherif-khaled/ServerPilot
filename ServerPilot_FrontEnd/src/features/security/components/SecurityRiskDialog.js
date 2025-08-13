import React, { useState, useEffect } from 'react';
import {Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, CircularProgress,MenuItem, FormControlLabel, Checkbox, Alert,} from '@mui/material';
import {createSecurityRisk, updateSecurityRisk} from '../../../api/serverService';
import { checkBoxSx, CircularProgressSx, glassDialogSx, gradientButtonSx, textFieldSx, CancelButton } from '../../../common';

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
  const [formData, setFormData] = useState(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editingRisk) {
        setFormData(editingRisk);
      } else {
        setFormData(defaultFormData);
      }
    }
  }, [editingRisk, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (editingRisk) {
        await updateSecurityRisk(editingRisk.id, formData);
        showSuccess('Risk updated successfully!');
      } else {
        await createSecurityRisk(formData);
        showSuccess('Risk created successfully!');
      }
      onSaveSuccess();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
      showError(`Failed to save risk: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperComponent={glassDialogSx}>
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.125)' }}>
        {editingRisk ? 'Edit Security Risk' : 'Add Security Risk'}
      </DialogTitle>
      <DialogContent dividers sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.125)', borderBottom: 'none' }}>
        <Box component="form" sx={{ mt: 2, p: 1 }}>
          {error && <Alert severity="error" sx={{ mb: 2, background: 'rgba(211, 47, 47, 0.8)', color: '#fff' }}>{error}</Alert>}
          <TextField fullWidth margin="normal" label="Title" name="title" value={formData.title} onChange={handleChange} sx={textFieldSx} />
          <TextField fullWidth margin="normal" multiline minRows={2} label="Description" name="description" value={formData.description} onChange={handleChange} sx={textFieldSx} />
          <TextField fullWidth margin="normal" label="Check Command" name="check_command" value={formData.check_command} onChange={handleChange} sx={textFieldSx} />
          <TextField fullWidth margin="normal" label="Match Pattern" name="match_pattern" value={formData.match_pattern} onChange={handleChange} sx={textFieldSx} />
          <TextField fullWidth margin="normal" label="Fix Command" name="fix_command" value={formData.fix_command} onChange={handleChange} sx={textFieldSx} />
          <TextField select fullWidth margin="normal" label="Risk Level" name="risk_level" value={formData.risk_level} onChange={handleChange} sx={textFieldSx} MenuProps={{ PaperProps: { sx: { background: '#2c5364', color: 'white' } } }}>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
          </TextField>
          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={<Checkbox checked={formData.is_enabled} onChange={handleChange} name="is_enabled" sx={checkBoxSx}/>}
              label="Is Enabled"
            />
            <FormControlLabel
              control={<Checkbox checked={formData.expect_non_zero_exit} onChange={handleChange} name="expect_non_zero_exit" sx={checkBoxSx}/>}
              label="Expect Non-Zero Exit"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box>
          <CancelButton onClick={onClose}>Cancel</CancelButton>
        </Box>
        <Box>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            variant="contained"
            sx={{
              ...gradientButtonSx
            }}
          >
            {saving ? <CircularProgress sx={CircularProgressSx} /> : 'Save'}
          </Button>   
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SecurityRiskDialog;
