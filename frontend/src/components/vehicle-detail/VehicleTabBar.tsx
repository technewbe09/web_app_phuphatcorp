import { cn } from '../../utils/cn';

export type VehicleTab = 'inspection' | 'insurance' | 'oil_change' | 'repair' | 'fuel';

interface TabDef {
  key: VehicleTab;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'inspection', label: 'Đăng kiểm' },
  { key: 'insurance', label: 'Bảo hiểm' },
  { key: 'oil_change', label: 'Thay nhớt' },
  { key: 'repair', label: 'Lịch sử sửa xe' },
  { key: 'fuel', label: 'Dữ liệu dầu' },
];

interface Props {
  activeTab: VehicleTab;
  onTabChange: (tab: VehicleTab) => void;
}

export function VehicleTabBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
            activeTab === tab.key
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
