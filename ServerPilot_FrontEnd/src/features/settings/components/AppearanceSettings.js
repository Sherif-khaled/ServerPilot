import React, { useContext, useState, useEffect } from 'react';
import { Typography, Box, Switch, FormControlLabel } from '@mui/material';
import { ThemeContext } from '../../../ThemeContext';

const AppearanceSettings = () => {
  const { mode, toggleTheme } = useContext(ThemeContext);

   const [dashboardAnimations, setDashboardAnimations] = useState(
    () => JSON.parse(localStorage.getItem('dashboardAnimations')) ?? false
  );

  useEffect(() => {
    localStorage.setItem('dashboardAnimations', JSON.stringify(dashboardAnimations));
  }, [dashboardAnimations]);


  return (
    <Box sx={{ border: '1px solid', borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 1, p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Appearance
      </Typography>
     <Box>
       <FormControlLabel
        control={<Switch 
          checked={mode === 'dark'} 
          onChange={toggleTheme} 
          sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#FE6B8B',
                },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#FE6B8B',
                },
              }}/>}
        label="Dark Mode"
      />
     </Box>
      <Box>
        <FormControlLabel
        control={
          <Switch
            checked={dashboardAnimations}
            onChange={e => setDashboardAnimations(e.target.checked)}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#FE6B8B',
                },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#FE6B8B',
                },
              }}
          />
        }
        label="Enable Dashboard Animations"
      />
      </Box>
    </Box>
  );
};

export default AppearanceSettings;
