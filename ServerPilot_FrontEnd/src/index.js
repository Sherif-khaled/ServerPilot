import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { unstable_HistoryRouter as HistoryRouter } from 'react-router-dom';
import { createBrowserHistory } from 'history';

import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import axios from 'axios';
import './i18n';

// Configure axios to send the CSRF token with every state-changing request
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;


const history = createBrowserHistory();
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <HistoryRouter history={history} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </HistoryRouter>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);
