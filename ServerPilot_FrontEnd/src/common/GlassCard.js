import React from 'react';
import { Card } from '@mui/material';

const GlassCard = ({ sx = {}, children, ...props }) => {
  const defaultSx = {
    background: 'rgba(38, 50, 56, 0.6)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
  };

  return (
    <Card sx={{ ...defaultSx, ...sx }} {...props}>
      {children}
    </Card>
  );
};

export default GlassCard;


