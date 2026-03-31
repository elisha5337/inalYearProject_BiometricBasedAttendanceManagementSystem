import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from './types';
import { cn } from './lib/utils';
import { ApiError } from './lib/api';
import { fetchCurrentUser, logoutUser } from './lib/auth';

// Public Screens
import Login from './screens/public/Login';
import BiometricTerminal from './screens/public/BiometricTerminal';
import VerificationStatus from './screens/public/VerificationStatus';

// Employee Screens
import EmployeeDashboard from './screens/employee/Dashboard';
import ViewAttendance from './screens/employee/ViewAttendance';
import SubmitLeave from './screens/employee/SubmitLeave';
import LeaveHistory from './screens/employee/LeaveHistory';

// HR Screens
import HRDashboard from './screens/hr/Dashboard';
import ManageEmployees from './screens/hr/ManageEmployees';
import ManageAttendance from './screens/hr/ManageAttendance';
import ManageLeave from './screens/hr/ManageLeave';
import ManageShifts from './screens/hr/ManageShifts';
import GenerateReports from './screens/hr/GenerateReports';

// Admin Screens
import AdminDashboard from './screens/admin/Dashboard';
import ManageUsers from './screens/admin/ManageUsers';
import AuditLogView from './screens/admin/AuditLog';
import SetPolicies from './screens/admin/SetPolicies';
import EnrollBiometrics from './screens/admin/EnrollBiometrics';
import ManageDevices from './screens/admin/ManageDevices';
import ManageWorkflows from './screens/admin/ManageWorkflows';
import AdminNotifications from './screens/admin/Notifications';
import ExternalIntegrations from './screens/admin/ExternalIntegrations';
import LeaveManagement from './screens/admin/LeaveManagement';
import SystemOversight from './screens/admin/SystemOversight';

// Common Screens
import Notifications from './screens/Notifications';
import Profile from './screens/Profile';
import HelpCenter from './screens/HelpCenter';

// Layout Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrapSession() {
      try {
        const currentUser = await fetchCurrentUser();
        if (mounted) {
          setUser(currentUser);
        }
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
          console.error('Failed to restore session', error);
        }

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrapSession();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <Router>
      <Routes>
        {/* Public Biometric Routes */}
        <Route path="/terminal" element={<BiometricTerminal />} />
        <Route path="/verification" element={<VerificationStatus />} />
        
        {/* Auth Route */}
        <Route path="/login" element={user ? <Navigate to={`/${user.role}/dashboard`} /> : <Login onLogin={setUser} />} />

        {/* Protected Routes */}
        <Route path="/" element={user ? <Navigate to={`/${user.role}/dashboard`} /> : <Navigate to="/terminal" />} />

        {/* Employee Routes */}
        <Route path="/employee/*" element={user?.role === 'employee' ? (
          <Layout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="dashboard" element={<EmployeeDashboard user={user} />} />
              <Route path="attendance" element={<ViewAttendance user={user} />} />
              <Route path="leave/submit" element={<SubmitLeave user={user} />} />
              <Route path="leave/history" element={<LeaveHistory user={user} />} />
              <Route path="profile" element={<Profile user={user} />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="help" element={<HelpCenter />} />
            </Routes>
          </Layout>
        ) : <Navigate to="/login" />} />

        {/* HR Routes */}
        <Route path="/hr/*" element={user?.role === 'hr' ? (
          <Layout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="dashboard" element={<HRDashboard user={user} />} />
              <Route path="employees" element={<ManageEmployees />} />
              <Route path="attendance" element={<ManageAttendance />} />
              <Route path="leave" element={<ManageLeave />} />
              <Route path="shifts" element={<ManageShifts />} />
              <Route path="reports" element={<GenerateReports />} />
              <Route path="profile" element={<Profile user={user} />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="help" element={<HelpCenter />} />
            </Routes>
          </Layout>
        ) : <Navigate to="/login" />} />

        {/* Admin Routes */}
        <Route path="/admin/*" element={user?.role === 'admin' ? (
          <Layout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard user={user} />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="audit" element={<AuditLogView />} />
              <Route path="policies" element={<SetPolicies />} />
              <Route path="enroll" element={<EnrollBiometrics />} />
              <Route path="devices" element={<ManageDevices />} />
              <Route path="workflows" element={<ManageWorkflows />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="integrations" element={<ExternalIntegrations />} />
              <Route path="leave" element={<LeaveManagement />} />
              <Route path="oversight" element={<SystemOversight />} />
              <Route path="profile" element={<Profile user={user} />} />
              <Route path="help" element={<HelpCenter />} />
            </Routes>
          </Layout>
        ) : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

function Layout({ children, user, onLogout }: { children: React.ReactNode, user: User, onLogout: () => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isSidebarCollapsed && "lg:w-20"
      )}>
        <Sidebar 
          user={user} 
          onClose={() => setIsSidebarOpen(false)} 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          user={user} 
          onLogout={onLogout} 
          onMenuClick={() => setIsSidebarOpen(true)} 
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 relative">
          <div className="max-w-7xl mx-auto h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
