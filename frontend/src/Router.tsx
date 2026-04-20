import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { DeliveryDataPage } from './pages/admin/DeliveryDataPage';
import { TripCodePage } from './pages/admin/vehicle-data/TripCodePage';
import { VehiclePage } from './pages/admin/vehicle-data/VehiclePage';
import { DriverPage } from './pages/admin/vehicle-data/DriverPage';
import { RoleManagementPage } from './pages/admin/RoleManagementPage';
import { PermissionManagementPage } from './pages/admin/PermissionManagementPage';
import { SchedulePage } from './pages/dispatch/SchedulePage';
import { WeightAdjustmentPage } from './pages/admin/accounting-data/WeightAdjustmentPage';
import { DeliverySchedulePage } from './pages/admin/vehicle-data/DeliverySchedulePage';
import { RiceDeliveryDataPage } from './pages/admin/RiceDeliveryDataPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
      <p className="text-neutral-500 mt-2">Trang đang được phát triển.</p>
    </div>
  );
}

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/accounting" element={<PlaceholderPage title="Sổ kế toán" />} />
            <Route path="/reports" element={<PlaceholderPage title="Báo cáo" />} />
            <Route path="/settings" element={<PlaceholderPage title="Cài đặt" />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/roles" element={<RoleManagementPage />} />
            <Route path="/permissions" element={<PermissionManagementPage />} />
            {/* Delivery Data */}
            <Route path="/delivery-data/5-houses" element={<DeliveryDataPage />} />
            <Route path="/delivery-data/rice" element={<RiceDeliveryDataPage />} />
            {/* Vehicle Data */}
            <Route path="/vehicle-data/trip-codes" element={<TripCodePage />} />
            <Route path="/vehicle-data/vehicles" element={<VehiclePage />} />
            <Route path="/vehicle-data/drivers" element={<DriverPage />} />
            <Route path="/vehicle-data/delivery-schedule" element={<DeliverySchedulePage />} />
            {/* Dispatch */}
            <Route path="/dispatch/schedule" element={<SchedulePage />} />
            {/* Accounting Data */}
            <Route path="/accounting-data/weight-adjustments" element={<WeightAdjustmentPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
