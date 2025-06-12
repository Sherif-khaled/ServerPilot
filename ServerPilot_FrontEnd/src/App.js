import React, { useContext } from 'react';
import { ThemeContext } from './ThemeContext';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import Dashboard from './features/core/components/Dashboard';
import UserRegisterForm from './features/users/components/UserRegisterForm';
import UserLoginForm from './features/users/components/UserLoginForm';
import UserProfile from './features/users/components/UserProfile';
import DashboardPage from './features/core/components/DashboardPage'; // Import DashboardPage
import UserList from './features/users/components/UserList';
import CustomerList from './features/customers/components/CustomerList';
import CustomerForm from './features/customers/components/CustomerForm';
import SshTerminalPage from './features/servers/pages/SshTerminalPage';
import ServerList from './features/servers/components/ServerList'; // Import ServerList
import ServerForm from './features/servers/components/ServerForm'; // Import ServerForm
import SettingsPage from './features/settings/pages/SettingsPage';
import UserCreateEditPage from './features/users/pages/UserCreateEditPage'; // Import the new page
import ProtectedRoute from './features/core/components/ProtectedRoute'; // Import ProtectedRoute
import AuditLogList from './features/audit/components/AuditLogList'; // Import AuditLogList
import PasswordPolicyPage from './features/security/pages/PasswordPolicyPage';
import DatabaseManagementPage from './features/database/pages/DatabaseManagementPage';
import ChangePasswordPage from './features/users/pages/ChangePasswordPage';
import ForgotPassword from './features/users/components/ForgotPassword';
import ResetPassword from './features/users/components/ResetPassword';

function AppRoutes({ toggleTheme, currentThemeMode }) {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route path="/login" element={<UserLoginForm onLoginSuccess={() => navigate("/profile", { replace: true })} />} />
      <Route path="/register" element={<UserRegisterForm />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><DashboardPage /></Dashboard>} />
        <Route path="/profile" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><UserProfile /></Dashboard>} />
        <Route path="/change-password" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><ChangePasswordPage /></Dashboard>} />
        <Route path="/users" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><UserList /></Dashboard>} />
        <Route path="/users/new" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><UserCreateEditPage /></Dashboard>} />
        <Route path="/users/edit/:userId" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><UserCreateEditPage /></Dashboard>} />
        {/* Customer Management Routes */}
        <Route path="/customers" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><CustomerList /></Dashboard>} />
        <Route path="/customers/new" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><CustomerForm /></Dashboard>} />
        <Route path="/customers/:customerId/edit" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><CustomerForm /></Dashboard>} />

        {/* Server Management Routes (Nested under Customer) */}
        <Route path="/customers/:customerId/servers" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><ServerList /></Dashboard>} />
        <Route path="/customers/:customerId/servers/add" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><ServerForm /></Dashboard>} />
        <Route path="/customers/:customerId/servers/edit/:serverId" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><ServerForm /></Dashboard>} />
        <Route path="/servers/:serverId/console" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><SshTerminalPage /></Dashboard>} />
        {/* Add other protected dashboard routes here if needed */}
        <Route path="/settings" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><SettingsPage /></Dashboard>} />
        <Route path="/audit-logs" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><AuditLogList /></Dashboard>} />
        <Route path="/password-policy" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><PasswordPolicyPage /></Dashboard>} />
        <Route path="/database-management" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><DatabaseManagementPage /></Dashboard>} />
      </Route>
    </Routes>
  );
}

function App() {
  const { mode, toggleTheme } = useContext(ThemeContext);

  return (
    <Router>
      <AppRoutes toggleTheme={toggleTheme} currentThemeMode={mode} />
    </Router>
  );
}

export default App;
