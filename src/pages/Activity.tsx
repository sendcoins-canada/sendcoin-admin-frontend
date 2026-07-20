import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useHasPermission } from '@/hooks/useAuth';
import ActivityFeed from '@/pages/ActivityFeed';
import AuditLogs from '@/pages/AuditLogs';

/**
 * Activity — merges Activity Feed (platform events) and Audit Logs (admin
 * actions) into one tabbed view. The Audit tab only appears for admins with
 * READ_AUDIT_LOGS. Each tab renders the existing page via its `embedded` prop.
 */
export default function Activity() {
  const canAudit = useHasPermission('READ_AUDIT_LOGS');
  const tabs = [
    { key: 'platform', label: 'Platform Activity' },
    ...(canAudit ? [{ key: 'audit', label: 'Admin Audit Log' }] : []),
  ];
  const [tab, setTab] = useState('platform');

  return (
    <DashboardLayout title="Activity">
      <div className="flex flex-col gap-6">
        <div className="flex gap-8 border-b border-gray-100 pb-1">
          {tabs.map((t) => (
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
        {tab === 'audit' && canAudit ? <AuditLogs embedded /> : <ActivityFeed embedded />}
      </div>
    </DashboardLayout>
  );
}
