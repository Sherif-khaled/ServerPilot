import React from 'react';
import { Typography } from '@mui/material';

function DetailsTab({ server }) {
  if (!server) {
    return null;
  }

  return (
    <>
      <Typography variant="h6">Server Details</Typography>
      <p>ID: {server.id}</p>
      <p>IP Address: {server.server_ip}</p>
      <p>SSH Port: {server.ssh_port}</p>
      <p>Status: {server.is_active ? 'Active' : 'Inactive'}</p>
    </>
  );
}

export default DetailsTab;
