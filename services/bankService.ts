
export interface RawBankTransaction {
    date: string;
    amount: number;
    description: string;
    currency: 'NGN' | 'USD';
    direction: 'CREDIT' | 'DEBIT';
}

/**
 * Simulates the backend process of:
 * 1. Exchanging the Mono `auth_code` for an Account ID.
 * 2. Fetching transactions from the Mono API for that account.
 * 
 * In a real production app, this function would call your own backend endpoint.
 */
export const fetchMonoTransactions = async (authCode: string): Promise<RawBankTransaction[]> => {
    return new Promise((resolve) => {
        console.log(`[Mono Service] Exchanging auth_code: ${authCode}`);
        
        setTimeout(() => {
            const today = new Date();
            const generateDate = (daysAgo: number) => {
                const d = new Date(today);
                d.setDate(d.getDate() - daysAgo);
                return d.toISOString().split('T')[0];
            };

            // Simulated transaction data returned from Mono API
            const mockData: RawBankTransaction[] = [
                { date: generateDate(1), amount: 4500, description: "UBER TRIP LAGOS NGA", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(2), amount: 15000, description: "AWS EMEA BILLING", currency: 'USD', direction: 'DEBIT' },
                { date: generateDate(3), amount: 450000, description: "PAYSTACK/TRANSFER/UPWORK INC", currency: 'NGN', direction: 'CREDIT' },
                { date: generateDate(4), amount: 2500, description: "NETFLIX.COM LAGOS", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(5), amount: 50000, description: "TRF/RENT SAVINGS/PIGGYVEST", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(6), amount: 12500, description: "EBEANO SUPERMARKET LEKKI", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(7), amount: 24000, description: "MTN NIGERIA AIRTIME VTU", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(8), amount: 1500000, description: "NIP/SALARY/ACME CORP", currency: 'NGN', direction: 'CREDIT' },
                { date: generateDate(9), amount: 35000, description: "DSTV SUBSCRIPTION MULTICHOICE", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(10), amount: 7500, description: "DOMINOS PIZZA IKOYI", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(12), amount: 50000, description: "ATM WDL @ GTBANK IKEJA", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(13), amount: 12000, description: "POS PAYMENT - SHOPRITE", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(15), amount: 5000, description: "AIRTEL DATA BUNDLE", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(16), amount: 250000, description: "NIP/TRF/FROM JANE DOE", currency: 'NGN', direction: 'CREDIT' },
            ];

            resolve(mockData);
        }, 2000); // Simulate network latency
    });
};

// Deprecated: Internal list only needed if building custom UI. Mono Widget handles selection.
export const SUPPORTED_BANKS = []; 
