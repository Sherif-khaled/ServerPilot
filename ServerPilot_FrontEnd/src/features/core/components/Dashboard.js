import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box, IconButton, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, useTheme, useMediaQuery, Divider } from '@mui/material';
import { Menu as MenuIcon, AccountCircle, People, Contacts as ContactsIcon, Logout as LogoutIcon, Dashboard as DashboardIcon, Settings as SettingsIcon, Brightness4 as Brightness4Icon, Brightness7 as Brightness7Icon, Storage as StorageIcon, Policy as PolicyIcon, AdminPanelSettings as AdminPanelSettingsIcon, ExpandLess, ExpandMore, History as HistoryIcon } from '@mui/icons-material';
import { NavLink, useNavigate } from 'react-router-dom'; // Use NavLink for active link styling
import { useAuth } from '../../../AuthContext'; // Import useAuth
import { logoutUser } from '../../../api/userService';
import { Avatar, Collapse } from '@mui/material';

import NotificationsIcon from '@mui/icons-material/Notifications';


const drawerWidth = 240;

export default function Dashboard({ children, toggleTheme, currentThemeMode }) { // Added theme props
  const { user, logoutAuth } = useAuth(); // Get user and logoutAuth from context
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'));

  // Drawer open state: always open on large screens, toggleable on mobile
  // Sidebar toggleable on all screen sizes
  const [drawerOpen, setDrawerOpen] = React.useState(true);
  const [adminOpen, setAdminOpen] = React.useState(false);
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
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed"
        sx={{
          width: drawerOpen && isSmUp ? `calc(100% - ${drawerWidth}px)` : '100%',
          ml: drawerOpen && isSmUp ? `${drawerWidth}px` : 0,
          zIndex: (theme) => theme.zIndex.drawer + 1, // Ensure AppBar is above the drawer
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
          <Typography variant="h6" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/profile')}>ServerPilot Dashboard</Typography>
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
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.default : '#F8F9FA',
            },
          }}
        >
          <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: [1] }}>
              <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
                  ServerPilot
              </Typography>
          </Toolbar>
          <Divider />
          <Box sx={{ overflow: 'auto' }} role="presentation">
            <List>
              {drawerNavItems.map((item) => {
                const listItemContent = (
                  <>
                    <ListItemIcon sx={{ minWidth: '40px' }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </>
                );

                if (item.path) {
                  return (
                    <ListItem key={item.text} component={NavLink} to={item.path} onClick={isSmUp ? undefined : handleDrawerToggle}
                      sx={{
                        '&.active': {
                          backgroundColor: theme.palette.action.selected,
                          '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                            color: theme.palette.primary.main,
                          },
                        },
                      }}
                    >
                      {listItemContent}
                    </ListItem>
                  );
                } else if (item.action) {
                  return (
                    <ListItemButton key={item.text} onClick={() => { item.action(); if (!isSmUp) handleDrawerToggle(); }}>
                      {listItemContent}
                    </ListItemButton>
                  );
                }
                return null;
              })}
              {user?.is_staff && (
                <>
                  <ListItemButton onClick={handleAdminClick}>
                    <ListItemIcon sx={{ minWidth: '40px' }}>
                      <AdminPanelSettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Administration" />
                    {adminOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={adminOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {[
                        { text: 'Audit Logs', path: '/audit-logs', icon: <HistoryIcon /> },
                        { text: 'Password Policy', path: '/password-policy', icon: <PolicyIcon /> },
                        { text: 'Database Management', path: '/database-management', icon: <StorageIcon /> },
                        { text: 'Settings', path: '/admin/settings', icon: <SettingsIcon /> },
                      ].map((item) => (
                        <ListItem
                          key={item.text}
                          component={NavLink}
                          to={item.path}
                          onClick={isSmUp ? undefined : handleDrawerToggle}
                          sx={{
                            pl: 4,
                            '&.active': {
                              backgroundColor: theme.palette.action.selected,
                              '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                                color: theme.palette.primary.main,
                              },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: '40px' }}>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.text} />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </>
              )}
              <Divider sx={{ my: 1 }} />
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon sx={{ minWidth: '40px' }}><LogoutIcon /></ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </List>
          </Box>
        </Drawer>
      )}
      {/* Main content area */}
      <Box
        component="main"
        className={drawerOpen ? 'sidebar-open' : 'sidebar-closed'}
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[100]
              : theme.palette.grey[900],
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          transition: 'background-color 0.3s',
          ...(drawerOpen && !isSmUp && {
            filter: 'brightness(0.95)',
          }),
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {/*
            Pass sidebar state as context for responsive resizing in child components (listviews, tables, etc.)
            Example usage in child: useContext(SidebarContext) or check parent className
          */}
          {React.cloneElement(children, { sidebarOpen: drawerOpen })}
        </Container>
      </Box>
    </Box>
  );
}
