import React, { useContext } from 'react';
import { Typography, Box, Switch, FormControlLabel } from '@mui/material';
import { ThemeContext } from '../../../ThemeContext';

const darkModeSwitchSx = { 
  color: 'rgba(255, 255, 255, 0.7)',
  '&.Mui-checked': {
    color: '#FE6B8B',
    '& .MuiSvgIcon-root': {
      border: '2px solid #FE6B8B',
      borderRadius: '3px',
    }
  },
  '&.Mui-checked:hover': {
    backgroundColor: 'rgba(254, 107, 139, 0.1)',
  },
  '& .MuiSvgIcon-root': {
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '3px',
  }
};

const AppearanceSettings = () => {
  const { mode, toggleTheme } = useContext(ThemeContext);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Appearance
      </Typography>
      <FormControlLabel
        control={<Switch checked={mode === 'dark'} onChange={toggleTheme} sx={darkModeSwitchSx}/>}
        label="Dark Mode"
      />
    </Box>
  );
};

export default AppearanceSettings;
