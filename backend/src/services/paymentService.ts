import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { ValidationError, ExternalServiceError } from '../utils/errors.js';
import crypto from 'crypto';

// ==================== Types ====================

/** Request to verify a Nigerian bank account */
interface VerifyAccountRequest {
    accountNumber: string;
    bankCode: string;
    listCode?: string;
    countryCode?: string;
}

/** Verified bank account details */
interface BankAccountDetails {
    accountName: string;
    accountNumber: string;
    bankName: string;
}

/** Request to initiate a bank transfer payout */
interface PayoutRequest {
    amount: number;
    currency: string;
    destination: {
        type: 'BANK' | 'MOBILE_MONEY';
        bankCode?: string;
        accountNumber?: string;
        accountName?: string;
        countryCode?: string;
        phoneNumber?: string;
    };
    narration?: string;
    reference?: string;
}

/** Payout response from Bani */
interface PayoutResponse {
    reference: string;
    payoutRef: string;
    status: string;
    message: string;
}

/** Request to create a payment collection (virtual account) */
interface PaymentCollectionRequest {
    amount: number;
    currency: string;
    customerRef: string;
    countryCode?: string;
    accountType?: 'temporary' | 'permanent';
    holderBvn?: string;
    bankName?: string;
    externalRef?: string;
    customData?: Record<string, unknown>;
    expiryDays?: number;
}

/** Payment collection response — virtual bank account details */
interface PaymentCollectionResponse {
    paymentReference: string;
    accountNumber: string;
    bankName: string;
    accountName: string;
    amount: string;
    externalReference: string;
    accountType: string;
    customData: Record<string, unknown> | null;
}

/** Request to check payment status */
interface PaymentStatusRequest {
    payRef?: string;
    payExtRef?: string;
}

/** Bani webhook payload */
interface WebhookPayload {
    event: string;
    data: {
        pay_ref?: string;
        pay_ext_ref?: string;
        pay_amount?: string;
        pay_method?: string;
        pay_status?: string;
        holder_currency?: string;
        holder_country_code?: string;
        holder_account_number?: string;
        holder_bank_name?: string;
        holder_first_name?: string;
        holder_last_name?: string;
        custom_data?: Record<string, unknown>;
        customer_ref?: string;
        payout_ref?: string;
        payout_status?: string;
        transfer_ext_ref?: string;
        merch_amount?: string;
        merch_currency?: string;
        actual_amount_paid?: number;
        [key: string]: unknown;
    };
}

// Generic Bani API response shape
interface BaniApiResponse {
    status: boolean;
    status_code: number;
    message: string;
    data?: unknown;
    [key: string]: unknown;
}

// ==================== Service ====================

const BANI_BASE_URL = config.bani.baseUrl;

/**
 * Payment Service — Handles all Bani.africa payment operations
 * using the correct Bani API endpoints and authentication
 */
class PaymentService {
    private accessToken: string;
    private privateKey: string;
    private webhookKey: string;

    constructor() {
        this.accessToken = config.bani.accessToken;
        this.privateKey = config.bani.privateKey;
        this.webhookKey = config.bani.webhookKey;
    }

    /**
     * Generate the moni-signature header value.
     * HMAC-SHA256 of the private key + JSON request body.
     */
    private generateSignature(payload: string): string {
        return crypto
            .createHmac('sha256', this.privateKey)
            .update(payload)
            .digest('hex');
    }

    /**
     * Build standard Bani API headers.
     * Every request needs Authorization (Bearer token), Content-Type, and moni-signature.
     */
    private getHeaders(payload: string = ''): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
            'moni-signature': this.generateSignature(payload),
        };
    }

    /** Generate a unique reference for transactions */
    private generateReference(prefix: string = 'fiscana'): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        return `${prefix}_${timestamp}_${random}`;
    }

    // ==================== Payouts ====================

    /**
     * List Nigerian banks for payouts.
     * API: GET /partner/list_banks/{country_code}/
     */
    async listBanks(countryCode: string = 'NG'): Promise<Array<{ code: string; name: string }>> {
        try {
            const response = await fetch(`${BANI_BASE_URL}/partner/list_banks/${countryCode}/`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Bani API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json() as BaniApiResponse;

            if (!data.status || !Array.isArray(data.data)) {
                throw new Error(data.message || 'Failed to fetch banks');
            }

            return (data.data as Array<{ bank_code: string; bank_name: string }>).map(bank => ({
                code: bank.bank_code,
                name: bank.bank_name,
            }));

        } catch (error: any) {
            logger.error('Failed to list banks', { error: error.message });
            throw new ExternalServiceError(`Bani: ${error.message}`);
        }
    }

    /**
     * Verify a Nigerian bank account number.
     * API: POST /partner/payout/verify_bank_account/
     */
    async resolveBankAccount(accountNumber: string, bankCode: string): Promise<BankAccountDetails> {
        if (!accountNumber || accountNumber.length !== 10) {
            throw new ValidationError('Account number must be 10 digits');
        }

        try {
            const payload = {
                list_code: 'T001',
                bank_code: bankCode,
                country_code: 'NG',
                account_number: accountNumber,
            };

            const body = JSON.stringify(payload);
            const response = await fetch(`${BANI_BASE_URL}/partner/payout/verify_bank_account/`, {
                method: 'POST',
                headers: this.getHeaders(body),
                body,
            });

            const data = await response.json() as BaniApiResponse;

            if (!data.status) {
                throw new Error(data.message || 'Failed to verify bank account');
            }

            return {
                accountName: (data as any).account_name || '',
                accountNumber: (data as any).account_number || accountNumber,
                bankName: (data as any).bank_name || '',
            };

        } catch (error: any) {
            logger.error('Failed to resolve bank account', { error: error.message, accountNumber, bankCode });
            if (error instanceof ValidationError) throw error;
            throw new ExternalServiceError(`Bani: ${error.message}`);
        }
    }

    /**
     * Initiate a bank transfer payout.
     * API: POST /partner/payout/initiate_transfer/
     */
    async initiatePayout(request: PayoutRequest): Promise<PayoutResponse> {
        const reference = request.reference || this.generateReference('payout');

        try {
            const payload: Record<string, string> = {
                payout_step: 'direct',
                receiver_currency: request.currency,
                receiver_amount: request.amount.toString(),
                sender_amount: request.amount.toString(),
                sender_currency: request.currency,
                transfer_ext_ref: reference,
            };

            if (request.destination.type === 'BANK') {
                payload.transfer_method = 'bank';
                payload.transfer_receiver_type = 'personal';
                payload.receiver_account_num = request.destination.accountNumber || '';
                payload.receiver_sort_code = request.destination.bankCode || '';
                payload.receiver_account_name = request.destination.accountName || '';
                payload.receiver_country_code = request.destination.countryCode || 'NG';
            } else if (request.destination.type === 'MOBILE_MONEY') {
                payload.transfer_method = 'mobile_money';
                payload.transfer_receiver_type = 'personal';
                payload.receiver_account_num = request.destination.phoneNumber || '';
                payload.receiver_account_name = request.destination.accountName || '';
                payload.receiver_country_code = request.destination.countryCode || '';
            }

            if (request.narration) {
                payload.transfer_note = request.narration;
            }

            const body = JSON.stringify(payload);
            const response = await fetch(`${BANI_BASE_URL}/partner/payout/initiate_transfer/`, {
                method: 'POST',
                headers: this.getHeaders(body),
                body,
            });

            const data = await response.json() as BaniApiResponse;

            if (!data.status) {
                throw new Error(data.message || 'Payout initiation failed');
            }

            // Log payout in database
            try {
                await prisma.transaction.create({
                    data: {
                        userId: 'system',
                        type: 'EXPENSE',
                        amount: request.amount,
                        currency: request.currency,
                        description: `Payout to ${request.destination.accountNumber || request.destination.phoneNumber}`,
                        payee: request.destination.accountName || 'Unknown',
                        category: 'Transfer',
                        status: 'PENDING',
                        source: 'SYSTEM',
                        createdBy: 'system',
                        date: new Date(),
                    },
                });
            } catch (dbError) {
                logger.warn('Failed to log payout transaction in database', { reference });
            }

            return {
                reference,
                payoutRef: (data as any).payout_ref || '',
                status: 'PENDING',
                message: data.message || 'Payout in progress',
            };

        } catch (error: any) {
            logger.error('Payout failed', { error: error.message, reference });
            throw new ExternalServiceError(`Bani: ${error.message}`);
        }
    }

    // ==================== Collections ====================

    /**
     * List banks available for payment collections (bank transfer).
     * API: GET /partner/list_payment_banks/{country_code}/
     */
    async listPaymentBanks(countryCode: string = 'NG'): Promise<Array<{ bankName: string; currency: string }>> {
        try {
            const response = await fetch(`${BANI_BASE_URL}/partner/list_payment_banks/${countryCode}/`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            const data = await response.json() as BaniApiResponse;

            if (!data.status || !Array.isArray(data.data)) {
                throw new Error(data.message || 'Failed to fetch payment banks');
            }

            return (data.data as Array<{ bank_name: string; currency: string }>).map(bank => ({
                bankName: bank.bank_name,
                currency: bank.currency,
            }));

        } catch (error: any) {
            logger.error('Failed to list payment banks', { error: error.message });
            throw new ExternalServiceError(`Bani: ${error.message}`);
        }
    }

    /**
     * Create a payment collection by generating a virtual bank account.
     * Customers pay by transferring to this account.
     * API: POST /partner/collection/bank_transfer/
     */
    async createPaymentCollection(request: PaymentCollectionRequest): Promise<PaymentCollectionResponse> {
        const externalRef = request.externalRef || this.generateReference('inv');

        try {
            const payload: Record<string, unknown> = {
                pay_va_step: 'direct',
                country_code: request.countryCode || 'NG',
                pay_amount: request.amount.toString(),
                pay_currency: request.currency || 'NGN',
                holder_account_type: request.accountType || 'temporary',
                customer_ref: request.customerRef,
                pay_ext_ref: externalRef,
            };

            if (request.holderBvn) {
                payload.holder_legal_number = request.holderBvn;
            }

            if (request.bankName) {
                payload.bank_name = request.bankName;
            }

            if (request.customData) {
                payload.custom_data = request.customData;
            }

            if (request.expiryDays) {
                payload.pay_expiry = request.expiryDays;
            }

            const body = JSON.stringify(payload);
            const response = await fetch(`${BANI_BASE_URL}/partner/collection/bank_transfer/`, {
                method: 'POST',
                headers: this.getHeaders(body),
                body,
            });

            const data = await response.json() as BaniApiResponse & {
                payment_reference?: string;
                holder_account_number?: string;
                holder_bank_name?: string;
                account_name?: string;
                amount?: string;
                payment_ext_reference?: string;
                account_type?: string;
                custom_data?: Record<string, unknown> | null;
            };

            if (!data.status) {
                throw new Error(data.message || 'Failed to create payment collection');
            }

            const result: PaymentCollectionResponse = {
                paymentReference: data.payment_reference || '',
                accountNumber: data.holder_account_number || '',
                bankName: data.holder_bank_name || '',
                accountName: data.account_name || '',
                amount: data.amount || request.amount.toString(),
                externalReference: data.payment_ext_reference || externalRef,
                accountType: data.account_type || request.accountType || 'temporary',
                customData: data.custom_data || null,
            };

            // Update invoice with payment details if invoiceId is in customData
            const invoiceId = request.customData?.invoiceId as string | undefined;
            if (invoiceId) {
                try {
                    await prisma.invoice.update({
                        where: { id: invoiceId },
                        data: {
                            paymentAccountNumber: result.accountNumber,
                            paymentBankName: result.bankName,
                            paymentAccountName: result.accountName,
                            status: 'SENT',
                        },
                    });
                } catch (dbError) {
                    logger.warn('Failed to update invoice with payment details', { invoiceId });
                }
            }

            logger.info('Payment collection created', {
                paymentReference: result.paymentReference,
                accountNumber: result.accountNumber,
                bankName: result.bankName,
                amount: result.amount,
            });

            return result;

        } catch (error: any) {
            logger.error('Failed to create payment collection', { error: error.message });
            throw new ExternalServiceError(`Bani: ${error.message}`);
        }
    }

    /**
     * Check the status of a payment collection.
     * API: POST /partner/collection/pay_status_check/
     */
    async checkPaymentStatus(request: PaymentStatusRequest): Promise<{
        payRef: string;
        payStatus: string;
        payAmount: string;
        payMethod: string;
    }> {
        try {
            const payload: Record<string, string> = {};
            if (request.payRef) payload.pay_ref = request.payRef;
            if (request.payExtRef) payload.pay_ext_ref = request.payExtRef;

            const body = JSON.stringify(payload);
            const response = await fetch(`${BANI_BASE_URL}/partner/collection/pay_status_check/`, {
                method: 'POST',
                headers: this.getHeaders(body),
                body,
            });

            const data = await response.json() as BaniApiResponse & {
                pay_ref?: string;
                pay_status?: string;
                pay_amount?: string;
                pay_method?: string;
            };

            if (!data.status) {
                throw new Error(data.message || 'Failed to check payment status');
            }

            return {
                payRef: data.pay_ref || '',
                payStatus: data.pay_status || 'unknown',
                payAmount: data.pay_amount || '0',
                payMethod: data.pay_method || '',
            };

        } catch (error: any) {
            logger.error('Failed to check payment status', { error: error.message });
            throw new ExternalServiceError(`Bani: ${error.message}`);
        }
    }

    // ==================== Webhooks ====================

    /**
     * Verify webhook signature from Bani.
     * Method 1: HMAC-SHA256 of (privateKey, rawBody) compared to bani-hook-signature header.
     * Method 2: Compare BANI-SHARED-KEY header with webhookKey from dashboard.
     */
    verifyWebhookSignature(rawBody: string, signature: string, sharedKey?: string): boolean {
        // Method 1: HMAC signature verification
        if (signature) {
            const sig = Buffer.from(signature, 'utf8');
            const hmac = crypto.createHmac('sha256', this.privateKey);
            const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');

            if (sig.length === digest.length && crypto.timingSafeEqual(digest, sig)) {
                return true;
            }
        }

        // Method 2: Shared key verification (fallback)
        if (sharedKey && this.webhookKey) {
            return sharedKey === this.webhookKey;
        }

        return false;
    }

    /**
     * Process webhook events from Bani.
     * Event types: payin_bank_transfer, payin_mobile_money, payout, payout_reversal, etc.
     */
    async processWebhook(payload: WebhookPayload): Promise<void> {
        const { event, data } = payload;
        logger.info('Processing Bani webhook', { event, payRef: data.pay_ref || data.payout_ref });

        switch (event) {
            case 'payin_bank_transfer':
            case 'payin_mobile_money':
            case 'payin_ewallet':
                await this.handlePaymentReceived(data);
                break;

            case 'payout':
                await this.handlePayoutCompleted(data);
                break;

            case 'payout_reversal':
                await this.handlePayoutReversed(data);
                break;

            case 'collection_service_status':
                logger.info('Collection service status update', { data });
                break;

            default:
                logger.warn('Unhandled webhook event', { event });
        }
    }

    /**
     * Handle incoming payment (bank transfer, mobile money, e-wallet).
     * Updates the corresponding invoice status to PAID.
     */
    private async handlePaymentReceived(data: WebhookPayload['data']): Promise<void> {
        const payRef = data.pay_ref;
        const payStatus = data.pay_status;
        const amount = data.actual_amount_paid || parseFloat(data.pay_amount || '0');

        logger.info('Payment received', { payRef, payStatus, amount });

        if (payStatus !== 'paid' && payStatus !== 'completed') {
            logger.info('Payment not yet completed, skipping', { payStatus });
            return;
        }

        // Find and update invoice by payment reference
        try {
            const invoice = await prisma.invoice.findFirst({
                where: {
                    id: payRef,
                },
            });

            if (invoice) {
                const newAmountPaid = (invoice.amountPaid || 0) + amount;
                const isPaidInFull = newAmountPaid >= invoice.totalAmount;

                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        amountPaid: newAmountPaid,
                        status: isPaidInFull ? 'PAID' : 'PARTIAL',
                    },
                });

                logger.info('Invoice updated from webhook', {
                    invoiceId: invoice.id,
                    amountPaid: newAmountPaid,
                    status: isPaidInFull ? 'PAID' : 'PARTIAL',
                });
            } else {
                logger.warn('No matching invoice found for payment', { payRef });
            }
        } catch (dbError: any) {
            logger.error('Failed to update invoice from webhook', { error: dbError.message, payRef });
        }
    }

    /** Handle successful payout webhook */
    private async handlePayoutCompleted(data: WebhookPayload['data']): Promise<void> {
        logger.info('Payout completed', {
            payoutRef: data.payout_ref,
            status: data.payout_status,
            extRef: data.transfer_ext_ref,
        });
    }

    /** Handle payout reversal webhook */
    private async handlePayoutReversed(data: WebhookPayload['data']): Promise<void> {
        logger.warn('Payout reversed', {
            payoutRef: data.payout_ref,
            extRef: data.transfer_ext_ref,
        });
    }
}

// Singleton export
export const paymentService = new PaymentService();

// Export types for use in routes
export type {
    BankAccountDetails,
    PayoutRequest,
    PayoutResponse,
    PaymentCollectionRequest,
    PaymentCollectionResponse,
    PaymentStatusRequest,
    WebhookPayload,
};
