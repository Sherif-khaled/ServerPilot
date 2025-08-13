import React from 'react';
import { Button } from '@mui/material';
import { Close as CloseIcon} from '@mui/icons-material';

const CancelButton = React.forwardRef(({ sx = {}, ...props }, ref) => {
    const defaultSx = {
      flex: 1, borderRadius: 25, p: '10px 25px'
    };
  
    return (
      <Button
        ref={ref}
        variant="outlined"
        color='error'
        startIcon={<CloseIcon />}
        sx={{ ...defaultSx, ...sx }}
        {...props}
      />
    );
  });
  
  CancelButton.displayName = 'CancelButton';
  
  export default CancelButton;
  