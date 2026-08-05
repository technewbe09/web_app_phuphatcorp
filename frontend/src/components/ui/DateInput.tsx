import { useState, useRef, useEffect, useCallback, useLayoutEffect, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const POPOVER_HEIGHT = 320;
const POPOVER_WIDTH = 280;

const fieldFocus =
  'focus:outline-none focus:ring-1 focus:ring-neutral-400/60 focus:border-neutral-400 dark:focus:ring-neutral-500 dark:focus:border-neutral-500';

const navBtn =
  'p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-700 transition-colors';

function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function displayToIso(display: string): string {
  if (!display) return '';
  const parts = display.split('/');
  if (parts.length !== 3) return display;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function DateInput({ value, onChange, error, disabled, className }: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(isoToDisplay(value));
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    setDisplayValue(isoToDisplay(value));
  }, [value]);

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value, isOpen]);

  const updatePopoverPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < POPOVER_HEIGHT && rect.top > spaceBelow;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - POPOVER_WIDTH - 8,
    );

    setPopoverStyle({
      position: 'fixed',
      left,
      width: POPOVER_WIDTH,
      zIndex: 80,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4, top: 'auto' }
        : { top: rect.bottom + 4, bottom: 'auto' }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9/]/g, '');
    setDisplayValue(raw);

    const iso = displayToIso(raw);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const d = new Date(iso + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        onChange(iso);
        return;
      }
    }
    if (raw === '') {
      onChange('');
    }
  };

  const handleDayClick = useCallback((day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const iso = `${viewYear}-${mm}-${dd}`;
    onChange(iso);
    setIsOpen(false);
  }, [viewMonth, viewYear, onChange]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const cells: (number | null)[] = [];
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const totalDays = daysInMonth(viewYear, viewMonth);

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const isSelected = (d: number) => {
    if (!value) return false;
    const parts = value.split('-');
    return (
      parseInt(parts[0]) === viewYear &&
      parseInt(parts[1]) === viewMonth + 1 &&
      parseInt(parts[2]) === d
    );
  };

  const isToday = (d: number) => {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === d
    );
  };

  const calendar = isOpen && !disabled && (
    <div
      ref={popoverRef}
      style={popoverStyle}
      className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl p-3"
    >
      <div className="flex items-center gap-0.5 mb-2">
        <button type="button" onClick={() => setViewYear((y) => y - 1)} className={navBtn} title="Năm trước">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button type="button" onClick={prevMonth} className={navBtn} title="Tháng trước">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="flex-1 text-center text-sm font-medium text-neutral-800 dark:text-neutral-200 select-none tabular-nums">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth} className={navBtn} title="Tháng sau">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => setViewYear((y) => y + 1)} className={navBtn} title="Năm sau">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-neutral-400 dark:text-neutral-500 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, idx) => (
          <div key={idx} className="aspect-square flex items-center justify-center">
            {cell !== null && (
              <button
                type="button"
                onClick={() => handleDayClick(cell)}
                className={cn(
                  'w-8 h-8 text-xs rounded-full flex items-center justify-center transition-colors',
                  isSelected(cell)
                    ? 'bg-neutral-800 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold'
                    : isToday(cell)
                      ? 'text-neutral-900 dark:text-neutral-100 font-semibold ring-1 ring-neutral-300 dark:ring-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700',
                )}
              >
                {cell}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          placeholder="DD/MM/YYYY"
          className={cn(
            'w-full px-3 py-2 pr-9 text-sm border rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            fieldFocus,
            error
              ? 'border-red-500 focus:ring-red-400 focus:border-red-500'
              : 'border-neutral-300 dark:border-neutral-600',
          )}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-50 rounded"
          tabIndex={-1}
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {calendar && createPortal(calendar, document.body)}
    </div>
  );
}
