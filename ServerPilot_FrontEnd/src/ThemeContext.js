import React, { createContext, useState, useMemo, useEffect } from 'react';
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
                // Enhanced light mode palette
                primary: {
                  main: '#1976d2', // Material Blue 700
                  contrastText: '#fff',
                },
                secondary: {
                  main: '#9c27b0', // Material Purple 500
                  contrastText: '#fff',
                },
                background: {
                  default: '#f4f6f8', // Soft gray background
                  paper: '#ffffff',   // Cards, dropdowns, menus
                },
                text: {
                  primary: '#1a1a1a',   // Main text, almost black
                  secondary: '#4f5b62', // Subtext, dark gray
                  disabled: '#b0b8c1',  // Placeholder, disabled
                },
                error: {
                  main: '#d32f2f', // Material Red 700
                },
                success: {
                  main: '#388e3c', // Material Green 700
                },
                warning: {
                  main: '#fbc02d', // Material Yellow 700
                },
                info: {
                  main: '#0288d1', // Material Blue 700
                },
                divider: '#e0e0e0', // Light gray divider
                action: {
                  hover: '#f0f0f0', // Subtle hover background
                  selected: '#e3f2fd', // Selected item background
                  disabled: '#f5f5f5', // Disabled background
                  disabledOpacity: 0.38,
                }
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
