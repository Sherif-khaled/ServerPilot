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

// Dynamically set favicon from backend configuration
(() => {
  const ensureFaviconLink = () => {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'icon');
      document.head.appendChild(link);
    }
    return link;
  };

  const setFavicon = (href) => {
    const link = ensureFaviconLink();
    link.setAttribute('href', href);
  };

  // Set a sensible default immediately; CRA serves /favicon.ico from public
  setFavicon('/favicon.ico');

  // Fetch configured favicon and update if available
  fetch('/api/configuration/favicon/')
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && data.logo_url) {
        setFavicon(data.logo_url);
      }
    })
    .catch(() => {
      // Silent fallback to default favicon
    });
})();


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
