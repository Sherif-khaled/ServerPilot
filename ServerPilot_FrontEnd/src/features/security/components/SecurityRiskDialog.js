import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  createSecurityRisk,
  updateSecurityRisk,
} from '../../../api/serverService';

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

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
    '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
    color: 'white'
  },
  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' },
  '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.7)' }
};

const StyledFormControlLabel = styled(FormControlLabel)({
  color: 'rgba(255, 255, 255, 0.7)',
  '& .MuiCheckbox-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    '&.Mui-checked': {
      color: '#FE6B8B',
    },
  },
});

const SecurityRiskDialog = ({ open, onClose, editingRisk, onSaveSuccess, setNotification }) => {
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
        setNotification({ open: true, message: 'Risk updated successfully!', severity: 'success' });
      } else {
        await createSecurityRisk(formData);
        setNotification({ open: true, message: 'Risk created successfully!', severity: 'success' });
      }
      onSaveSuccess();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message;
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
            backdropFilter: 'blur(8px) saturate(160%)',
            WebkitBackdropFilter: 'blur(8px) saturate(160%)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.125)',
            color: '#fff',
          }
        }}
      >
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
            <StyledFormControlLabel
              control={<Checkbox checked={formData.is_enabled} onChange={handleChange} name="is_enabled" />}
              label="Is Enabled"
            />
            <StyledFormControlLabel
              control={<Checkbox checked={formData.expect_non_zero_exit} onChange={handleChange} name="expect_non_zero_exit" />}
              label="Expect Non-Zero Exit"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          disabled={saving} 
          variant="contained"
          sx={{
            background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(45deg, #FE6B8B 40%, #FF8E53 100%)',
            },
            borderRadius: 25,
            p: '10px 25px',
          }}
        >
          {saving ? <CircularProgress size={24} color="inherit" /> : 'Save'}
        </Button>   
      </DialogActions>
    </Dialog>
  );
};

export default SecurityRiskDialog;
