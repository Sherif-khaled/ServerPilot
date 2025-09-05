import React from 'react';
import { Button } from '@mui/material';
import { Close as CloseIcon} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';


const CancelButton = React.forwardRef(({ sx = {}, ...props }, ref) => {
  const { t, i18n } = useTranslation();
  const isRtl = typeof i18n?.dir === 'function' ? i18n.dir() === 'rtl' : (i18n?.language || '').toLowerCase().startsWith('ar');

    const defaultSx = {
      flex: 1, borderRadius: 25, p: '10px 25px'
    };
  
    return (
      <Button
        ref={ref}
        variant="outlined"
        color='error'
        startIcon={<CloseIcon sx={{ml: isRtl ? 1 : 0}}/>}
        sx={{ ...defaultSx, ...sx }}
        {...props}
      >
        {t('common.cancel')}
      </Button>
    );
  });
  
  CancelButton.displayName = 'Cancel'
  
  export default CancelButton;
  