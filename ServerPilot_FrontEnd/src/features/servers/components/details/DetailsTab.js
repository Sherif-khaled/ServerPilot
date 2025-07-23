import React, { useState, useEffect } from 'react';
import { Typography, Chip, Box } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import { testServerConnection } from '../../../../api/serverService';

function DetailsTab({ server, customerId }) {
  const [isOnline, setIsOnline] = useState(null);

  useEffect(() => {
    if (server && server.id && customerId) {
      setIsOnline(null); // Reset on server change
      testServerConnection(customerId, server.id)
        .then(() => setIsOnline(true))
        .catch(() => setIsOnline(false));
    }
  }, [server, customerId]);
  if (!server) {
    return null;
  }

  return (
    <>
      <Typography variant="h6">Server Details</Typography>
      <p>ID: {server.id}</p>
      <p>IP Address: {server.server_ip}</p>
      <p>SSH Port: {server.ssh_port}</p>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="body1" sx={{ mr: 1 }}>Status:</Typography>
        <Chip 
          icon={server.is_active ? <CheckCircleOutlineIcon sx={{ color: 'white !important' }} /> : <HighlightOffOutlinedIcon sx={{ color: 'white !important' }} />}
          label={server.is_active ? 'Active' : 'Inactive'}
          size="small"
          sx={{ 
            backgroundColor: server.is_active ? 'success.main' : 'error.main',
            color: 'white'
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
        <Typography variant="body1" sx={{ mr: 1 }}>Connection:</Typography>
        {isOnline === null ? (
          <Typography variant="body2">Checking...</Typography>
        ) : (
          <Chip 
            icon={isOnline ? <CheckCircleOutlineIcon sx={{ color: 'white !important' }} /> : <HighlightOffOutlinedIcon sx={{ color: 'white !important' }} />}
            label={isOnline ? 'Online' : 'Offline'}
            size="small"
            sx={{ 
              backgroundColor: isOnline ? 'success.main' : 'error.main',
              color: 'white'
            }}
          />
        )}
      </Box>
    </>
  );
}

export default DetailsTab;
