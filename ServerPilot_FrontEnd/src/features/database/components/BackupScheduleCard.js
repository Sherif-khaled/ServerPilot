import React from 'react';
import { CardContent, Typography, CircularProgress, Grid } from '@mui/material';
import { GlassCard, gradientButtonSx, textFieldSx, switchSx, CircularProgressSx } from '../../../common';
import { Box, FormControlLabel, Switch, TextField, Button } from '@mui/material';

const BackupScheduleCard = ({
  schedule,
  scheduleLoading,
  scheduleSaving,
  onChange,
  onSave,
}) => {
  console.log('BackupScheduleCard props:', { schedule, scheduleLoading, scheduleSaving });
  return (
    <GlassCard sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold' }}>
          Automated Backup Schedule
        </Typography>
        {scheduleLoading ? (
          <CircularProgress sx={CircularProgressSx} />
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
                label="Enable Daily Backups"
                sx={{ color: '#fff' }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Hour (UTC)"
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
                label="Minute (UTC)"
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
                  console.log('Save schedule clicked');
                  onSave();
                }}
                disabled={scheduleSaving || !schedule.enabled}
                sx={{
                  ...gradientButtonSx,
                }}
              >
                {scheduleSaving ? (
                  <CircularProgress sx={CircularProgressSx} />
                ) : (
                  'Save Schedule'
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


