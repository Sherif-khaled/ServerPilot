import React from 'react';
import { Typography, Paper } from '@mui/material';

const DatabaseManagementPage = () => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Database Management
      </Typography>
      <Typography variant="body1">
        This page will be used for managing the database.
      </Typography>
    </Paper>
  );
};

export default DatabaseManagementPage;

