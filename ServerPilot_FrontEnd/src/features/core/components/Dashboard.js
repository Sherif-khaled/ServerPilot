import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Switch, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, useTheme, useMediaQuery } from '@mui/material';
import { Menu as MenuIcon, AccountCircle, People, Contacts as ContactsIcon, Logout as LogoutIcon, Dashboard as DashboardIcon, Settings as SettingsIcon, Brightness4 as Brightness4Icon, Brightness7 as Brightness7Icon, Storage as StorageIcon, Policy as PolicyIcon, AdminPanelSettings as AdminPanelSettingsIcon, ExpandLess, ExpandMore } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom'; // Removed Outlet
import { useAuth } from '../../../AuthContext'; // Import useAuth
import { logoutUser } from '../../../api/userService';
import { Avatar, Collapse } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import NotificationsIcon from '@mui/icons-material/Notifications';


const drawerWidth = 240;

export default function Dashboard({ children, toggleTheme, currentThemeMode }) { // Added theme props
  const { user, logoutAuth } = useAuth(); // Get user and logoutAuth from context
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  const [drawerOpen, setDrawerOpen] = React.useState(isSmUp); // Open by default on larger screens
  const [adminOpen, setAdminOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    // Adjust drawer state when screen size changes if needed, e.g., always open on smUp
    // This example keeps it simple: initial state is based on isSmUp, then user can toggle.
    // For a more robust solution, you might want to setDrawerOpen(isSmUp) here
    // or control it more explicitly based on variant changes.
    if (isSmUp) {
        setDrawerOpen(true); // Keep drawer open on larger screens
    } else {
        setDrawerOpen(false); // Ensure drawer is closed by default on smaller screens if it was opened
    }
  }, [isSmUp]);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleAdminClick = () => {
    setAdminOpen(!adminOpen);
  };

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

  // Define drawerNavItems inside the component so it can access handleLogout and user role
  const drawerNavItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Profile', icon: <AccountCircle />, path: '/profile' },
    // Conditionally show the 'Users' link for admin users (is_staff)
    ...(user?.is_staff ? [{ text: 'Users', icon: <People />, path: '/users' }] : []),
    { text: 'Customers', icon: <ContactsIcon />, path: '/customers' },
    { text: 'Logout', icon: <LogoutIcon />, action: handleLogout },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1, // Ensure AppBar is above the drawer
        }}
      >
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            aria-label="menu" 
            onClick={handleDrawerToggle} 
            sx={{ mr: 2, display: { sm: 'none' } }} // Hide on sm and up when drawer is permanent
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/profile')}>ServerPilot Dashboard</Typography>
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
            {currentThemeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <IconButton color="inherit" sx={{ ml: 1 }}>
            <NotificationsIcon />
          </IconButton>
          <IconButton color="inherit" component={Link} to="/settings">
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
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {/* Toolbar spacer to align drawer content below AppBar */}
        <Toolbar /> 
        <Box sx={{ overflow: 'auto' }} role="presentation">
          <List>
            {drawerNavItems.map((item) => {
              const commonProps = {
                button: true,
                key: item.text,
              };
              const listItemContent = (
                <>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </>
              );

              if (item.path) {
                return (
                  <ListItem {...commonProps} component={Link} to={item.path} onClick={isSmUp ? undefined : handleDrawerToggle}>
                    {listItemContent}
                  </ListItem>
                );
              } else if (item.action) {
                return (
                  <ListItem {...commonProps} onClick={() => { item.action(); if (!isSmUp) handleDrawerToggle(); }}>
                    {listItemContent}
                  </ListItem>
                );
              }
              return null; // Should not happen if items are structured correctly
            })}
            {user?.is_staff && (
              <>
                <ListItem button onClick={handleAdminClick}>
                  <ListItemIcon>
                    <AdminPanelSettingsIcon />
                  </ListItemIcon>
                  <ListItemText primary="Administration" />
                  {adminOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItem>
                <Collapse in={adminOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItem button sx={{ pl: 4 }} component={Link} to="/audit-logs" onClick={isSmUp ? undefined : handleDrawerToggle}>
                      <ListItemIcon>
                        <PolicyIcon />
                      </ListItemIcon>
                      <ListItemText primary="Audit Logs" />
                    </ListItem>
                    <ListItem button sx={{ pl: 4 }} component={Link} to="/password-policy" onClick={isSmUp ? undefined : handleDrawerToggle}>
                      <ListItemIcon>
                        <PolicyIcon />
                      </ListItemIcon>
                      <ListItemText primary="Password Policy" />
                    </ListItem>
                    <ListItem button sx={{ pl: 4 }} component={Link} to="/database-management" onClick={isSmUp ? undefined : handleDrawerToggle}>
                      <ListItemIcon>
                        <StorageIcon />
                      </ListItemIcon>
                      <ListItemText primary="Database Management" />
                    </ListItem>
                  </List>
                </Collapse>
              </>
            )}
          </List>
        </Box>
      </Drawer>
      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          // width: { sm: `calc(100% - ${drawerWidth}px)` }, // No longer needed here as AppBar is offset
          mt: '64px', // AppBar height, adjust if your AppBar height is different
        }}
      >
        {/* <Toolbar />  // This Toolbar is a spacer if AppBar is not fixed or if you need to push content down manually */}
        <Container maxWidth="lg"> {/* Or false to disable maxWidth and use full width */}
          {children} {/* Render children passed to Dashboard */}
        </Container>
      </Box>
      
    </Box>
  );
}
