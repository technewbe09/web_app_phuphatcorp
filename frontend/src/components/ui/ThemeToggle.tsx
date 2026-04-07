import { Moon, Sun } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n/useI18n';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100',
        'dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:bg-neutral-700',
        className
      )}
      aria-label={isDark ? t('theme.toggleToLight') : t('theme.toggleToDark')}
      title={isDark ? t('theme.toggleToLight') : t('theme.toggleToDark')}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
