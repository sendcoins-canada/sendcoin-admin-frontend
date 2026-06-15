import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService, SystemSetting } from '@/services/settingsService';
import {
  Refresh,
  Setting2,
  Edit2,
  Add,
  Trash,
  TickCircle,
  CloseCircle,
  ShieldTick,
  ShieldCross,
  Key,
  Copy,
  Warning2,
  Lock,
} from 'iconsax-react';
import { toast } from 'sonner';
import { MfaVerificationModal } from '@/components/modals/MfaVerificationModal';
import { useMfaProtectedAction } from '@/hooks/useMfaProtectedAction';
import { useAuthState, useMfaSetup, useEnableMfa, useDisableMfa } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { MfaSetupModal } from '@/components/modals/MfaSetupModal';
import { queryKeys } from '@/lib/queryClient';
import { store, setCredentials } from '@/store';
import type { MfaSetupResponse } from '@/types/auth';

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    string: 'bg-blue-100 text-blue-700',
    number: 'bg-green-100 text-green-700',
    boolean: 'bg-purple-100 text-purple-700',
    json: 'bg-orange-100 text-orange-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[type] || 'bg-gray-100'}`}>
      {type}
    </span>
  );
}

type TabType = 'general' | 'security';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    type: 'string' as SystemSetting['settingType'],
    description: '',
  });

  // MFA Setup state
  const { user } = useAuthState();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoadingBackupCodes, setIsLoadingBackupCodes] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [showMfaForBackupCodes, setShowMfaForBackupCodes] = useState(false);

  // MFA Mutations
  const setupMutation = useMfaSetup();
  const enableMutation = useEnableMfa();
  const disableMutation = useDisableMfa();

  const mfaEnabled = user?.mfaEnabled ?? false;

  const queryClient = useQueryClient();

  // Fetch settings
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      settingsService.updateSetting(key, value),
    onSuccess: () => {
      toast.success('Setting updated');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setEditingKey(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update setting');
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: settingsService.createSetting,
    onSuccess: () => {
      toast.success('Setting created');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setShowCreateForm(false);
      setNewSetting({ key: '', value: '', type: 'string', description: '' });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create setting');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: settingsService.deleteSetting,
    onSuccess: () => {
      toast.success('Setting deleted');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete setting');
    },
  });

  // MFA Protection for settings update
  const mfaUpdate = useMfaProtectedAction({
    actionName: 'Update Setting',
    actionDescription: 'You are about to modify a system setting. This action requires MFA verification.',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  // MFA Protection for settings create
  const mfaCreate = useMfaProtectedAction({
    actionName: 'Create Setting',
    actionDescription: 'You are about to create a new system setting. This action requires MFA verification.',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  // MFA Protection for settings delete
  const mfaDelete = useMfaProtectedAction({
    actionName: 'Delete Setting',
    actionDescription: 'You are about to delete a system setting. This action requires MFA verification.',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleEdit = (setting: SystemSetting) => {
    setEditingKey(setting.settingKey);
    setEditValue(setting.settingValue);
  };

  const handleSave = async () => {
    if (editingKey) {
      const key = editingKey;
      const value = editValue;

      await mfaUpdate.executeWithMfa(async () => {
        await updateMutation.mutateAsync({ key, value });
        setEditingKey(null);
      });
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete the setting "${key}"?`)) {
      return;
    }

    setPendingDeleteKey(key);
    await mfaDelete.executeWithMfa(async () => {
      await deleteMutation.mutateAsync(key);
      setPendingDeleteKey(null);
    });
  };

  const handleCreate = async () => {
    if (!newSetting.key.trim()) {
      toast.error('Setting key is required');
      return;
    }
    if (!newSetting.value.trim()) {
      toast.error('Setting value is required');
      return;
    }

    const settingData = { ...newSetting };
    await mfaCreate.executeWithMfa(async () => {
      await createMutation.mutateAsync(settingData);
      setShowCreateForm(false);
      setNewSetting({ key: '', value: '', type: 'string', description: '' });
    });
  };

  const handleMfaVerified = (actionToken: string) => {
    if (mfaUpdate.isMfaModalOpen) {
      mfaUpdate.handleMfaVerified(actionToken);
    } else if (mfaCreate.isMfaModalOpen) {
      mfaCreate.handleMfaVerified(actionToken);
    } else if (mfaDelete.isMfaModalOpen) {
      mfaDelete.handleMfaVerified(actionToken);
    }
  };

  // MFA Setup handlers
  const handleStartSetup = async () => {
    try {
      const data = await setupMutation.mutateAsync();
      setSetupData(data);
      setShowSetupModal(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start MFA setup');
    }
  };

  const handleEnableMfa = async (code: string) => {
    const result = await enableMutation.mutateAsync(code);
    setSetupData((prev) =>
      prev ? { ...prev, backupCodes: result?.backupCodes ?? [] } : null
    );
    toast.success('Two-factor authentication enabled successfully');
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  };

  const handleSetupComplete = async () => {
    setShowSetupModal(false);
    setSetupData(null);
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    const user = await authService.getMe();
    if (user) {
      const token = store.getState().auth.token;
      if (token) store.dispatch(setCredentials({ user, token }));
    }
  };

  const handleOpenDisableModal = () => {
    setShowDisableModal(true);
    setDisableCode('');
    setDisableError(null);
  };

  const handleDisableMfa = async () => {
    if (disableCode.length !== 6) {
      setDisableError('Please enter a 6-digit code');
      return;
    }

    try {
      await disableMutation.mutateAsync(disableCode);
      toast.success('Two-factor authentication disabled');
      setShowDisableModal(false);
      setDisableCode('');
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      const user = await authService.getMe();
      if (user) {
        const token = store.getState().auth.token;
        if (token) store.dispatch(setCredentials({ user, token }));
      }
    } catch (error) {
      setDisableError(error instanceof Error ? error.message : 'Invalid code');
    }
  };

  const handleRequestBackupCodes = () => {
    setShowMfaForBackupCodes(true);
  };

  const handleMfaVerifiedForBackupCodes = async () => {
    setShowMfaForBackupCodes(false);
    setIsLoadingBackupCodes(true);

    try {
      const result = await authService.getBackupCodes();
      setBackupCodes(result.backupCodes);
      setShowBackupCodes(true);
      toast.success('New backup codes generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate backup codes');
    } finally {
      setIsLoadingBackupCodes(false);
    }
  };

  const handleCopyBackupCodes = async () => {
    const codesText = backupCodes.join('\n');
    await navigator.clipboard.writeText(codesText);
    setCopiedBackupCodes(true);
    toast.success('Backup codes copied');
    setTimeout(() => setCopiedBackupCodes(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const codesText = `SendCoins Admin MFA Backup Codes\n${'='.repeat(40)}\n\nKeep these codes safe. Each code can only be used once.\n\n${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nGenerated: ${new Date().toISOString()}`;
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sendcoins-mfa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  const settings = data?.settings ?? [];

  return (
    <DashboardLayout title="Settings">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-100">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Setting2 size={18} color="currentColor" />
            System Settings
          </div>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lock size={18} color="currentColor" />
            Security
          </div>
        </button>
      </div>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Setting2 size={24} color="currentColor" className="text-gray-600" />
              <p className="text-gray-500 text-sm">
                Manage system-wide configuration settings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Add size={18} color="currentColor" />
                Add Setting
              </button>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
              >
                <Refresh size={18} color="currentColor" className={isFetching ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-4">Create New Setting</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Key</label>
                  <input
                    type="text"
                    value={newSetting.key}
                    onChange={(e) =>
                      setNewSetting({ ...newSetting, key: e.target.value })
                    }
                    placeholder="e.g., max_withdrawal_limit"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Type</label>
                  <select
                    value={newSetting.type}
                    onChange={(e) =>
                      setNewSetting({
                        ...newSetting,
                        type: e.target.value as SystemSetting['settingType'],
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Value</label>
                  <input
                    type="text"
                    value={newSetting.value}
                    onChange={(e) =>
                      setNewSetting({ ...newSetting, value: e.target.value })
                    }
                    placeholder="Setting value"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <input
                    type="text"
                    value={newSetting.description}
                    onChange={(e) =>
                      setNewSetting({ ...newSetting, description: e.target.value })
                    }
                    placeholder="What does this setting control?"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewSetting({ key: '', value: '', type: 'string', description: '' });
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Setting
                </button>
              </div>
            </div>
          )}

          {/* Settings Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Refresh size="32" color="currentColor" className="animate-spin text-blue-600" />
              </div>
            ) : settings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Setting2 size={48} color="currentColor" className="mb-2 opacity-50" />
                <p>No settings found</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Create your first setting
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Key</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Value</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Last Updated
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.map((setting) => (
                      <tr
                        key={setting.settingKey}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="py-3 px-4">
                          <code className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            {setting.settingKey}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          {editingKey === setting.settingKey ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={handleSave}
                                disabled={updateMutation.isPending}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <TickCircle size={18} color="currentColor" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <CloseCircle size={18} color="currentColor" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono text-gray-800">
                              {setting.settingValue.length > 50
                                ? setting.settingValue.substring(0, 50) + '...'
                                : setting.settingValue}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <TypeBadge type={setting.settingType} />
                        </td>
                        <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                          {setting.description || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs">
                          {formatDate(setting.updatedAt)}
                          {setting.updatedBy && (
                            <span className="block text-gray-400">
                              by Admin #{setting.updatedBy}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {editingKey !== setting.settingKey && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEdit(setting)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={16} color="currentColor" />
                              </button>
                              <button
                                onClick={() => handleDelete(setting.settingKey)}
                                disabled={deleteMutation.isPending}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash size={16} color="currentColor" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-4">
            {settings.length} setting{settings.length !== 1 ? 's' : ''} configured
          </p>
        </>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <>
          {/* MFA Section */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                      mfaEnabled ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    {mfaEnabled ? (
                      <ShieldTick size={24} color="currentColor" className="text-green-600" />
                    ) : (
                      <ShieldCross size={24} color="currentColor" className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Two-Factor Authentication (2FA)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Add an extra layer of security to your account by requiring a verification code
                      in addition to your password.
                    </p>
                    <div className="mt-3">
                      {mfaEnabled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                          <TickCircle size={14} color="currentColor" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                          <Warning2 size={14} color="currentColor" />
                          Not Enabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  {mfaEnabled ? (
                    <button
                      onClick={handleOpenDisableModal}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Disable 2FA
                    </button>
                  ) : (
                    <button
                      onClick={handleStartSetup}
                      disabled={setupMutation.isPending}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {setupMutation.isPending ? (
                        <>
                          <Refresh size="16" color="currentColor" className="animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <ShieldTick size={18} color="currentColor" />
                          Enable 2FA
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Backup Codes Section (only when MFA is enabled) */}
              {mfaEnabled && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Key size={20} color="currentColor" className="text-gray-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Backup Codes</h4>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Generate new backup codes if you've lost access to your previous ones.
                          This will invalidate all existing backup codes.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRequestBackupCodes}
                      disabled={isLoadingBackupCodes}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoadingBackupCodes ? (
                        <>
                          <Refresh size="16" color="currentColor" className="animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Refresh size={16} color="currentColor" />
                          Regenerate Codes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security Recommendations */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Security Recommendations</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <TickCircle size={16} color="currentColor" className="text-blue-600 shrink-0 mt-0.5" />
                <span>Use a strong, unique password for your account</span>
              </li>
              <li className="flex items-start gap-2">
                <TickCircle size={16} color="currentColor" className="text-blue-600 shrink-0 mt-0.5" />
                <span>Enable two-factor authentication for enhanced security</span>
              </li>
              <li className="flex items-start gap-2">
                <TickCircle size={16} color="currentColor" className="text-blue-600 shrink-0 mt-0.5" />
                <span>Store your backup codes in a secure location</span>
              </li>
              <li className="flex items-start gap-2">
                <TickCircle size={16} color="currentColor" className="text-blue-600 shrink-0 mt-0.5" />
                <span>Never share your authentication codes with anyone</span>
              </li>
            </ul>
          </div>
        </>
      )}

      {/* MFA Setup Modal */}
      <MfaSetupModal
        open={showSetupModal}
        onOpenChange={setShowSetupModal}
        onSetupComplete={handleSetupComplete}
        setupData={setupData}
        onEnableMfa={handleEnableMfa}
        isEnabling={enableMutation.isPending}
      />

      {/* Disable MFA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDisableModal(false)}
          />
          <div className="relative bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash size={20} color="currentColor" className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Disable 2FA</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to disable two-factor authentication? This will make your
              account less secure.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your 6-digit authentication code
              </label>
              <input
                type="text"
                value={disableCode}
                onChange={(e) => {
                  setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setDisableError(null);
                }}
                placeholder="000000"
                maxLength={6}
                className={`w-full px-4 py-3 text-center text-xl font-mono tracking-[0.5em] border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  disableError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {disableError && (
                <p className="text-sm text-red-600 mt-2">{disableError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDisableModal(false)}
                disabled={disableMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableMfa}
                disabled={disableMutation.isPending || disableCode.length !== 6}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {disableMutation.isPending ? (
                  <>
                    <Refresh size="16" color="currentColor" className="animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable 2FA'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Display Modal */}
      {showBackupCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBackupCodes(false)}
          />
          <div className="relative bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Key size={20} color="currentColor" className="text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">New Backup Codes</h3>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <Warning2 size={18} color="currentColor" className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Your previous backup codes are now invalid. Save these new codes securely.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg font-mono text-sm"
                >
                  <Key size={14} color="currentColor" className="text-gray-400" />
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={handleCopyBackupCodes}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {copiedBackupCodes ? (
                  <>
                    <TickCircle size={16} color="currentColor" className="text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} color="currentColor" />
                    Copy All
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadBackupCodes}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Download
              </button>
            </div>

            <button
              onClick={() => setShowBackupCodes(false)}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <TickCircle size={18} color="currentColor" />
              I've Saved My Codes
            </button>
          </div>
        </div>
      )}

      {/* MFA Verification for Backup Codes */}
      <MfaVerificationModal
        open={showMfaForBackupCodes}
        onOpenChange={setShowMfaForBackupCodes}
        onVerified={handleMfaVerifiedForBackupCodes}
        actionName="Regenerate Backup Codes"
        actionDescription="This will invalidate all existing backup codes. Enter your MFA code to continue."
      />

      {/* MFA Verification Modals for Settings */}
      <MfaVerificationModal
        open={mfaUpdate.isMfaModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) mfaUpdate.closeMfaModal();
        }}
        onVerified={handleMfaVerified}
        actionName={mfaUpdate.modalConfig.actionName}
        actionDescription={mfaUpdate.modalConfig.actionDescription}
      />

      <MfaVerificationModal
        open={mfaCreate.isMfaModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) mfaCreate.closeMfaModal();
        }}
        onVerified={handleMfaVerified}
        actionName={mfaCreate.modalConfig.actionName}
        actionDescription={mfaCreate.modalConfig.actionDescription}
      />

      <MfaVerificationModal
        open={mfaDelete.isMfaModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            mfaDelete.closeMfaModal();
            setPendingDeleteKey(null);
          }
        }}
        onVerified={handleMfaVerified}
        actionName={mfaDelete.modalConfig.actionName}
        actionDescription={mfaDelete.modalConfig.actionDescription}
      />

    </DashboardLayout>
  );
}
