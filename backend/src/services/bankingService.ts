import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { ValidationError, ExternalServiceError } from '../utils/errors.js';
import crypto from 'crypto';

// Types for Mono API
export interface MonoAccount {
    id: string;
    institution: {
        name: string;
        bankCode: string;
        type: string;
    };
    name: string;
    accountNumber: string;
    type: string;
    currency: string;
    balance: number;
    bvn: string;
}

export interface MonoTransaction {
    id: string;
    narration: string;
    amount: number;
    type: 'debit' | 'credit';
    balance: number;
    date: string;
    category?: string;
}

export interface RawBankTransaction {
    date: string;
    amount: number;
    description: string;
    currency: 'NGN' | 'USD';
    direction: 'CREDIT' | 'DEBIT';
}

export interface LinkedAccount {
    id: string;
    monoAccountId: string;
    userId: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    accountType: string;
    balance: number;
    lastSynced: Date;
}

// Mono API response types
interface MonoApiResponse {
    message?: string;
    data?: Record<string, unknown>;
    id?: string;
    account?: {
        _id?: string;
        institution?: { name?: string; bankCode?: string; type?: string };
        name?: string;
        accountNumber?: string;
        type?: string;
        currency?: string;
        balance?: number;
        bvn?: string;
    };
    paging?: { total?: number; page?: number; previous?: string; next?: string };
}

// Mono API base URL
const MONO_API_URL = 'https://api.withmono.com/v2';

/**
 * Banking Service - Handles Mono.co integration for open banking
 */
export class BankingService {
    private secretKey: string;

    constructor() {
        this.secretKey = config.mono.secretKey;
    }

    /**
     * Generate headers for Mono API requests
     */
    private getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'mono-sec-key': this.secretKey
        };
    }

    /**
     * Exchange auth code for account ID
     * Called after user completes Mono Connect widget
     * API: POST https://api.withmono.com/v2/accounts/auth
     */
    async exchangeAuthCode(authCode: string, userId: string): Promise<{ accountId: string; account: MonoAccount }> {
        try {
            const response = await fetch(`${MONO_API_URL}/accounts/auth`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ code: authCode })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as MonoApiResponse;
                logger.error('Mono auth exchange failed:', errorData);
                throw new ExternalServiceError(`Account linking failed: ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json() as MonoApiResponse;
            const accountId = data.id || '';

            // Fetch account details
            const account = await this.getAccountDetails(accountId);

            // Store linked account in database
            await this.storeLinkAccount(userId, accountId, account);

            logger.info(`Bank account linked for user ${userId}: ${accountId}`);

            return { accountId, account };

        } catch (error) {
            if (error instanceof ExternalServiceError) {
                throw error;
            }

            logger.error('Auth code exchange error:', error);

            // Fallback for development
            if (config.nodeEnv === 'development') {
                logger.warn('Using mock account in development');
                const mockAccountId = `mock_${crypto.randomBytes(8).toString('hex')}`;
                const mockAccount: MonoAccount = {
                    id: mockAccountId,
                    institution: { name: 'Test Bank', bankCode: '999', type: 'PERSONAL_BANKING' },
                    name: 'Test User',
                    accountNumber: '0123456789',
                    type: 'SAVINGS',
                    currency: 'NGN',
                    balance: 1500000,
                    bvn: '22********90'
                };
                return { accountId: mockAccountId, account: mockAccount };
            }

            throw new ExternalServiceError('Failed to exchange auth code');
        }
    }

    /**
     * Get account details
     * API: GET https://api.withmono.com/v2/accounts/:id
     */
    async getAccountDetails(accountId: string): Promise<MonoAccount> {
        try {
            const response = await fetch(`${MONO_API_URL}/accounts/${accountId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as MonoApiResponse;
                throw new ExternalServiceError(`Failed to get account: ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json() as MonoApiResponse;
            const account = data.account || data.data;

            return {
                id: accountId,
                institution: {
                    name: (account as MonoApiResponse['account'])?.institution?.name || 'Unknown Bank',
                    bankCode: (account as MonoApiResponse['account'])?.institution?.bankCode || '',
                    type: (account as MonoApiResponse['account'])?.institution?.type || ''
                },
                name: (account as MonoApiResponse['account'])?.name || '',
                accountNumber: (account as MonoApiResponse['account'])?.accountNumber || '',
                type: (account as MonoApiResponse['account'])?.type || '',
                currency: (account as MonoApiResponse['account'])?.currency || 'NGN',
                balance: (account as MonoApiResponse['account'])?.balance || 0,
                bvn: (account as MonoApiResponse['account'])?.bvn || ''
            };

        } catch (error) {
            if (error instanceof ExternalServiceError) {
                throw error;
            }

            logger.error('Get account error:', error);
            throw new ExternalServiceError('Failed to fetch account details');
        }
    }

    /**
     * Get account transactions
     * API: GET https://api.withmono.com/v2/accounts/:id/transactions
     */
    async getTransactions(
        accountId: string,
        options: { start?: string; end?: string; limit?: number; paginate?: boolean } = {}
    ): Promise<{ transactions: MonoTransaction[]; paging?: { total: number; next?: string } }> {
        try {
            const params = new URLSearchParams();
            if (options.start) params.append('start', options.start);
            if (options.end) params.append('end', options.end);
            if (options.limit) params.append('limit', options.limit.toString());
            if (options.paginate !== undefined) params.append('paginate', options.paginate.toString());

            const url = `${MONO_API_URL}/accounts/${accountId}/transactions?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as MonoApiResponse;
                throw new ExternalServiceError(`Failed to get transactions: ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json() as { data?: MonoTransaction[]; paging?: MonoApiResponse['paging'] };

            return {
                transactions: data.data || [],
                paging: data.paging ? {
                    total: data.paging.total || 0,
                    next: data.paging.next
                } : undefined
            };

        } catch (error) {
            if (error instanceof ExternalServiceError) {
                throw error;
            }

            logger.error('Get transactions error:', error);

            // Fallback for development
            if (config.nodeEnv === 'development') {
                logger.warn('Using mock transactions in development');
                return { transactions: this.getMockTransactions(), paging: { total: 14 } };
            }

            throw new ExternalServiceError('Failed to fetch transactions');
        }
    }

    /**
     * Sync transactions from connected bank to Fiscana
     */
    async syncTransactions(userId: string, accountId: string): Promise<{ synced: number; transactions: RawBankTransaction[] }> {
        const { transactions } = await this.getTransactions(accountId, { limit: 100, paginate: false });

        const rawTransactions: RawBankTransaction[] = transactions.map(tx => ({
            date: tx.date,
            amount: Math.abs(tx.amount / 100), // Mono returns amount in kobo
            description: tx.narration,
            currency: 'NGN' as const,
            direction: tx.type === 'credit' ? 'CREDIT' as const : 'DEBIT' as const
        }));

        logger.info(`Synced ${rawTransactions.length} transactions for account ${accountId}`);

        return { synced: rawTransactions.length, transactions: rawTransactions };
    }

    /**
     * Store linked account in database
     */
    private async storeLinkAccount(userId: string, accountId: string, account: MonoAccount): Promise<void> {
        // Note: You may want to add a LinkedBankAccount model to your Prisma schema
        // For now, we log the linkage
        logger.info(`Linked account stored: ${userId} -> ${accountId} (${account.institution.name})`);

        // TODO: Add to database when LinkedBankAccount model is available
        // await prisma.linkedBankAccount.upsert({
        //   where: { monoAccountId: accountId },
        //   create: { userId, monoAccountId: accountId, ... },
        //   update: { lastSynced: new Date() }
        // });
    }

    /**
     * Verify webhook signature from Mono
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        const hash = crypto
            .createHmac('sha512', this.secretKey)
            .update(payload)
            .digest('hex');

        return hash === signature;
    }

    /**
     * Process webhook events from Mono
     */
    async processWebhook(event: string, data: Record<string, unknown>): Promise<void> {
        logger.info(`Processing Mono webhook: ${event}`, { data });

        switch (event) {
            case 'mono.events.account_updated':
                // Account balance or details updated
                break;

            case 'mono.events.account_reauthorization_required':
                // User needs to re-authenticate
                break;

            case 'mono.events.account_connected':
                // New account connected
                break;

            default:
                logger.warn(`Unhandled Mono webhook event: ${event}`);
        }
    }

    /**
     * Get mock transactions for development
     */
    private getMockTransactions(): MonoTransaction[] {
        const today = new Date();
        const generateDate = (daysAgo: number) => {
            const d = new Date(today);
            d.setDate(d.getDate() - daysAgo);
            return d.toISOString().split('T')[0];
        };

        return [
            { id: '1', narration: 'UBER TRIP LAGOS NGA', amount: 450000, type: 'debit', balance: 150000000, date: generateDate(1) },
            { id: '2', narration: 'AWS EMEA BILLING', amount: 1500000, type: 'debit', balance: 151500000, date: generateDate(2) },
            { id: '3', narration: 'PAYSTACK/TRANSFER/UPWORK INC', amount: 45000000, type: 'credit', balance: 153000000, date: generateDate(3) },
            { id: '4', narration: 'NETFLIX.COM LAGOS', amount: 250000, type: 'debit', balance: 108000000, date: generateDate(4) },
            { id: '5', narration: 'TRF/RENT SAVINGS/PIGGYVEST', amount: 5000000, type: 'debit', balance: 108250000, date: generateDate(5) },
            { id: '6', narration: 'EBEANO SUPERMARKET LEKKI', amount: 1250000, type: 'debit', balance: 113250000, date: generateDate(6) },
            { id: '7', narration: 'MTN NIGERIA AIRTIME VTU', amount: 2400000, type: 'debit', balance: 114500000, date: generateDate(7) },
            { id: '8', narration: 'NIP/SALARY/ACME CORP', amount: 150000000, type: 'credit', balance: 116900000, date: generateDate(8) },
            { id: '9', narration: 'DSTV SUBSCRIPTION MULTICHOICE', amount: 3500000, type: 'debit', balance: -33100000, date: generateDate(9) },
            { id: '10', narration: 'DOMINOS PIZZA IKOYI', amount: 750000, type: 'debit', balance: -29600000, date: generateDate(10) },
            { id: '11', narration: 'ATM WDL @ GTBANK IKEJA', amount: 5000000, type: 'debit', balance: -28850000, date: generateDate(12) },
            { id: '12', narration: 'POS PAYMENT - SHOPRITE', amount: 1200000, type: 'debit', balance: -23850000, date: generateDate(13) },
            { id: '13', narration: 'AIRTEL DATA BUNDLE', amount: 500000, type: 'debit', balance: -22650000, date: generateDate(15) },
            { id: '14', narration: 'NIP/TRF/FROM JANE DOE', amount: 25000000, type: 'credit', balance: -22150000, date: generateDate(16) }
        ];
    }

    /**
     * Get user's linked bank accounts
     */
    async getUserAccounts(userId: string): Promise<LinkedAccount[]> {
        // TODO: Query from database when LinkedBankAccount model is available
        logger.info(`Fetching linked accounts for user ${userId}`);
        return [];
    }

    /**
     * Unlink a bank account
     */
    async unlinkAccount(userId: string, accountId: string): Promise<void> {
        try {
            // Call Mono API to unlink
            const response = await fetch(`${MONO_API_URL}/accounts/${accountId}/unlink`, {
                method: 'POST',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as MonoApiResponse;
                throw new ExternalServiceError(`Failed to unlink account: ${errorData.message || 'Unknown error'}`);
            }

            // Remove from database
            // await prisma.linkedBankAccount.delete({ where: { monoAccountId: accountId, userId } });

            logger.info(`Account ${accountId} unlinked for user ${userId}`);

        } catch (error) {
            if (error instanceof ExternalServiceError) {
                throw error;
            }
            logger.error('Unlink account error:', error);
            throw new ExternalServiceError('Failed to unlink account');
        }
    }
}

// Export singleton instance
export const bankingService = new BankingService();
