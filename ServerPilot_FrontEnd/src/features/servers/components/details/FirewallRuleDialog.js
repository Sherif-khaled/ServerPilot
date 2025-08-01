import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert
} from '@mui/material';

const FirewallRuleDialog = ({ open, onClose, onSave, rule, loading, error }) => {
  const [formData, setFormData] = useState({
    port: '',
    protocol: 'tcp',
    source_ip: '0.0.0.0/0',
    action: 'allow',
    description: ''
  });

  useEffect(() => {
    if (rule) {
      setFormData(rule);
    } else {
      setFormData({
        port: '',
        protocol: 'tcp',
        source_ip: '0.0.0.0/0',
        action: 'allow',
        description: ''
      });
    }
  }, [rule, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{rule ? 'Edit Firewall Rule' : 'Add Firewall Rule'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          margin="dense"
          name="port"
          label="Port"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.port}
          onChange={handleChange}
          helperText="e.g., 80, 443, or 22"
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Protocol</InputLabel>
          <Select
            name="protocol"
            value={formData.protocol}
            onChange={handleChange}
            label="Protocol"
          >
            <MenuItem value="tcp">TCP</MenuItem>
            <MenuItem value="udp">UDP</MenuItem>
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          name="source_ip"
          label="Source IP"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.source_ip}
          onChange={handleChange}
          helperText="Use 0.0.0.0/0 for any source"
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Action</InputLabel>
          <Select
            name="action"
            value={formData.action}
            onChange={handleChange}
            label="Action"
          >
            <MenuItem value="allow">Allow</MenuItem>
            <MenuItem value="deny">Deny</MenuItem>
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          name="description"
          label="Description"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.description}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : (rule ? 'Save Changes' : 'Add Rule')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FirewallRuleDialog;
