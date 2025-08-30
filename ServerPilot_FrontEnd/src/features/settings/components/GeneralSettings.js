import React, { useMemo, useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { updateProfile } from '../../../api/userService';
import { useAuth } from '../../../AuthContext';
import { CustomSnackbar, useSnackbar, textFieldSx, gradientButtonSx,GlassPaper,SelectSx, CircularProgressSx } from '../../../common';

const GeneralSettings = () => {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const [language, setLanguage] = useState(user?.language || 'en');
  const [saving, setSaving] = useState(false);
  const { snackbar, showSuccess, showError, hideSnackbar } = useSnackbar();

  const direction = useMemo(() => (language === 'ar' ? 'rtl' : 'ltr'), [language]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfile({ language });
      const updated = { ...user, language };
      setUser(updated);
      i18n.changeLanguage(language);
      document.documentElement.dir = direction;
      showSuccess(t('generalSettings.success'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassPaper>
      <Typography sx={{ mb: 2 }}>
        {t('pages.generalSettingsIntro')}
      </Typography>
      <Box sx={{ width: '100%' }}>
        <FormControl fullWidth sx={textFieldSx}>
          <InputLabel id="lang-select-label">{t('common.language')}</InputLabel>
          <Select
            labelId="lang-select-label"
            id="lang-select"
            value={language}
            label={t('common.language')}
            onChange={(e) => setLanguage(e.target.value)}
            sx={textFieldSx}
            MenuProps={{
              PaperProps: {
                sx: {
                  ...SelectSx
                },
              },
            }}
          >
            <MenuItem value="en">{t('common.english')}</MenuItem>
            <MenuItem value="ar">{t('common.arabic')}</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button onClick={handleSave} 
                variant="contained" 
                sx={{ mt: 2, ...gradientButtonSx }}
                disabled={saving}>
        {saving ? <CircularProgress size={20} sx={CircularProgressSx} /> : t('common.save')}
        </Button>
      </Box>
      <CustomSnackbar
        open={snackbar.open}
        onClose={hideSnackbar}
        severity={snackbar.severity}
        message={snackbar.message}
      />
    </GlassPaper>
  );
};

export default GeneralSettings;
