import React, { useContext, useState, useEffect } from 'react';
import { Typography, Box, Switch, FormControlLabel } from '@mui/material';
import { ThemeContext } from '../../../ThemeContext';
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';

const AppearanceSettings = () => {
  const { mode, toggleTheme } = useContext(ThemeContext);

   const [dashboardAnimations, setDashboardAnimations] = useState(
    () => JSON.parse(localStorage.getItem('dashboardAnimations')) ?? false
  );

  useEffect(() => {
    localStorage.setItem('dashboardAnimations', JSON.stringify(dashboardAnimations));
  }, [dashboardAnimations]);

  const GlassPaper = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.125)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    padding: theme.spacing(3),
    color: '#fff',
}));



  return (
    <GlassPaper>
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
    </GlassPaper>
  );
};

export default AppearanceSettings;
