import React, { useContext, useState, useEffect } from 'react';
import { Typography, Box, Switch, FormControlLabel } from '@mui/material';
import { ThemeContext } from '../../../ThemeContext';
import { GlassPaper,switchSx } from '../../../common';
import { useTranslation } from 'react-i18next';

const AppearanceSettings = () => {
  const { mode, toggleTheme } = useContext(ThemeContext);
  const { t } = useTranslation();

  const [dashboardAnimations, setDashboardAnimations] = useState(
    () => JSON.parse(localStorage.getItem('dashboardAnimations')) ?? false
  );

  useEffect(() => {
    localStorage.setItem('dashboardAnimations', JSON.stringify(dashboardAnimations));
  }, [dashboardAnimations]);

  return (
    <GlassPaper>
      <Typography variant="h6" gutterBottom>
        {t('appearanceSettings.title')}
      </Typography>
     <Box>
       <FormControlLabel
        control={<Switch 
          checked={mode === 'dark'} 
          onChange={toggleTheme} 
          sx={{
              ...switchSx}}/>}
        label={t('appearanceSettings.darkMode')}
      />
     </Box>
      <Box>
        <FormControlLabel
        control={
          <Switch
            checked={dashboardAnimations}
            onChange={e => setDashboardAnimations(e.target.checked)}
            sx={{
              ...switchSx}}
          />
        }
        label={t('appearanceSettings.enableDashboardAnimations')}
      />
      </Box>
    </GlassPaper>
  );
};

export default AppearanceSettings;
