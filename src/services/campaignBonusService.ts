/**
 * Campaign bonus service — preview/credit a USDT bonus to users, and read
 * campaign stats. Backed by the NestJS admin `admin/campaigns/bonus/*` routes.
 */

import { apiClient } from '../lib/api';

export type BonusStatus = 'will_credit' | 'already_credited' | 'ineligible';

export interface BonusPlanRow {
  email: string | null;
  verified: boolean;
  hasWallet: boolean;
  status: BonusStatus;
}

export interface BonusPreview {
  campaign: string;
  amount: number;
  coin: string;
  willCreditCount: number;
  alreadyCreditedCount: number;
  notFoundCount: number;
  notFound: string[];
  plan: BonusPlanRow[];
}

export interface BonusCreditResult {
  campaign: string;
  amount: number;
  coin: string;
  credited: number;
  skippedAlreadyCredited: number;
  notFoundCount: number;
  notFound: string[];
  failedCount: number;
  failed: string[];
  total: number;
}

export interface BonusStats {
  campaign: string;
  credited: number;
  totalAmount: number;
}

export type RecipientSegment = 'unverified' | 'verified' | 'all';

export interface BonusPayload {
  emails?: string[];
  apiKeys?: string[];
  segment?: RecipientSegment;
  amount?: number;
  coin?: string;
  campaign?: string;
}

interface Wrapped<T> {
  success: boolean;
  data: T;
}

export const campaignBonusService = {
  preview: async (payload: BonusPayload): Promise<BonusPreview> => {
    const res = await apiClient.post<Wrapped<BonusPreview>>(
      '/admin/campaigns/bonus/preview',
      payload,
    );
    return res.data;
  },

  credit: async (payload: BonusPayload): Promise<BonusCreditResult> => {
    const res = await apiClient.post<Wrapped<BonusCreditResult>>(
      '/admin/campaigns/bonus/credit',
      payload,
    );
    return res.data;
  },

  getStats: async (campaign?: string): Promise<BonusStats> => {
    const res = await apiClient.get<Wrapped<BonusStats>>(
      '/admin/campaigns/bonus/stats',
      { params: campaign ? { campaign } : {} },
    );
    return res.data;
  },
};
