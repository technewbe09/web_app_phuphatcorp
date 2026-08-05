import { type SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              'w-full px-3 py-2 pr-9 border rounded-lg text-neutral-900 dark:text-neutral-100 appearance-none',
              'bg-white dark:bg-neutral-800',
              'focus:outline-none focus:ring-1 focus:ring-neutral-400/60 focus:border-neutral-400',
              'dark:focus:ring-neutral-500 dark:focus:border-neutral-500',
              'disabled:bg-neutral-100 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed',
              error
                ? 'border-red-500 focus:ring-red-400 focus:border-red-500'
                : 'border-neutral-300 dark:border-neutral-600',
              className,
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
