/**
 * Transaction Types
 * Types related to transactions
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Transaction type
 */
export type TransactionType =
  | 'INCOMING'
  | 'OUTGOING'
  | 'CONVERSION'
  | 'BUY'
  | 'SELL'
  | 'TRANSFER';

/**
 * Transaction status
 */
export type TransactionStatus =
  | 'PENDING'
  | 'PENDING_FUNDING'
  | 'PENDING_CONFIRMATION'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'FLAGGED';

/**
 * Supported cryptocurrencies
 */
export type Cryptocurrency =
  | 'BTC'
  | 'ETH'
  | 'BNB'
  | 'USDT'
  | 'USDC'
  | 'SOL'
  | 'TRX'
  | 'LTC'
  | 'POL'
  | 'XRP'
  | 'ADA'
  | 'DOGE'
  | 'LINK'
  | 'CELO';

/**
 * Blockchain networks
 */
export type Network =
  | 'BITCOIN'
  | 'ETHEREUM'
  | 'BSC'
  | 'TRON'
  | 'SOLANA'
  | 'POLYGON'
  | 'RIPPLE'
  | 'LITECOIN'
  | 'CARDANO'
  | 'CELO';

// =============================================================================
// Transaction Endpoint
// =============================================================================

/**
 * Transaction source/destination
 */
export interface TransactionEndpoint {
  type: 'WALLET' | 'BANK' | 'EXTERNAL';
  address?: string;
  network?: Network;
  name?: string;
  bankName?: string;
  accountNumber?: string;
}

// =============================================================================
// Transaction
// =============================================================================

/**
 * Transaction record - list view
 */
export interface Transaction {
  id: string;
  txId: string;
  type: TransactionType;
  status: TransactionStatus;

  // Amounts
  currency: Cryptocurrency;
  amount: number;
  amountUsd: number;
  fee: number;
  feeUsd: number;

  // Endpoints
  source: TransactionEndpoint;
  destination: TransactionEndpoint;

  // Blockchain info
  txHash?: string;
  blockNumber?: number;
  confirmations?: number;

  // User info
  userId: string;
  userEmail: string;
  userName: string;

  // Flags
  isFlagged: boolean;
  flagReason?: string;
  flaggedBy?: string;
  flaggedAt?: string;

  // Timestamps
  initiatedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transaction detail (extended)
 */
export interface TransactionDetail extends Transaction {
  // Additional details
  exchangeRate?: number;

  // Admin actions history
  history: TransactionHistoryItem[];

  // Related transactions
  relatedTransactions?: Transaction[];

  // Admin notes
  adminNotes?: string;
}

/**
 * Transaction history/audit item
 */
export interface TransactionHistoryItem {
  id: string;
  action: string;
  status: TransactionStatus;
  performedBy: string;
  performedByName: string;
  note?: string;
  timestamp: string;
}

// =============================================================================
// Filters & Stats
// =============================================================================

/**
 * Transaction filters
 */
export interface TransactionFilters {
  search?: string;
  type?: TransactionType | TransactionType[];
  status?: TransactionStatus | TransactionStatus[];
  currency?: Cryptocurrency | Cryptocurrency[];
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  isFlagged?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Transaction statistics
 */
export interface TransactionStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  flagged: number;
  totalVolume: number;
  totalVolumeUsd: number;
}

// =============================================================================
// Bulk Actions
// =============================================================================

/**
 * Bulk action request
 */
export interface BulkTransactionAction {
  transactionIds: string[];
  action: 'APPROVE' | 'FLAG' | 'CANCEL';
  reason?: string;
}
