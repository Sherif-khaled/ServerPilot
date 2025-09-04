import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import {CircularProgressSx, Background} from '../../../common';


const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Background />
        <CircularProgress size={20} sx={CircularProgressSx} />
        <Typography ml={2} sx={{ color: '#fff' }}>Loading user...</Typography>
      </Box>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
