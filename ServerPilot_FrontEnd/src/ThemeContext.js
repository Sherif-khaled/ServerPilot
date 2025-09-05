import React, { createContext, useState, useMemo, useEffect } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { create } from 'jss';
import rtl from 'jss-rtl';
import { StylesProvider, jssPreset } from '@mui/styles';
import i18n from './i18n';
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

  useEffect(() => {
    const isArabic = i18n.language === 'ar';
    document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', i18n.language || 'en');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const theme = useMemo(
    () =>
      createTheme({
        direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
        typography: {
          fontFamily: i18n.language === 'ar'
            ? 'Cairo, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
            : undefined,
        },
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
                // Modern light mode palette
                primary: {
                  main: '#007BFF', // A modern, vibrant blue
                  contrastText: '#ffffff',
                },
                secondary: {
                  main: '#6c757d', // A neutral gray for secondary actions
                  contrastText: '#ffffff',
                },
                background: {
                  default: '#f8f9fa', // A very light gray for the background
                  paper: '#ffffff',   // White for cards and surfaces
                },
                text: {
                  primary: '#212529',   // Dark gray for primary text for better readability
                  secondary: '#6c757d', // Lighter gray for secondary text
                  disabled: '#adb5bd',  // A suitable shade for disabled text
                },
                error: {
                  main: '#dc3545', // A standard, clear red for errors
                },
                success: {
                  main: '#28a745', // A clear green for success states
                },
                warning: {
                  main: '#ffc107', // A standard warning yellow
                },
                info: {
                  main: '#17a2b8', // A calm blue for informational messages
                },
                divider: '#dee2e6', // A light divider color
                action: {
                  hover: 'rgba(0, 0, 0, 0.04)', // A subtle hover effect
                  selected: 'rgba(0, 123, 255, 0.08)', // Light blue for selected items
                  disabled: 'rgba(0, 0, 0, 0.06)',
                  disabledBackground: 'rgba(0, 0, 0, 0.12)',
                }
              }),
        },
      }),
    // i18n.language is read from a stable singleton; rerenders are handled by i18n itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const jss = useMemo(() => {
    const j = create({ plugins: [...jssPreset().plugins, rtl()] });
    return j;
  }, []);

  return (
    <ThemeContext.Provider value={{ toggleTheme, mode }}>
      <StylesProvider jss={jss}>
        <MUIThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </MUIThemeProvider>
      </StylesProvider>
    </ThemeContext.Provider>
  );
};
