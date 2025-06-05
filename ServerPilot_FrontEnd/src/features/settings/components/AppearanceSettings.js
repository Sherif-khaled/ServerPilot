import React, { useContext } from 'react';
import { Typography, Box, Switch, FormControlLabel } from '@mui/material';
import { ThemeContext } from '../../../ThemeContext';

const AppearanceSettings = () => {
  const { mode, toggleTheme } = useContext(ThemeContext);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Appearance
      </Typography>
      <FormControlLabel
        control={<Switch checked={mode === 'dark'} onChange={toggleTheme} />}
        label="Dark Mode"
      />
    </Box>
  );
};

export default AppearanceSettings;
