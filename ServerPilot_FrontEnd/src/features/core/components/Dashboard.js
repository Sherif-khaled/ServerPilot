import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box, IconButton, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, useTheme, useMediaQuery, Divider } from '@mui/material';
import { Menu as MenuIcon, AccountCircle, People, Contacts as ContactsIcon, Logout as LogoutIcon, Dashboard as DashboardIcon, Settings as SettingsIcon, Brightness4 as Brightness4Icon, Brightness7 as Brightness7Icon, Storage as StorageIcon, Policy as PolicyIcon, AdminPanelSettings as AdminPanelSettingsIcon, ExpandMore, History as HistoryIcon, SupervisorAccount as SupervisorAccountIcon, Tune as TuneIcon, Security as SecurityIcon } from '@mui/icons-material';
import { NavLink, useNavigate } from 'react-router-dom'; // Use NavLink for active link styling
import { useAuth } from '../../../AuthContext'; // Import useAuth
import { logoutUser } from '../../../api/userService';
import { styled } from '@mui/material/styles';
import { Avatar, Collapse } from '@mui/material';
import Footer from './Footer'; // Import the new Footer component

import NotificationsIcon from '@mui/icons-material/Notifications';

const Background = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'transparent',
  zIndex: -1,
});

const drawerWidth = 240;

export default function Dashboard({ children, toggleTheme, currentThemeMode, overrideBackground }) { // Added theme props
  const { user, logoutAuth } = useAuth(); // Get user and logoutAuth from context
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  // Drawer open state: always open on large screens, toggleable on mobile
  // Sidebar toggleable on all screen sizes
  const [drawerOpen, setDrawerOpen] = React.useState(true);
  const [accountsOpen, setAccountsOpen] = React.useState(false);
  const [systemSettingsOpen, setSystemSettingsOpen] = React.useState(false);
  const [administrationOpen, setAdministrationOpen] = React.useState(false);
  const navigate = useNavigate();

  // When screen size changes, force open on desktop, close on mobile
  React.useEffect(() => {
    if (isSmUp) {
      setDrawerOpen(true);
    } else {
      setDrawerOpen(false);
    }
  }, [isSmUp]);

  const handleDrawerToggle = () => {
    setDrawerOpen((prev) => !prev);
  };

  const handleAccountsClick = () => setAccountsOpen(!accountsOpen);
  const handleSystemSettingsClick = () => setSystemSettingsOpen(!systemSettingsOpen);
  const handleAdministrationClick = () => setAdministrationOpen(!administrationOpen);

  const handleLogout = async () => {
    try {
      await logoutUser(); // Call API to logout
      // No need to re-initialize CSRF token here as userService.logoutUser already does it.
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Proceed with frontend logout even if API call fails to ensure user is logged out on client-side
    } finally {
      logoutAuth(); // Clear user from AuthContext and localStorage
      navigate('/login', { replace: true }); // Redirect to login page
      // Close drawer if it's temporary and open, though typically handled by item click
      if (!isSmUp && drawerOpen) {
        setDrawerOpen(false);
      }
    }
  };



  return (
    <Box sx={{ display: 'flex' }}>
      {!overrideBackground && <Background />}
      <AppBar
        position="fixed"
        sx={{
          width: drawerOpen && isSmUp ? `calc(100% - ${drawerWidth}px)` : '100%',
          ml: drawerOpen && isSmUp ? `${drawerWidth}px` : 0,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(45deg, rgba(15, 32, 39, 0.8), rgba(32, 58, 67, 0.8), rgba(44, 83, 100, 0.8))',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1), 0 8px 12px rgba(0, 0, 0, 0.05), inset 0 -2px 10px rgba(0, 0, 0, 0.1)',
          borderRadius: '0 0 15px 15px',
          transform: 'translateZ(0)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.15), 0 8px 12px rgba(0, 0, 0, 0.1), inset 0 -2px 10px rgba(0, 0, 0, 0.15)',
            transform: 'translateZ(5px)',
          },
        }}
      >
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            aria-label={drawerOpen ? "Hide sidebar" : "Show sidebar"}
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            <Typography variant="h6" component="div">
              Admin Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              System Overview
            </Typography>
          </Box>
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
            {currentThemeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <IconButton color="inherit" sx={{ ml: 1 }}>
            <NotificationsIcon />
          </IconButton>
          <IconButton color="inherit" component={NavLink} to="/settings">
            <SettingsIcon />
          </IconButton>
          {/* User Profile Avatar Link */}
          <IconButton onClick={() => navigate('/profile')} sx={{ p: 0 }}>
            <Avatar alt={user?.username || 'User'} src={user?.profile_photo_url}>
              {user?.username ? user.username.charAt(0).toUpperCase() : <AccountCircle />}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>
      {/* Overlay for mobile when drawer is open */}
      {!isSmUp && drawerOpen && (
        <Box
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            bgcolor: 'rgba(0,0,0,0.3)',
            zIndex: (theme) => theme.zIndex.drawer - 1,
            transition: 'background-color 0.3s',
          }}
        />
      )}
      {drawerOpen && (
        <Drawer
          variant={isSmUp ? 'permanent' : 'temporary'}
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { 
              width: drawerWidth, 
              boxSizing: 'border-box',
              background: 'linear-gradient(45deg, #0f2027, #203a43, #2c5364)',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '4px 0px 15px rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: [1] }}>
              <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', color: '#fff' }}>
                  ServerPilot
              </Typography>
          </Toolbar>
          <Divider />
          <Box sx={{ overflow: 'auto' }} role="presentation">
            <List>
              {(() => {
                const navLinkSx = {
                  '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    transition: 'color 0.2s',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(136, 20, 20, 0.08)',
                    '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                      color: '#fff',
                    },
                  },
                  '&.active': {
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    '& .MuiListItemIcon-root, & .MuiListItemText-primary,': {
                      color: '#FE6B8B',
                    },
                  },
                };

                const nestedNavLinkSx = { ...navLinkSx, pl: 4 };

                return (
                  <>
                    {/* Dashboard */}
                    <ListItem component={NavLink} to="/dashboard" onClick={isSmUp ? undefined : handleDrawerToggle} sx={navLinkSx}>
                      <ListItemIcon sx={{ minWidth: '40px' }}><DashboardIcon /></ListItemIcon>
                      <ListItemText primary="Dashboard" />
                    </ListItem>

                    <Divider sx={{ my: 1 }} />

                    {/* Accounts Section */}
                    <ListItemButton onClick={handleAccountsClick}>
                      <ListItemIcon sx={{ minWidth: '40px' }}><SupervisorAccountIcon /></ListItemIcon>
                      <ListItemText primary="Accounts" primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }} />
                      <ExpandMore sx={{ transform: accountsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </ListItemButton>
                    <Collapse in={accountsOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {/* Profile */}
                        <ListItem component={NavLink} to="/profile" onClick={isSmUp ? undefined : handleDrawerToggle} sx={nestedNavLinkSx}>
                          <ListItemIcon sx={{ minWidth: '40px' }}><AccountCircle /></ListItemIcon>
                          <ListItemText primary="Profile" />
                        </ListItem>
                        {/* Users (conditional) */}
                        {user?.is_staff && (
                          <ListItem component={NavLink} to="/users" onClick={isSmUp ? undefined : handleDrawerToggle} sx={nestedNavLinkSx}>
                            <ListItemIcon sx={{ minWidth: '40px' }}><People /></ListItemIcon>
                            <ListItemText primary="Users" />
                          </ListItem>
                        )}
                        {/* Customers */}
                        <ListItem component={NavLink} to="/customers" onClick={isSmUp ? undefined : handleDrawerToggle} sx={nestedNavLinkSx}>
                          <ListItemIcon sx={{ minWidth: '40px' }}><ContactsIcon /></ListItemIcon>
                          <ListItemText primary="Customers" />
                        </ListItem>
                      </List>
                    </Collapse>

                    {/* Admin sections (conditional) */}
                    {user?.is_staff && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        {/* System Settings Section */}
                        <ListItemButton onClick={handleSystemSettingsClick}>
                          <ListItemIcon sx={{ minWidth: '40px' }}><TuneIcon /></ListItemIcon>
                          <ListItemText primary="System Settings" primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }} />
                          <ExpandMore sx={{ transform: systemSettingsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </ListItemButton>
                        <Collapse in={systemSettingsOpen} timeout="auto" unmountOnExit>
                          <List component="div" disablePadding>
                            {/* Settings */}
                            <ListItem component={NavLink} to="/admin/settings" onClick={isSmUp ? undefined : handleDrawerToggle} sx={nestedNavLinkSx}>
                              <ListItemIcon sx={{ minWidth: '40px' }}><SettingsIcon /></ListItemIcon>
                              <ListItemText primary="Settings" />
                            </ListItem>
                            {/* Password Policy */}
                            <ListItem component={NavLink} to="/password-policy" onClick={isSmUp ? undefined : handleDrawerToggle} sx={nestedNavLinkSx}>
                              <ListItemIcon sx={{ minWidth: '40px' }}><PolicyIcon /></ListItemIcon>
                              <ListItemText primary="Password Policy" />
                            </ListItem>
                          </List>
                        </Collapse>

                        {/* Administration Section */}
                        <ListItemButton onClick={handleAdministrationClick}>
                          <ListItemIcon sx={{ minWidth: '40px' }}><AdminPanelSettingsIcon /></ListItemIcon>
                          <ListItemText primary="Administration" primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }} />
                          <ExpandMore sx={{ transform: administrationOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </ListItemButton>
                        <Collapse in={administrationOpen} timeout="auto" unmountOnExit>
                          <List component="div" disablePadding>
                            {/* Audit Logs */}
                            <ListItem component={NavLink} to="/audit-logs" onClick={isSmUp ? undefined : handleDrawerToggle} sx={nestedNavLinkSx}>
                              <ListItemIcon sx={{ minWidth: '40px' }}><HistoryIcon /></ListItemIcon>
                              <ListItemText primary="Audit Logs" />
                            </ListItem>
                            {/* Database Management */}
                            <ListItem component={NavLink} to="/database-management" onClick={isSmUp ? undefined : handleDrawerToggle} sx={nestedNavLinkSx}>
                              <ListItemIcon sx={{ minWidth: '40px' }}><StorageIcon /></ListItemIcon>
                              <ListItemText primary="Database Management" />
                            </ListItem>
                            {/* Security Risk Roles */}
                            <ListItem component={NavLink} to="/security-risk-roles" onClick={isSmUp ? undefined : handleDrawerToggle} sx={nestedNavLinkSx}>
                              <ListItemIcon sx={{ minWidth: '40px' }}><SecurityIcon /></ListItemIcon>
                              <ListItemText primary="Security Risk Roles" />
                            </ListItem>
                          </List>
                        </Collapse>
                      </>
                    )}

                    <Divider sx={{ my: 1 }} />
                    <ListItemButton onClick={handleLogout} sx={navLinkSx}>
                      <ListItemIcon sx={{ minWidth: '40px' }}><LogoutIcon /></ListItemIcon>
                      <ListItemText primary="Logout" />
                    </ListItemButton>
                  </>
                );
              })()}
            </List>
          </Box>
        </Drawer>
      )}
      {/* Main content area */}
      <Box
        component="main"
        className={drawerOpen ? 'sidebar-open' : 'sidebar-closed'}
        sx={{
          backgroundColor: 'transparent',
          backdropFilter: overrideBackground ? 'none' : 'blur(10px)',
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          transition: 'background-color 0.3s',
          ...(drawerOpen && !isSmUp && {
            filter: 'brightness(0.95)',
            backdropFilter: overrideBackground ? 'none' : 'blur(15px)'
          })
        }}
      >
        <Toolbar />
        {overrideBackground ? (
          children
        ) : (
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1, backgroundColor: 'rgba(38, 50, 56, 0.6)', borderRadius: '8px', padding: '24px' }}>
            {React.cloneElement(children, { sidebarOpen: drawerOpen })}
          </Container>
        )}
        <Footer transparent />
      </Box>
    </Box>
  );
}
