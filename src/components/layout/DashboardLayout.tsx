import React, { useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import {
  Ghost,
  People,
  Bank,
  Wallet,
  Profile2User,
  LogoutCurve,
  SearchNormal1,
  ArrowDown2,
  DocumentText,
  WalletMoney,
  UserTick,
  ArrowSwapHorizontal,
  Chart2,
  Card,
  Shop,
  Setting2,
  Sms,
  DollarCircle,
  DocumentText1,
  Activity,
} from 'iconsax-react';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { AppLogo } from '@/components/ui/AppLogo';
import { useAuth, useAuthState } from '@/hooks/useAuth';
import { useAppSelector } from '@/store';
import { selectPermissions } from '@/store/slices/authSlice';
import { canAccessRoute } from '@/constants/routePermissions';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { logout, isLoggingOut } = useAuth();
  const { user } = useAuthState();

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'AD';
  };

  const userPermissions = useAppSelector(selectPermissions);

  const allNavGroups: { groupLabel?: string; items: Array<{ icon: typeof Ghost; path: string; label: string; hasNotification?: boolean }> }[] = [
    { groupLabel: 'Home', items: [
      { icon: Ghost, path: '/dashboard', label: 'Home', hasNotification: true },
      { icon: Activity, path: '/activity', label: 'Activity' },
    ] },
    {
      groupLabel: 'Operations',
      items: [
        { icon: Wallet, path: '/transactions', label: 'Transactions' },
        { icon: WalletMoney, path: '/accounts', label: 'Accounts' },
        { icon: Shop, path: '/merchants', label: 'Merchants' },
      ],
    },
    {
      groupLabel: 'Customers',
      items: [
        { icon: People, path: '/users', label: 'Users' },
        { icon: UserTick, path: '/kyc', label: 'KYC Queue' },
      ],
    },
    { groupLabel: 'Comms', items: [
      { icon: Sms, path: '/communications', label: 'Communications' },
    ] },
    {
      groupLabel: 'Risk & Compliance',
      items: [
        { icon: Chart2, path: '/analytics', label: 'Analytics' },
      ],
    },
    {
      groupLabel: 'System',
      items: [
        { icon: Profile2User, path: '/manage-team', label: 'Manage Team' },
        { icon: DollarCircle, path: '/rates', label: 'Currency Rates' },
        { icon: Setting2, path: '/settings', label: 'Settings' },
      ],
    },
  ];

  const navGroups = useMemo(() => {
    return allNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canAccessRoute(item.path, userPermissions)),
      }))
      .filter((group) => group.items.length > 0);
  }, [userPermissions]);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 bg-white border-r border-gray-100 flex flex-col items-center py-6 fixed h-full z-10">
        
        {/* Top Logo - Pinned */}
        <div className="mb-6 shrink-0 px-2">
          <AppLogo height={24} width={120} className="h-6 w-auto" />
        </div>

        {/* Navigation - Grouped, scrollable */}
        <nav className="flex-1 flex flex-col gap-1 w-full items-center overflow-y-auto py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navGroups.map(({ groupLabel, items }, gIdx) => (
            <div key={groupLabel ?? gIdx} className="flex flex-col gap-1 w-full items-center">
              {gIdx > 0 && <div className="w-8 border-t border-gray-100 my-1" aria-hidden />}
              {items.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    title={item.label}
                    className={`p-3 rounded-xl transition-all duration-200 relative block flex-shrink-0 ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    <div className="relative w-6 h-6 flex items-center justify-center">
                      <item.icon size="24" variant={isActive ? 'Bold' : 'Linear'} color="currentColor" />
                      {item.hasNotification && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full -ml-3" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Logout - Pinned */}
        <div className="mt-auto pt-4 flex-shrink-0 border-t border-gray-50 w-full flex justify-center">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-3 text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Logout"
          >
            <LogoutCurve size="24" color="currentColor" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-20 h-screen overflow-y-auto flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

          <div className="flex items-center gap-6 flex-1 justify-end">
            <div className="max-w-md w-full relative hidden md:block">
              <SearchNormal1 size="20" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search across transactions, users, customers"
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-4 pl-4 border-l border-gray-100">
              <NotificationsDropdown />
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-semibold text-sm">
                  {getInitials(user?.firstName, user?.lastName)}
                </div>
                <div className="hidden lg:block">
                  <div className="text-sm font-medium text-gray-900">
                    {user ? `${user.firstName} ${user.lastName}`.trim() || 'Admin' : 'Admin'}
                  </div>
                  <div className="text-xs text-gray-500">{user?.roleName || 'Administrator'}</div>
                </div>
              </div>
              <button className="p-1 hover:bg-gray-50 rounded-full">
                <ArrowDown2 size="16" className="text-gray-400" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 bg-white flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}