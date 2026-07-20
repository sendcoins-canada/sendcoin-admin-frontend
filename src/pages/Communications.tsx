import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Mail from '@/pages/Mail';
import Newsletter from '@/pages/Newsletter';

const TABS = [
  { key: 'transactional', label: 'Transactional' },
  { key: 'newsletter', label: 'Newsletter' },
];

/**
 * Communications — merges the old Mail and Newsletter pages into one tabbed
 * view. Each tab renders the existing page via its `embedded` prop.
 */
export default function Communications() {
  const [tab, setTab] = useState('transactional');
  return (
    <DashboardLayout title="Communications">
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
        {tab === 'transactional' ? <Mail embedded /> : <Newsletter embedded />}
      </div>
    </DashboardLayout>
  );
}
