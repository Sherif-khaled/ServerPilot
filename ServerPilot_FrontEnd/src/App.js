import React, { useContext } from 'react';
import { ThemeContext } from './ThemeContext';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './features/core/components/Dashboard';
import UserRegisterForm from './features/users/components/UserRegisterForm';
import UserLoginForm from './features/users/components/UserLoginForm';
import UserProfile from './features/users/components/UserProfile';
import DashboardPage from './features/core/components/DashboardPage';
import UserList from './features/users/components/UserList';
import CustomerList from './features/customers/components/CustomerList';
import SshTerminalPage from './features/servers/pages/SshTerminalPage';
import ServerList from './features/servers/components/ServerList';
import ServerForm from './features/servers/components/ServerForm';
import ServerDetailsPage from './features/servers/pages/ServerDetailsPage';
import SettingsPage from './features/settings/pages/SettingsPage';
import ProtectedRoute from './features/core/components/ProtectedRoute';
import AuditLogList from './features/audit/components/AuditLogList';
import PasswordPolicyPage from './features/security/pages/PasswordPolicyPage';
import SecurityRiskRolesPage from './features/security/pages/SecurityRiskRolesPage';
import DatabaseManagementPage from './features/database/pages/DatabaseManagementPage';
import ChangePasswordPage from './features/users/pages/ChangePasswordPage';
import AdminSettingsPage from './features/administration/pages/AdminSettingsPage';
import ForgotPassword from './features/users/components/ForgotPassword';
import ResetPassword from './features/users/components/ResetPassword';
import VerifyEmailPage from './features/users/pages/VerifyEmailPage';
import ApplicationsPage from './features/applications/pages/ApplicationsPage';
import AdminUserProfilePage from './features/users/pages/AdminUserProfilePage';
import CustomerProfilePage from './features/customers/pages/CustomerProfilePage';


function AppRoutes({ toggleTheme, currentThemeMode }) {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route path="/login" element={<UserLoginForm onLoginSuccess={() => navigate("/profile", { replace: true })} />} />
      <Route path="/register" element={<UserRegisterForm />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      <Route path="/activate/:uid/:token" element={<VerifyEmailPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><DashboardPage /></Dashboard>} />
        <Route path="/profile" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><UserProfile /></Dashboard>} />
        <Route path="/change-password" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><ChangePasswordPage /></Dashboard>} />
        <Route path="/users" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><UserList /></Dashboard>} />
        <Route path="/users/:userId/profile" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><AdminUserProfilePage /></Dashboard>} />
        {/* Customer Management Routes */}
        <Route path="/customers" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><CustomerList /></Dashboard>} />
        <Route path="/customers/:customerId/profile" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><CustomerProfilePage /></Dashboard>} />

        {/* Server Management Routes (Nested under Customer) */}
        <Route path="/customers/:customerId/servers" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><ServerList /></Dashboard>} />
        <Route path="/customers/:customerId/servers/:serverId" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><ServerDetailsPage /></Dashboard>} />
        <Route path="/customers/:customerId/servers/add" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><ServerForm /></Dashboard>} />
        <Route path="/customers/:customerId/servers/edit/:serverId" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><ServerForm /></Dashboard>} />
        <Route path="/customers/:customerId/servers/:serverId/console" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><SshTerminalPage /></Dashboard>} />
        {/* Add other protected dashboard routes here if needed */}
        <Route path="/settings" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><SettingsPage /></Dashboard>} />
        <Route path="/audit-logs" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><AuditLogList /></Dashboard>} />
        <Route path="/password-policy" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><PasswordPolicyPage /></Dashboard>} />
        <Route path="/database-management" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode} overrideBackground><DatabaseManagementPage /></Dashboard>} />
        <Route path="/security-risk-roles" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><SecurityRiskRolesPage /></Dashboard>} />
        <Route path="/admin/settings" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><AdminSettingsPage /></Dashboard>} />
        <Route path="/applications" element={<Dashboard toggleTheme={toggleTheme} currentThemeMode={currentThemeMode}><ApplicationsPage /></Dashboard>} />
      </Route>
    </Routes>
  );
}

function App() {
  const { mode, toggleTheme } = useContext(ThemeContext);

  return (
    <AppRoutes toggleTheme={toggleTheme} currentThemeMode={mode} />
  );
}

export default App;
