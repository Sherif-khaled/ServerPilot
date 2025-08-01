import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

// Accepts: password (string), sx (optional style overrides)
export function getPasswordStrength(password) {
  let score = 0;
  if (!password) return score;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#1976d2'];

export default function PasswordStrengthMeter({ password, sx }) {
  const score = getPasswordStrength(password);
  const percent = (score / 5) * 100;
  const label = strengthLabels[score - 1] || strengthLabels[0];
  const color = strengthColors[score - 1] || strengthColors[0];

  if (!password) return null;

  return (
    <Box sx={{ mt: 1, mb: 2, ...sx }}>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          height: 8,
          borderRadius: 2,
          backgroundColor: '#333',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color,
          },
        }}
      />
      <Typography sx={{ mt: 0.5, color, fontWeight: 500, fontSize: 14 }}>
        {label}
      </Typography>
    </Box>
  );
}