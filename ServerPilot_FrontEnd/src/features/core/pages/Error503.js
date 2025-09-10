import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@mui/system';
import { Background, glassCardSx, gradientButtonSx } from '../../../common';

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

export default function Error503() {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Background />
      <Box
        sx={{
          ...glassCardSx,
          maxWidth: 560,
          width: '95%',
          mx: 'auto',
          my: 'auto',
          textAlign: 'center',
          p: 4,
          position: 'relative',
          overflow: 'visible',
          animation: `${float} 3s ease-in-out infinite`,
        }}
      >
        <BuildCircleIcon
          sx={{
            fontSize: 64,
            color: theme.palette.warning.main,
            mb: 2,
            animation: `${pulse} 2s infinite`,
          }}
        />
        <Typography
          variant="h3"
          component="h1"
          sx={{ fontWeight: 700, mb: 1, color: theme.palette.text.primary }}
        >
          503 — Service unavailable
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, color: theme.palette.text.secondary }}>
          We are performing maintenance or the server is temporarily busy. Please try again later.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(0)}
            sx={gradientButtonSx}
          >
            Retry
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => navigate('/dashboard')}
            sx={{ borderRadius: 5 }}
          >
            Home Port
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
