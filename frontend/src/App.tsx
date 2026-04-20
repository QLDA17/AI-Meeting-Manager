import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { usePermission } from './hooks/usePermission';
import Layout from './layouts/Layout';
import AdminLayout from './layouts/AdminLayout';

// Lazy loaded pages
import Landing from './pages/Landing';
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const MeetingList = React.lazy(() => import('./pages/MeetingList'));
const MeetingDetail = React.lazy(() => import('./pages/MeetingDetail'));
const CreateMeeting = React.lazy(() => import('./pages/CreateMeeting'));
const MeetingRoom = React.lazy(() => import('./pages/MeetingRoom'));
const JoinMeeting = React.lazy(() => import('./pages/JoinMeeting'));
const UploadAudio = React.lazy(() => import('./pages/meeting/UploadAudio'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const ActionItems = React.lazy(() => import('./pages/ActionItems'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Forbidden = React.lazy(() => import('./pages/Forbidden'));
const GroupDetail = React.lazy(() => import('./pages/group/GroupDetail'));
const CreateGroup = React.lazy(() => import('./pages/group/CreateGroup'));
const OrgAdminConsole = React.lazy(() => import('./pages/org/OrgAdminConsole'));
const SystemAdminConsole = React.lazy(() => import('./pages/admin/SystemAdminConsole'));
const Profile = React.lazy(() => import('./pages/profile/Profile'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Public Only Route Guard (redirect authenticated users to dashboard)
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// Role-based Access Guard
const RoleGuard: React.FC<{ children: React.ReactNode; roles: string[] }> = ({ children, roles }) => {
  const { isSystemAdmin, isOrgAdmin, currentRole } = usePermission();

  const hasAccess =
    (roles.includes('system-admin') && isSystemAdmin) ||
    (roles.includes('org-admin') && (isOrgAdmin || isSystemAdmin)) ||
    (currentRole && roles.includes(currentRole));

  if (!hasAccess) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Không có quyền truy cập</h1>
        <p className="text-gray-600">Bạn không có quyền xem trang này.</p>
      </div>
    );
  }
  return <>{children}</>;
};

const PageLoader: React.FC = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
  </div>
);

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<PublicOnlyRoute><React.Suspense fallback={<PageLoader />}><Login /></React.Suspense></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><React.Suspense fallback={<PageLoader />}><Register /></React.Suspense></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><React.Suspense fallback={<PageLoader />}><ForgotPassword /></React.Suspense></PublicOnlyRoute>} />
      <Route path="/join/:code?" element={<React.Suspense fallback={<PageLoader />}><JoinMeeting /></React.Suspense>} />
      <Route path="/room/:code" element={<React.Suspense fallback={<PageLoader />}><MeetingRoom /></React.Suspense>} />

      {/* Protected Routes (Main Layout) */}
      <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<React.Suspense fallback={<PageLoader />}><Dashboard /></React.Suspense>} />
        <Route path="meetings" element={<React.Suspense fallback={<PageLoader />}><MeetingList /></React.Suspense>} />
        <Route path="meetings/:id" element={<React.Suspense fallback={<PageLoader />}><MeetingDetail /></React.Suspense>} />
        <Route path="create" element={<React.Suspense fallback={<PageLoader />}><CreateMeeting /></React.Suspense>} />
        <Route path="upload" element={<React.Suspense fallback={<PageLoader />}><UploadAudio /></React.Suspense>} />
        <Route path="actions" element={<React.Suspense fallback={<PageLoader />}><ActionItems /></React.Suspense>} />
        <Route path="notifications" element={<React.Suspense fallback={<PageLoader />}><Notifications /></React.Suspense>} />
        
        {/* Group Routes */}
        <Route path="groups/create" element={<React.Suspense fallback={<PageLoader />}><CreateGroup /></React.Suspense>} />
        <Route path="groups/:id" element={<React.Suspense fallback={<PageLoader />}><GroupDetail /></React.Suspense>} />

        {/* Organization Admin Routes */}
        <Route path="org/admin" element={<RoleGuard roles={['org-admin', 'system-admin']}><React.Suspense fallback={<PageLoader />}><OrgAdminConsole /></React.Suspense></RoleGuard>} />
        <Route path="org/admin/:tab" element={<RoleGuard roles={['org-admin', 'system-admin']}><React.Suspense fallback={<PageLoader />}><OrgAdminConsole /></React.Suspense></RoleGuard>} />

        {/* Profile */}
        <Route path="profile" element={<ProtectedRoute><React.Suspense fallback={<PageLoader />}><Profile /></React.Suspense></ProtectedRoute>} />
      </Route>

      {/* System Admin Routes (Separate Layout) */}
      <Route path="/admin" element={<ProtectedRoute><RoleGuard roles={['system-admin']}><AdminLayout /></RoleGuard></ProtectedRoute>}>
        <Route path="console" element={<React.Suspense fallback={<PageLoader />}><SystemAdminConsole /></React.Suspense>} />
        <Route path="organizations" element={<React.Suspense fallback={<PageLoader />}><SystemAdminConsole /></React.Suspense>} />
        <Route path="users" element={<React.Suspense fallback={<PageLoader />}><SystemAdminConsole /></React.Suspense>} />
        <Route path="ai-services" element={<React.Suspense fallback={<PageLoader />}><SystemAdminConsole /></React.Suspense>} />
        <Route path="prompts" element={<React.Suspense fallback={<PageLoader />}><SystemAdminConsole /></React.Suspense>} />
        <Route path="notifications" element={<React.Suspense fallback={<PageLoader />}><SystemAdminConsole /></React.Suspense>} />
        <Route path="audit-logs" element={<React.Suspense fallback={<PageLoader />}><SystemAdminConsole /></React.Suspense>} />
        <Route path="settings" element={<React.Suspense fallback={<PageLoader />}><SystemAdminConsole /></React.Suspense>} />
      </Route>

      {/* Error Pages */}
      <Route path="/403" element={<React.Suspense fallback={<PageLoader />}><Forbidden /></React.Suspense>} />
      <Route path="/404" element={<React.Suspense fallback={<PageLoader />}><NotFound /></React.Suspense>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{ style: { background: '#363636', color: '#fff' } }} />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
