import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import UserListPage from '@/pages/admin/UserListPage';
import UserCreatePage from '@/pages/admin/UserCreatePage';
import UserEditPage from '@/pages/admin/UserEditPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import SkuFactoryUploadPage from '@/pages/admin/SkuFactoryUploadPage';
import SkuFactoryListPage from '@/pages/admin/SkuFactoryListPage';
import ExecuteDataPage from '@/pages/admin/ExecuteDataPage';

function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();

  if (isLoading) return <LoadingScreen />;
  if (user?.role !== 'admin' && user?.role !== 'manager') return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <PublicRoute>
        <ResetPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: '/admin/dashboard',
    element: (
      <AuthGuard>
        <AdminGuard>
          <DashboardPage />
        </AdminGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <AuthGuard>
        <AdminGuard>
          <UserListPage />
        </AdminGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/admin/users/new',
    element: (
      <AuthGuard>
        <AdminGuard>
          <UserCreatePage />
        </AdminGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/admin/users/:id/edit',
    element: (
      <AuthGuard>
        <AdminGuard>
          <UserEditPage />
        </AdminGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/admin/master-data/sku-factory',
    element: (
      <AuthGuard>
        <AdminGuard>
          <SkuFactoryListPage />
        </AdminGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/admin/master-data/sku-factory/upload',
    element: (
      <AuthGuard>
        <AdminGuard>
          <SkuFactoryUploadPage />
        </AdminGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/admin/execute-data',
    element: (
      <AuthGuard>
        <AdminGuard>
          <ExecuteDataPage />
        </AdminGuard>
      </AuthGuard>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/admin/dashboard" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
];

const router = createBrowserRouter(routes);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
