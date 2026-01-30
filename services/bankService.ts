
export interface BankProvider {
    id: string;
    name: string;
    logo: string; // Color hex for simulation
    isConnected: boolean;
}

export const SUPPORTED_BANKS: BankProvider[] = [
    { id: 'gtb', name: 'GTBank', logo: '#e03c31', isConnected: false },
    { id: 'zenith', name: 'Zenith Bank', logo: '#666666', isConnected: false },
    { id: 'access', name: 'Access Bank', logo: '#ff8200', isConnected: false },
    { id: 'kuda', name: 'Kuda Microfinance', logo: '#40196d', isConnected: false },
    { id: 'cowry', name: 'Cowrywise', logo: '#0066f5', isConnected: false },
];

export interface RawBankTransaction {
    date: string;
    amount: number;
    description: string;
    currency: 'NGN' | 'USD';
    direction: 'CREDIT' | 'DEBIT';
}

// Simulate fetching raw data from a bank API
export const fetchBankStatement = async (bankId: string): Promise<RawBankTransaction[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const today = new Date();
            const generateDate = (daysAgo: number) => {
                const d = new Date(today);
                d.setDate(d.getDate() - daysAgo);
                return d.toISOString().split('T')[0];
            };

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
            ];

            resolve(mockData);
        }, 2000); // 2 second Simulated Network Latency
    });
};
