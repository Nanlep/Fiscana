
// Bani payment service — delegates to backend API via apiClient
// Docs: https://docs.bani.africa/

import { paymentsApi } from './apiClient';

export interface BaniPayoutRequest {
    amount: number;
    currency: 'NGN' | 'USDC' | 'USDT';
    destination: {
        type: 'BANK' | 'MOBILE_MONEY';
        bankCode?: string;
        accountNumber?: string;
        accountName?: string;
        countryCode?: string;
        phoneNumber?: string;
    };
    narration: string;
}

/**
 * Resolves a bank account via the backend (Bani Lookups API).
 */
export const resolveBankAccount = async (accountNumber: string, bankCode: string): Promise<string> => {
    const response = await paymentsApi.resolveAccount(accountNumber, bankCode);
    if (response.success && response.data) {
        return response.data.accountName;
    }
    throw new Error(response.error || 'Could not resolve account details.');
};

/**
 * Initiates a payout (withdrawal) via the backend (Bani Payout API).
 */
export const initiatePayout = async (request: BaniPayoutRequest): Promise<{ reference: string; status: string }> => {
    const response = await paymentsApi.initiatePayout({
        amount: request.amount,
        currency: request.currency as 'NGN' | 'USDC' | 'USDT',
        destination: {
            type: request.destination.type,
            bankCode: request.destination.bankCode,
            accountNumber: request.destination.accountNumber,
            accountName: request.destination.accountName,
            countryCode: request.destination.countryCode,
            phoneNumber: request.destination.phoneNumber,
        },
        narration: request.narration,
    });

    if (response.success && response.data) {
        return {
            reference: response.data.reference,
            status: response.data.status,
        };
    }
    throw new Error(response.error || 'Payout failed.');
};

/**
 * Creates a payment collection link via the backend (Bani Collections API).
 */
export const createCollectionLink = async (amount: number, currency: string, customerEmail: string): Promise<string> => {
    // This now goes through the add-funds endpoint for virtual account creation
    const response = await paymentsApi.addFunds({ amount, currency });
    if (response.success && response.data) {
        // Return the payment reference for tracking
        return response.data.paymentReference;
    }
    throw new Error(response.error || 'Failed to create collection.');
};
