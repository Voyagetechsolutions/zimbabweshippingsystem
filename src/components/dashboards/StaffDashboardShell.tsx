import React, { useMemo, useState } from 'react';
import { LucideIcon, LogOut, Menu, RefreshCcw, Search } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// The chrome every staff dashboard shares: a searchable sidebar, a mobile
// drawer and a thin header. AdminDashboardContent grew this layout first; the
// finance and driver dashboards use it here so all three feel like one product
// rather than three apps that happen to share a domain.

export type ShellNavItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export type ShellNavGroup = {
  key: string;
  label: string;
  items: ShellNavItem[];
};

type Props = {
  brandTitle: string;
  brandSubtitle?: string;
  brandIcon: LucideIcon;
  navGroups: ShellNavGroup[];
  activeTab: string;
  onTabChange: (value: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
};

export default function StaffDashboardShell({
  brandTitle, brandSubtitle, brandIcon: BrandIcon, navGroups, activeTab,
  onTabChange, onRefresh, refreshing, headerRight, children,
}: Props) {
  const isMobile = useIsMobile();
  const { signOut } = useAuth();
  const [navQuery, setNavQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const filteredGroups = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return navGroups;
    return navGroups
      .map((group) => ({ ...group, items: group.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((group) => group.items.length > 0);
  }, [navGroups, navQuery]);

  const allItems = useMemo(() => navGroups.flatMap((g) => g.items), [navGroups]);
  const activeLabel = allItems.find((i) => i.value === activeTab)?.label ?? brandTitle;

  const handleNavClick = (value: string) => {
    onTabChange(value);
    setMobileNavOpen(false);
  };

  const sidebar = (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3 px-4 h-12 border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
          <BrandIcon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{brandTitle}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{brandSubtitle || 'Zimbabwe Shipping'}</p>
        </div>
      </div>

      {/* Only worth a search box once there are enough sections to hunt through. */}
      {allItems.length > 6 && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Search sections…"
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {filteredGroups.length === 0 ? (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-6">
            No sections match "{navQuery}"
          </div>
        ) : (
          filteredGroups.map((group, groupIdx) => (
            <div key={group.key} className={cn(groupIdx > 0 && 'mt-3')}>
              <p className="px-2.5 mb-0.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {group.label}
              </p>
              <div className="space-y-px">
                {group.items.map((item) => {
                  const isActive = activeTab === item.value;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      onClick={() => handleNavClick(item.value)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400')} />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge ? (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'h-4 px-1.5 text-[10px] font-semibold',
                            isActive
                              ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                              : 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100',
                          )}
                        >
                          {item.badge}
                        </Badge>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-gray-200 dark:border-gray-800 p-2">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <LogOut className="h-3.5 w-3.5 text-gray-400" />
          <span className="flex-1 text-left">Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {!isMobile && (
        <aside className="w-56 border-r border-gray-200 dark:border-gray-800 shrink-0">{sidebar}</aside>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 px-3 md:px-4 h-12">
            {isMobile && (
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0 h-8 w-8">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  <SheetHeader className="sr-only">
                    <SheetTitle>{brandTitle} navigation</SheetTitle>
                    <SheetDescription>Navigate {brandTitle} sections.</SheetDescription>
                  </SheetHeader>
                  {sidebar}
                </SheetContent>
              </Sheet>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white truncate">
                {activeLabel}
              </h1>
            </div>

            <div className="flex items-center gap-1.5">
              {headerRight}
              {onRefresh && (
                <Button
                  variant="outline" size="icon" className="h-8 w-8" title="Refresh"
                  onClick={onRefresh} disabled={refreshing}
                >
                  <RefreshCcw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="w-full p-3 md:p-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
