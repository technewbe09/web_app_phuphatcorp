import { Outlet } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-neutral-800 dark:bg-neutral-200 rounded-xl flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white dark:text-neutral-900" />
          </div>
          <span className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">PhuPhatCorp</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
