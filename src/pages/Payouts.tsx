import { DashboardLayout } from '@/components/layout/DashboardLayout';
import PayoutsPanel from '@/components/PayoutsPanel';

/**
 * Standalone CrayFi Payouts page (deep-link /payouts). The same content also
 * renders as the "Payouts" tab inside the Transactions page via PayoutsPanel.
 */
export default function Payouts() {
  return (
    <DashboardLayout title="CrayFi Payouts">
      <div className="p-4 md:p-6">
        <PayoutsPanel />
      </div>
    </DashboardLayout>
  );
}
