import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailService, SentEmailRecord } from '@/services/emailService';
import { queryKeys } from '@/lib/queryClient';
import {
  Sms,
  Refresh,
  Send2,
  DocumentText,
  Eye,
  TickCircle,
  CloseCircle,
} from 'iconsax-react';
import { toast } from 'sonner';
import { TableLoader } from '@/components/ui/TableLoader';
import { TableEmpty } from '@/components/ui/TableEmpty';
import { usePermissions } from '@/hooks/useAuth';

export default function Mail() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewingEmail, setViewingEmail] = useState<SentEmailRecord | null>(null);
  const [confirmCampaign, setConfirmCampaign] = useState<'unverified' | 'inactive' | null>(null);

  const { hasAnyPermission } = usePermissions();
  const canSendEmail = hasAnyPermission(['MANAGE_ADMINS', 'SEND_EMAILS']);

  const { data: campaignStats, isLoading: statsLoading } = useQuery({
    queryKey: ['emails', 'campaigns', 'stats'],
    queryFn: () => emailService.getCampaignStats(),
    enabled: canSendEmail,
  });

  const unverifiedMutation = useMutation({
    mutationFn: () => emailService.sendUnverifiedReminders(),
    onSuccess: (res) => {
      toast.success(`Sent reminders to ${res.count} unverified user${res.count !== 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['emails', 'campaigns', 'stats'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.emails.all });
      setConfirmCampaign(null);
    },
    onError: (e: Error) => { toast.error(e.message || 'Failed to send reminders'); setConfirmCampaign(null); },
  });

  const inactiveMutation = useMutation({
    mutationFn: () => emailService.sendInactiveOutreach(),
    onSuccess: (res) => {
      toast.success(`Sent outreach to ${res.count} inactive user${res.count !== 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['emails', 'campaigns', 'stats'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.emails.all });
      setConfirmCampaign(null);
    },
    onError: (e: Error) => { toast.error(e.message || 'Failed to send outreach'); setConfirmCampaign(null); },
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: queryKeys.emails.list({ page, limit: 20 }),
    queryFn: () => emailService.list({ page, limit: 20 }),
  });

  const list = data?.data ?? [];
  const pagination = data?.pagination;

  const handleView = async (id: number) => {
    setViewingId(id);
    const email = await emailService.getOne(id);
    setViewingEmail(email ?? null);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <DashboardLayout title="Mail">
      {/* Campaigns */}
      {canSendEmail && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Automated Campaigns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unverified reminder */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">Unverified account reminder</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Send a one-click reminder to every user who signed up but hasn't verified their account yet.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold px-2.5 py-1">
                  {statsLoading ? '…' : `${campaignStats?.unverified ?? 0} users`}
                </span>
              </div>
              {confirmCampaign === 'unverified' ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600">Send to all {campaignStats?.unverified} unverified users?</span>
                  <button
                    onClick={() => unverifiedMutation.mutate()}
                    disabled={unverifiedMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium disabled:opacity-50"
                  >{unverifiedMutation.isPending ? 'Sending…' : 'Confirm'}</button>
                  <button onClick={() => setConfirmCampaign(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmCampaign('unverified')}
                  disabled={!campaignStats?.unverified}
                  className="self-start px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send reminders
                </button>
              )}
            </div>

            {/* Inactive outreach */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">Inactive user outreach</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Nudge users who have a wallet but have never made a transaction — help them get started.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1">
                  {statsLoading ? '…' : `${campaignStats?.inactive ?? 0} users`}
                </span>
              </div>
              {confirmCampaign === 'inactive' ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600">Send to all {campaignStats?.inactive} inactive users?</span>
                  <button
                    onClick={() => inactiveMutation.mutate()}
                    disabled={inactiveMutation.isPending}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
                  >{inactiveMutation.isPending ? 'Sending…' : 'Confirm'}</button>
                  <button onClick={() => setConfirmCampaign(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmCampaign('inactive')}
                  disabled={!campaignStats?.inactive}
                  className="self-start px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send outreach
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compose — links to Newsletter page */}
      {canSendEmail && (
        <div className="mb-8">
          <a href="/newsletter"
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                <Sms size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Compose Newsletter</h3>
                <p className="text-sm text-gray-500">Create branded emails with rich content, images, and sections</p>
              </div>
            </div>
            <Send2 size={20} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
          </a>
        </div>
      )}

      {/* Sent list */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocumentText size={20} className="text-gray-600" />
            <span className="font-medium text-gray-900">Sent</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Refresh size={18} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
        {isLoading ? (
          <TableLoader />
        ) : list.length === 0 ? (
          <TableEmpty message="No emails sent yet." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Subject</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">To</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Sent</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900 max-w-xs truncate">
                        {row.subject || '(No subject)'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                        {row.toEmails.join(', ')}
                      </td>
                      <td className="py-3 px-4">
                        {row.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <TickCircle size={14} />
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <CloseCircle size={14} />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {row.sentAt ? formatDate(row.sentAt) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleView(row.id)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View modal */}
      {viewingEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-medium text-gray-900">Email</span>
              <button
                type="button"
                onClick={() => { setViewingId(null); setViewingEmail(null); }}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 text-sm space-y-3">
              <p><span className="font-medium text-gray-600">From:</span> {viewingEmail.fromName || viewingEmail.fromEmail}</p>
              <p><span className="font-medium text-gray-600">To:</span> {viewingEmail.toEmails.join(', ')}</p>
              {viewingEmail.ccEmails.length > 0 && (
                <p><span className="font-medium text-gray-600">Cc:</span> {viewingEmail.ccEmails.join(', ')}</p>
              )}
              <p><span className="font-medium text-gray-600">Subject:</span> {viewingEmail.subject}</p>
              <p><span className="font-medium text-gray-600">Sent:</span> {viewingEmail.sentAt ? formatDate(viewingEmail.sentAt) : '-'}</p>
              <div className="border-t border-gray-100 pt-3 mt-3">
                {viewingEmail.bodyHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: viewingEmail.bodyHtml }} className="prose prose-sm max-w-none" />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-gray-700">{viewingEmail.bodyText || '(No body)'}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
