import React from 'react';
import { TextField } from '@mui/material';

const StyledTextField = React.forwardRef(({ sx = {}, ...props }, ref) => {
  const defaultSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.6)' },
      '&.Mui-focused fieldset': { borderColor: '#FE6B8B' },
      color: 'white',
      borderRadius: '12px',
    },
    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#FE6B8B' },
    '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.7)' }
  };

  return (
    <TextField
      ref={ref}
      variant="outlined"
      sx={{ ...defaultSx, ...sx }}
      {...props}
    />
  );
});

StyledTextField.displayName = 'StyledTextField';

export default StyledTextField;

