import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { ValidationError, ExternalServiceError } from '../utils/errors.js';
import crypto from 'crypto';

// Types for Bani API
export interface BaniPayoutRequest {
    amount: number;
    currency: 'NGN' | 'USDC' | 'USDT';
    destination: {
        type: 'BANK' | 'CRYPTO_WALLET';
        bankCode?: string;
        accountNumber?: string;
        walletAddress?: string;
        network?: string;
    };
    narration: string;
    reference?: string;
}

export interface BaniPayoutResponse {
    reference: string;
    status: 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED';
    message?: string;
}

export interface BankAccountDetails {
    accountName: string;
    accountNumber: string;
    bankCode: string;
    bankName: string;
}

export interface PaymentLinkRequest {
    amount: number;
    currency: string;
    customerEmail: string;
    customerName?: string;
    description?: string;
    invoiceId?: string;
    redirectUrl?: string;
}

export interface PaymentLinkResponse {
    paymentLink: string;
    reference: string;
    expiresAt: string;
}

export interface WebhookPayload {
    event: string;
    data: {
        reference: string;
        amount: number;
        currency: string;
        status: string;
        customer_email?: string;
        metadata?: Record<string, unknown>;
    };
}

// Bani API response types
interface BaniApiResponse {
    message?: string;
    data?: {
        account_name?: string;
        bank_name?: string;
        reference?: string;
        status?: 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED';
        payment_url?: string;
        expires_at?: string;
    };
    account_name?: string;
    bank_name?: string;
    payment_url?: string;
}

// Bani API base URL
const BANI_API_URL = 'https://api.bani.africa/v1';

/**
 * Payment Service - Handles all Bani.africa payment operations
 */
export class PaymentService {
    private publicKey: string;
    private secretKey: string;

    constructor() {
        this.publicKey = config.bani.publicKey;
        this.secretKey = config.bani.secretKey;
    }

    /**
     * Generate headers for Bani API requests
     */
    private getHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.secretKey}`,
            'x-bani-public-key': this.publicKey
        };
    }

    /**
     * Generate a unique reference for transactions
     */
    private generateReference(prefix: string = 'fiscana'): string {
        return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    /**
     * Resolve bank account details via NIBSS
     * API: POST https://api.bani.africa/v1/lookups/account
     */
    async resolveBankAccount(accountNumber: string, bankCode: string): Promise<BankAccountDetails> {
        if (accountNumber.length !== 10) {
            throw new ValidationError('Account number must be 10 digits');
        }

        try {
            const response = await fetch(`${BANI_API_URL}/lookups/account`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    account_number: accountNumber,
                    bank_code: bankCode
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as BaniApiResponse;
                logger.error('Bani lookup failed:', errorData);
                throw new ExternalServiceError(`Bank lookup failed: ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json() as BaniApiResponse;

            logger.info(`Bank account resolved: ${accountNumber}`);

            return {
                accountName: data.data?.account_name || data.account_name || 'Unknown',
                accountNumber,
                bankCode,
                bankName: data.data?.bank_name || data.bank_name || 'Unknown Bank'
            };

        } catch (error) {
            if (error instanceof ValidationError || error instanceof ExternalServiceError) {
                throw error;
            }

            logger.error('Bank resolution error:', error);

            // Fallback for development/testing
            if (config.nodeEnv === 'development') {
                logger.warn('Using mock bank resolution in development');
                return {
                    accountName: 'TEST ACCOUNT HOLDER',
                    accountNumber,
                    bankCode,
                    bankName: 'Test Bank'
                };
            }

            throw new ExternalServiceError('Failed to resolve bank account');
        }
    }

    /**
     * Initiate a payout (withdrawal) to bank or crypto wallet
     * API: POST https://api.bani.africa/v1/transfers/payout
     */
    async initiatePayout(request: BaniPayoutRequest): Promise<BaniPayoutResponse> {
        const reference = request.reference || this.generateReference('payout');

        try {
            const payload: Record<string, unknown> = {
                amount: request.amount,
                currency: request.currency,
                narration: request.narration,
                reference
            };

            if (request.destination.type === 'BANK') {
                payload.destination = {
                    type: 'bank_account',
                    bank_code: request.destination.bankCode,
                    account_number: request.destination.accountNumber
                };
            } else {
                payload.destination = {
                    type: 'crypto_wallet',
                    wallet_address: request.destination.walletAddress,
                    network: request.destination.network
                };
            }

            const response = await fetch(`${BANI_API_URL}/transfers/payout`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as BaniApiResponse;
                logger.error('Bani payout failed:', errorData);
                throw new ExternalServiceError(`Payout failed: ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json() as BaniApiResponse;

            logger.info(`Payout initiated: ${reference}`);

            return {
                reference: data.data?.reference || reference,
                status: data.data?.status || 'PENDING',
                message: data.message
            };

        } catch (error) {
            if (error instanceof ExternalServiceError) {
                throw error;
            }

            logger.error('Payout error:', error);

            // Fallback for development/testing
            if (config.nodeEnv === 'development') {
                logger.warn('Using mock payout in development');
                return {
                    reference,
                    status: 'PENDING',
                    message: 'Mock payout created (development mode)'
                };
            }

            throw new ExternalServiceError('Failed to initiate payout');
        }
    }

    /**
     * Create a payment collection link for invoices
     * API: POST https://api.bani.africa/v1/com/collections/payment-link
     */
    async createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
        const reference = this.generateReference('inv');

        try {
            const payload = {
                amount: request.amount,
                currency: request.currency,
                customer_email: request.customerEmail,
                customer_name: request.customerName,
                description: request.description || 'Invoice payment',
                reference,
                redirect_url: request.redirectUrl || config.frontendUrl,
                metadata: {
                    invoice_id: request.invoiceId,
                    source: 'fiscana'
                }
            };

            const response = await fetch(`${BANI_API_URL}/com/collections/payment-link`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as BaniApiResponse;
                logger.error('Bani payment link failed:', errorData);
                throw new ExternalServiceError(`Payment link creation failed: ${errorData.message || 'Unknown error'}`);
            }

            const data = await response.json() as BaniApiResponse;
            const paymentUrl = data.data?.payment_url || data.payment_url || '';

            // Update invoice with payment link if invoiceId provided
            if (request.invoiceId) {
                await prisma.invoice.update({
                    where: { id: request.invoiceId },
                    data: { baniPaymentLink: paymentUrl }
                });
            }

            logger.info(`Payment link created: ${reference}`);

            return {
                paymentLink: paymentUrl,
                reference: data.data?.reference || reference,
                expiresAt: data.data?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };

        } catch (error) {
            if (error instanceof ExternalServiceError) {
                throw error;
            }

            logger.error('Payment link error:', error);

            // Fallback for development/testing
            if (config.nodeEnv === 'development') {
                logger.warn('Using mock payment link in development');
                const mockUrl = `https://pay.bani.africa/pay/${reference}?amount=${request.amount}&currency=${request.currency}`;

                if (request.invoiceId) {
                    await prisma.invoice.update({
                        where: { id: request.invoiceId },
                        data: { baniPaymentLink: mockUrl }
                    });
                }

                return {
                    paymentLink: mockUrl,
                    reference,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                };
            }

            throw new ExternalServiceError('Failed to create payment link');
        }
    }

    /**
     * Verify webhook signature from Bani
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        const expectedSignature = crypto
            .createHmac('sha512', this.secretKey)
            .update(payload)
            .digest('hex');

        return signature === expectedSignature;
    }

    /**
     * Process webhook events from Bani
     */
    async processWebhook(payload: WebhookPayload): Promise<void> {
        const { event, data } = payload;

        logger.info(`Processing webhook: ${event}`, { reference: data.reference });

        switch (event) {
            case 'payment.successful':
                await this.handlePaymentSuccess(data);
                break;

            case 'payment.failed':
                await this.handlePaymentFailed(data);
                break;

            case 'payout.successful':
                await this.handlePayoutSuccess(data);
                break;

            case 'payout.failed':
                await this.handlePayoutFailed(data);
                break;

            default:
                logger.warn(`Unhandled webhook event: ${event}`);
        }
    }

    /**
     * Handle successful payment webhook
     */
    private async handlePaymentSuccess(data: WebhookPayload['data']): Promise<void> {
        // Find invoice by payment reference or link
        const invoice = await prisma.invoice.findFirst({
            where: {
                OR: [
                    { baniPaymentLink: { contains: data.reference } },
                    { id: data.metadata?.invoice_id as string }
                ]
            }
        });

        if (invoice) {
            const newAmountPaid = invoice.amountPaid + data.amount;
            const newStatus = newAmountPaid >= invoice.totalAmount ? 'PAID' : 'PARTIALLY_PAID';

            await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    amountPaid: newAmountPaid,
                    status: newStatus,
                    paidDate: newStatus === 'PAID' ? new Date() : null
                }
            });

            // Create payment record
            await prisma.paymentRecord.create({
                data: {
                    invoiceId: invoice.id,
                    date: new Date(),
                    amount: data.amount,
                    note: `Bani payment: ${data.reference}`
                }
            });

            // Create transaction record
            await prisma.transaction.create({
                data: {
                    userId: invoice.userId,
                    date: new Date(),
                    description: `Invoice payment from ${invoice.clientName}`,
                    payee: invoice.clientName,
                    amount: data.amount,
                    currency: data.currency || invoice.currency,
                    type: 'INCOME',
                    category: 'Invoice Payment',
                    source: 'BANI',
                    createdBy: 'SYSTEM'
                }
            });

            logger.info(`Invoice ${invoice.id} payment processed: ${data.amount}`);
        }
    }

    /**
     * Handle failed payment webhook
     */
    private async handlePaymentFailed(data: WebhookPayload['data']): Promise<void> {
        logger.warn(`Payment failed: ${data.reference}`);
        // Could send notification to user, update invoice status, etc.
    }

    /**
     * Handle successful payout webhook
     */
    private async handlePayoutSuccess(data: WebhookPayload['data']): Promise<void> {
        // Create expense transaction for the payout
        logger.info(`Payout successful: ${data.reference}`);
    }

    /**
     * Handle failed payout webhook
     */
    private async handlePayoutFailed(data: WebhookPayload['data']): Promise<void> {
        logger.warn(`Payout failed: ${data.reference}`);
        // Could send notification, initiate refund, etc.
    }

    /**
     * List Nigerian banks
     */
    async listBanks(): Promise<Array<{ code: string; name: string }>> {
        // Common Nigerian banks - in production, fetch from Bani API
        return [
            { code: '044', name: 'Access Bank' },
            { code: '023', name: 'Citibank Nigeria' },
            { code: '063', name: 'Diamond Bank' },
            { code: '050', name: 'Ecobank Nigeria' },
            { code: '084', name: 'Enterprise Bank' },
            { code: '070', name: 'Fidelity Bank' },
            { code: '011', name: 'First Bank of Nigeria' },
            { code: '214', name: 'First City Monument Bank' },
            { code: '058', name: 'Guaranty Trust Bank' },
            { code: '030', name: 'Heritage Bank' },
            { code: '301', name: 'Jaiz Bank' },
            { code: '082', name: 'Keystone Bank' },
            { code: '526', name: 'Parallex Bank' },
            { code: '076', name: 'Polaris Bank' },
            { code: '101', name: 'Providus Bank' },
            { code: '221', name: 'Stanbic IBTC Bank' },
            { code: '068', name: 'Standard Chartered Bank' },
            { code: '232', name: 'Sterling Bank' },
            { code: '100', name: 'Suntrust Bank' },
            { code: '032', name: 'Union Bank of Nigeria' },
            { code: '033', name: 'United Bank for Africa' },
            { code: '215', name: 'Unity Bank' },
            { code: '035', name: 'Wema Bank' },
            { code: '057', name: 'Zenith Bank' },
            // Digital banks
            { code: '999992', name: 'Kuda Bank' },
            { code: '999991', name: 'OPay' },
            { code: '999993', name: 'PalmPay' },
            { code: '090267', name: 'Moniepoint' }
        ];
    }
}

// Export singleton instance
export const paymentService = new PaymentService();
