import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Wallets from '@/pages/Wallets';
import BankAccounts from '@/pages/BankAccounts';

const TABS = [
  { key: 'crypto', label: 'Crypto Wallets' },
  { key: 'fiat', label: 'Fiat Accounts' },
];

/**
 * Accounts — merges the old Wallets and Fiat Accounts pages into one tabbed
 * view. Each tab renders the existing page's content via its `embedded` prop
 * (no layout wrapper), so no page logic was duplicated.
 */
export default function Accounts() {
  const [tab, setTab] = useState('crypto');
  return (
    <DashboardLayout title="Accounts">
      <div className="flex flex-col gap-6">
        <div className="flex gap-8 border-b border-gray-100 pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium relative ${
                tab === t.key ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
              {tab === t.key && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600" />}
            </button>
          ))}
        </div>
        {tab === 'crypto' ? <Wallets embedded /> : <BankAccounts embedded />}
      </div>
    </DashboardLayout>
  );
}
