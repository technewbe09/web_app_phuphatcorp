import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  LogOut,
  Settings,
  Menu,
  Globe,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLogout } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Toaster } from '@/components/ui/sonner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/admin/dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
  { path: '/admin/master-data/sku-factory', labelKey: 'sidebar.skuFactory', icon: Upload },
  { path: '/admin/execute-data', labelKey: 'sidebar.executeData', icon: FileSpreadsheet },
  { path: '/admin/users', labelKey: 'sidebar.users', icon: Users, adminOnly: true },
];

interface SidebarContentProps {
  collapsed?: boolean;
  filteredItems: NavItem[];
  locationPathname: string;
  onMobileNavClose?: () => void;
  onCollapseToggle: () => void;
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
  onSettings: () => void;
}

function SidebarContent({
  collapsed = false,
  filteredItems,
  locationPathname,
  onMobileNavClose,
  onCollapseToggle,
  userName,
  userEmail,
  onLogout,
  onSettings,
}: SidebarContentProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center px-5 shrink-0 border-b border-border">
        <span className="text-xl font-bold truncate">
          {collapsed ? t('app.name').charAt(0) : t('app.name')}
        </span>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1">
        <nav className="px-3 pt-1 pb-3 space-y-0.5">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              locationPathname === item.path ||
              locationPathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileNavClose}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                title={collapsed ? t(item.labelKey) : undefined}
              >
                <Icon className={cn('size-5 shrink-0', collapsed && 'mx-auto')} />
                {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom: Language + User + Collapse */}
      <div className="shrink-0 pt-2 pb-3 px-3 space-y-0.5 border-t border-border">
        {/* User */}
        <Popover>
          <PopoverTrigger className="w-full">
            <div
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors cursor-pointer',
                'hover:bg-accent',
                collapsed && 'justify-center'
              )}
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-base font-semibold">
                  {userName?.charAt(0)?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-base font-medium truncate leading-tight">{userName}</p>
                  <p className="text-base text-muted-foreground truncate leading-tight">{userEmail}</p>
                </div>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-52 p-0" sideOffset={8}>
            <div className="px-4 py-3">
              <p className="text-sm font-semibold leading-none">{userName}</p>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">{userEmail}</p>
            </div>
            <div className="border-t" />
            <div className="p-1">
              <button
                onClick={onSettings}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <Settings className="size-4" />
                {t('sidebar.settings')}
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-destructive hover:bg-accent transition-colors cursor-pointer"
              >
                <LogOut className="size-4" />
                {t('common.logout')}
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Collapse Toggle */}
        <button
          onClick={onCollapseToggle}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors cursor-pointer',
            'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="size-5 shrink-0" />
              <span>{t('sidebar.collapse')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuthContext();
  const logout = useLogout();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    return true;
  });

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = '/login';
      },
      onError: () => {
        toast.error(t('common.error'));
      },
    });
  };

  const handleSettings = () => {
    window.location.href = '/admin/settings';
  };

  return (
    <div className="h-screen flex bg-muted/20">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-white border-r border-border shrink-0 transition-all duration-200',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarContent
          collapsed={sidebarCollapsed}
          filteredItems={filteredItems}
          locationPathname={location.pathname}
          onCollapseToggle={() => setSidebarCollapsed((v) => !v)}
          userName={user?.name}
          userEmail={user?.email}
          onLogout={handleLogout}
          onSettings={handleSettings}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 flex flex-col"
          aria-label={t('sidebar.mobileNav')}
        >
          <SidebarContent
            collapsed={false}
            filteredItems={filteredItems}
            locationPathname={location.pathname}
            onMobileNavClose={() => setMobileOpen(false)}
            onCollapseToggle={() => {}}
            userName={user?.name}
            userEmail={user?.email}
            onLogout={handleLogout}
            onSettings={handleSettings}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-white px-4">
          {/* Mobile menu */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                className="pl-9 h-9 bg-muted/30 border-0 rounded-full text-sm"
              />
            </div>
          </div>

          {/* Language Switcher */}
          <Select
            value={i18n.language}
            onValueChange={(lang) => { if (lang) i18n.changeLanguage(lang); }}
          >
            <SelectTrigger className="w-auto h-9 px-3 gap-2 bg-transparent hover:bg-accent border-0 shadow-none text-sm font-normal text-muted-foreground hover:text-foreground">
              <Globe className="size-4 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="vi">Tiếng Việt</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}
