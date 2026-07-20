import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { payoutsService, type PayoutRow } from '@/services/payoutsService';

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  pending: 'bg-yellow-50 text-yellow-700',
  processing: 'bg-yellow-50 text-yellow-700',
};

function StatusBadge({ status }: { status: string | null }) {
  const s = (status || 'unknown').toLowerCase();
  const style = STATUS_STYLES[s] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${style}`}>
      {status || 'unknown'}
    </span>
  );
}

const ngn = (n: number | null) =>
  n == null ? '—' : `₦${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'failed', label: 'Failed' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Delivered' },
];

/**
 * CrayFi NGN payouts panel — reusable content (no page chrome) so it can render
 * both as the standalone /payouts page and as a tab inside the Transactions page.
 */
export default function PayoutsPanel() {
  const [status, setStatus] = useState('');

  const statsQ = useQuery({ queryKey: ['payout-stats'], queryFn: () => payoutsService.stats() });
  const listQ = useQuery({
    queryKey: ['payouts', status],
    queryFn: () => payoutsService.list({ status: status || undefined, limit: 200 }),
  });

  const stats = statsQ.data?.data;
  const rows = listQ.data?.data ?? [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        NGN bank payouts with CrayFi's real outcome. A payout that shows <b>Delivered</b> to the user but is
        <b> Failed</b> at CrayFi is flagged — that failure is on CrayFi's side (e.g. <code>PMN-13-422</code>).
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Delivered', value: stats?.delivered, tone: 'text-green-700' },
          { label: 'Failed at CrayFi', value: stats?.failed, tone: 'text-red-700' },
          { label: 'Pending', value: stats?.pending, tone: 'text-yellow-700' },
          { label: 'Mislabeled "success"', value: stats?.mislabeled, tone: 'text-red-700', sub: stats ? ngn(stats.mislabeledAmount) : '' },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">{c.label}</div>
            <div className={`mt-1 text-2xl font-bold ${c.tone}`}>{statsQ.isLoading ? '…' : c.value ?? 0}</div>
            {c.sub ? <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div> : null}
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              status === f.key ? 'bg-[#0052FF] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-x-auto">
        {listQ.isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading payouts…</div>
        ) : listQ.isError ? (
          <div className="p-8 text-center text-red-500">Failed to load payouts. Try again.</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No payouts found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-400 border-b">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Our status</th>
                <th className="px-4 py-3">CrayFi status</th>
                <th className="px-4 py-3">CrayFi reason</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: PayoutRow) => (
                <tr key={r.id} className={`border-b last:border-0 ${r.mismatch ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{r.userEmail || '—'}</div>
                    {r.reference ? <div className="text-xs text-gray-400">{r.reference}</div> : null}
                  </td>
                  <td className="px-4 py-3 font-medium">{ngn(r.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.ourStatus} /></td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.crayfiStatus} />
                    {r.mismatch ? (
                      <span className="ml-2 text-[11px] font-semibold text-red-600" title="Shown as success to the user but CrayFi did not deliver">
                        ⚠ mismatch
                      </span>
                    ) : null}
                    {r.refunded ? <span className="ml-2 text-[11px] font-semibold text-green-600">refunded</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    {r.failureReason ? <code className="text-red-600 text-xs">{r.failureReason}</code> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.recipient?.name ? (
                      <div>
                        <div>{r.recipient.name}</div>
                        <div className="text-xs text-gray-400">{r.recipient.account}{r.recipient.bank ? ` · ${r.recipient.bank}` : ''}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
