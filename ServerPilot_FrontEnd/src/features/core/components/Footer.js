import React from 'react';
import { Box, Typography, Link, Container } from '@mui/material';
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
        color: '#fff',
      }
    : {
        backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800],
        borderTop: `1px solid ${theme.palette.divider}`,
      }),
}));

const Footer = ({ transparent }) => {
  return (
    <FooterContainer transparent={transparent} component="footer">
      <Container maxWidth="lg">
        <Typography variant="body2" sx={{ color: transparent ? 'inherit' : 'text.secondary' }}>
          {'Copyright '}
          <Link color="inherit" href="https://serverpilot.io/">
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
