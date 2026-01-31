
// Simulated interaction with Bani.africa API
// Docs: https://docs.bani.africa/

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
}

/**
 * Simulates resolving a bank account via Bani's Lookups API.
 * In production: POST https://api.bani.africa/v1/lookups/account
 */
export const resolveBankAccount = async (accountNumber: string, bankCode: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Simulate network delay
        setTimeout(() => {
            if (accountNumber.length === 10) {
                // Return a mock resolved name
                resolve("TAIWO DAVID DOE");
            } else {
                reject("Could not resolve account details.");
            }
        }, 1500);
    });
};

/**
 * Simulates initiating a payout (Withdrawal) via Bani.
 * Supports both Fiat (NIP) and Crypto Rails.
 */
export const initiatePayout = async (request: BaniPayoutRequest): Promise<{ reference: string; status: string }> => {
    return new Promise((resolve) => {
        console.log("[Bani Service] Processing Payout:", request);
        
        setTimeout(() => {
            resolve({
                reference: `bani_ref_${Math.random().toString(36).substr(2, 9)}`,
                status: 'SUCCESSFUL' // or 'PENDING'
            });
        }, 2000);
    });
};

/**
 * Generates a Bani Payment Link for Invoices.
 * In production: POST https://api.bani.africa/v1/com/collections/payment-link
 */
export const createCollectionLink = async (amount: number, currency: string, customerEmail: string): Promise<string> => {
    return new Promise((resolve) => {
         setTimeout(() => {
            // Returns a mock Bani checkout URL
            const ref = Math.random().toString(36).substr(2, 8);
            resolve(`https://pay.bani.africa/pay/${ref}?amount=${amount}&currency=${currency}&email=${customerEmail}`);
        }, 1000);
    });
};
