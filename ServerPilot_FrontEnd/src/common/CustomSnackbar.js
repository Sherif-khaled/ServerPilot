import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled Alert component with glassmorphic theme
const StyledAlert = styled(Alert)(({ theme, severity }) => ({
  width: '100%',
  background: severity === 'success' 
    ? 'rgba(76, 175, 80, 0.9)' 
    : severity === 'error' 
    ? 'rgba(211, 47, 47, 0.9)' 
    : severity === 'warning' 
    ? 'rgba(255, 152, 0, 0.9)' 
    : 'rgba(33, 150, 243, 0.9)',
  color: '#fff',
  backdropFilter: 'blur(8px) saturate(160%)',
  WebkitBackdropFilter: 'blur(8px) saturate(160%)',
  border: '1px solid rgba(255, 255, 255, 0.125)',
  borderRadius: '8px',
  '& .MuiAlert-icon': { 
    color: '#fff' 
  },
  '& .MuiAlert-action': { 
    color: '#fff' 
  },
  '& .MuiAlert-message': {
    color: '#fff',
    fontWeight: 500
  }
}));

/**
 * CustomSnackbar - A reusable snackbar component with glassmorphic styling
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the snackbar is open
 * @param {string} props.message - The message to display
 * @param {string} props.severity - The severity level ('success', 'error', 'warning', 'info')
 * @param {function} props.onClose - Function to call when snackbar closes
 * @param {number} props.autoHideDuration - Duration in milliseconds before auto-hiding (default: 6000)
 * @param {Object} props.anchorOrigin - Position of the snackbar (default: { vertical: 'bottom', horizontal: 'center' })
 * @param {Object} props.sx - Additional styles to apply
 */
const CustomSnackbar = ({
  open = false,
  message = '',
  severity = 'success',
  onClose,
  autoHideDuration = 2000,
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
  sx = {},
  ...props
}) => {
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    onClose && onClose(event, reason);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={anchorOrigin}
      sx={{
        '& .MuiSnackbar-root': {
          zIndex: 9999
        },
        ...sx
      }}
      {...props}
    >
      <StyledAlert 
        onClose={handleClose} 
        severity={severity}
        elevation={6}
      >
        {message}
      </StyledAlert>
    </Snackbar>
  );
};

export default CustomSnackbar;
