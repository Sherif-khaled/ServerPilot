import React from 'react';
import { CardContent, Typography, CircularProgress, Grid } from '@mui/material';
import { GlassCard, gradientButtonSx, textFieldSx, switchSx, CircularProgressSx } from '../../../common';
import { FormControlLabel, Switch, TextField, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

const BackupScheduleCard = ({
  schedule,
  scheduleLoading,
  scheduleSaving,
  onChange,
  onSave,
}) => {
  const { t } = useTranslation();
  return (
    <GlassCard sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold' }}>
          {t('backups.scheduleTitle')}
        </Typography>
        {scheduleLoading ? (
          <CircularProgress size={20} sx={CircularProgressSx} />
        ) : (
          <Grid container spacing={2} alignItems="center">
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={schedule.enabled}
                    onChange={onChange}
                    name="enabled"
                    sx={{
                      ...switchSx,
                    }}
                  />
                }
                label={t('backups.enableDaily')}
                sx={{ color: '#fff' }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label={t('backups.hourUtc')}
                type="number"
                name="hour"
                value={schedule.hour}
                onChange={onChange}
                disabled={!schedule.enabled}
                sx={{ ...textFieldSx }}
                fullWidth
                inputProps={{ min: 0, max: 23 }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label={t('backups.minuteUtc')}
                type="number"
                name="minute"
                value={schedule.minute}
                onChange={onChange}
                disabled={!schedule.enabled}
                sx={{ ...textFieldSx }}
                fullWidth
                inputProps={{ min: 0, max: 59 }}
              />
            </Grid>
            <Grid size={12}>
              <Button
                variant="contained"
                onClick={() => {
                  onSave();
                }}
                disabled={scheduleSaving || !schedule.enabled}
                sx={{
                  ...gradientButtonSx,
                }}
              >
                {scheduleSaving ? (
                  <CircularProgress size={20} sx={CircularProgressSx} />
                ) : (
                  t('backups.saveSchedule')
                )}
              </Button>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </GlassCard>
  );
};

export default BackupScheduleCard;


