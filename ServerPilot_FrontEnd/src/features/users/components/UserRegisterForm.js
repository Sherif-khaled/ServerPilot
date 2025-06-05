import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import { registerUser } from '../../../api/userService';

export default function UserRegisterForm() {
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '', last_name: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await registerUser(form);
      setSuccess('Registration successful! Check your email to activate your account.');
      setForm({ username: '', email: '', password: '', first_name: '', last_name: '' });
    } catch (err) {
      setError(err.response?.data?.email || err.response?.data?.detail || 'Registration failed');
    }
  };
  return (
    <Box sx={{ maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h5" mb={2}>Register</Typography>
      {success && <Alert severity="success">{success}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField label="Username" name="username" value={form.username} onChange={handleChange} fullWidth margin="normal" required />
        <TextField label="Email" name="email" value={form.email} onChange={handleChange} fullWidth margin="normal" required />
        <TextField label="Password" name="password" type="password" value={form.password} onChange={handleChange} fullWidth margin="normal" required />
        <TextField label="First Name" name="first_name" value={form.first_name} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} fullWidth margin="normal" />
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Register</Button>
      </form>
    </Box>
  );
}
