import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@/components/ui/sonner';
import { Shield } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="shrink-0">
        <div className="max-w-md mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{t('app.name')}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-2">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 py-6">
        <p className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {t('app.name')}. All rights reserved.
        </p>
      </footer>

      <Toaster position="top-right" richColors />
    </div>
  );
}
