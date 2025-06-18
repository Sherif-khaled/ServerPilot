import React from 'react';
import { Box, Typography, Link, Container, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

const FooterContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'transparent',
})(({ theme, transparent }) => ({
  padding: theme.spacing(2),
  marginTop: 'auto',
  textAlign: 'center',
  ...(transparent
    ? {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
      }
    : {
        backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800],
        borderTop: `1px solid ${theme.palette.divider}`,
      }),
}));

const Footer = ({ transparent, authPage }) => {
  const theme = useTheme();

  const getTextColor = () => {
    if (transparent) {
      if (authPage) {
        return '#fff';
      }
      return theme.palette.mode === 'light' ? theme.palette.text.primary : '#fff';
    }
    return 'text.secondary';
  };

  return (
    <FooterContainer transparent={transparent} component="footer">
      <Container maxWidth="lg">
        <Typography variant="body2" sx={{ color: getTextColor() }}>
          {'Copyright © '}
          <Link color="inherit" href="https://your-website.com/">
            ServerPilot
          </Link>{' '}
          {new Date().getFullYear()}
          {'.'}
        </Typography>
      </Container>
    </FooterContainer>
  );
};

export default Footer;
