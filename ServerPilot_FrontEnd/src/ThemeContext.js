import React, { createContext, useState, useMemo, useEffect, useContext } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import * as userService from './api/userService';
import { useAuth } from './AuthContext';

export const ThemeContext = createContext({
  toggleTheme: () => {},
  mode: 'light',
});

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');
  const { user, setUser } = useAuth();

  useEffect(() => {
    if (user && user.theme) {
      setMode(user.theme);
    }
  }, [user]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'dark'
            ? {
                primary: {
                  main: '#58a6ff', // Links, Info Blue
                },
                secondary: {
                  main: '#8b949e', // Using secondary text color for secondary actions
                },
                background: {
                  default: '#0d1117', // Overall page background
                  paper: '#161b22',   // Cards, dropdowns, menus
                },
                text: {
                  primary: '#c9d1d9',   // Normal text
                  secondary: '#8b949e', // Subtext
                  disabled: '#6e7681',  // Placeholder, disabled
                },
                error: {
                  main: '#da3633', // Danger Red
                },
                success: {
                  main: '#238636', // Success Green
                },
                warning: {
                  main: '#e3b341', // Warning Yellow
                },
                info: {
                  main: '#58a6ff', // Info Blue
                },
                divider: '#30363d', // Border color
                action: {
                  hover: '#21262d' // Tertiary background for hover states
                }
              }
            : {
                // Default light mode palette
                primary: {
                  main: '#1976d2',
                },
                background: {
                  default: '#f4f6f8',
                  paper: '#ffffff',
                },
              }),
        },
      }),
    [mode]
  );

  const toggleTheme = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    try {
      const updatedProfile = await userService.updateProfile({ theme: newMode });
      setMode(newMode);
      // Update the user in AuthContext to keep it in sync
      setUser(updatedProfile);
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ toggleTheme, mode }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
