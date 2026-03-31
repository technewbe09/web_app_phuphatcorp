import { Outlet } from 'react-router-dom';
import { Calculator } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-semibold text-neutral-900">PhuPhatCorp</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
