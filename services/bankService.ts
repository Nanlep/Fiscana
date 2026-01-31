
export interface BankProvider {
    id: string;
    name: string;
    logo: string; // Color hex for simulation
    type: 'COMMERCIAL' | 'MFB' | 'FINTECH';
    isConnected: boolean;
}

export const SUPPORTED_BANKS: BankProvider[] = [
    // Tier 1 Commercial
    { id: 'gtb', name: 'Guaranty Trust Bank (GTCO)', logo: '#e03c31', type: 'COMMERCIAL', isConnected: false },
    { id: 'zenith', name: 'Zenith Bank', logo: '#ff0000', type: 'COMMERCIAL', isConnected: false },
    { id: 'access', name: 'Access Bank', logo: '#ff8200', type: 'COMMERCIAL', isConnected: false },
    { id: 'uba', name: 'United Bank for Africa (UBA)', logo: '#d42e12', type: 'COMMERCIAL', isConnected: false },
    { id: 'firstbank', name: 'First Bank of Nigeria', logo: '#003b6d', type: 'COMMERCIAL', isConnected: false },
    
    // Tier 2 Commercial
    { id: 'fcmb', name: 'FCMB', logo: '#5e2686', type: 'COMMERCIAL', isConnected: false },
    { id: 'fidelity', name: 'Fidelity Bank', logo: '#1f2a63', type: 'COMMERCIAL', isConnected: false },
    { id: 'stanbic', name: 'Stanbic IBTC', logo: '#0033a1', type: 'COMMERCIAL', isConnected: false },
    { id: 'sterling', name: 'Sterling Bank', logo: '#db3832', type: 'COMMERCIAL', isConnected: false },
    { id: 'union', name: 'Union Bank', logo: '#00a5cf', type: 'COMMERCIAL', isConnected: false },
    { id: 'wema', name: 'Wema Bank / ALAT', logo: '#9a1d4e', type: 'COMMERCIAL', isConnected: false },
    { id: 'ecobank', name: 'Ecobank Nigeria', logo: '#005b82', type: 'COMMERCIAL', isConnected: false },
    
    // Regional / Specialized
    { id: 'keystone', name: 'Keystone Bank', logo: '#00558f', type: 'COMMERCIAL', isConnected: false },
    { id: 'polaris', name: 'Polaris Bank', logo: '#6f2c91', type: 'COMMERCIAL', isConnected: false },
    { id: 'providus', name: 'Providus Bank', logo: '#fbb040', type: 'COMMERCIAL', isConnected: false },
    { id: 'jaiz', name: 'Jaiz Bank', logo: '#00673e', type: 'COMMERCIAL', isConnected: false },
    { id: 'taj', name: 'Taj Bank', logo: '#8dc63f', type: 'COMMERCIAL', isConnected: false },
    { id: 'suntrust', name: 'SunTrust Bank', logo: '#009640', type: 'COMMERCIAL', isConnected: false },
    { id: 'titan', name: 'Titan Trust Bank', logo: '#be1e2d', type: 'COMMERCIAL', isConnected: false },

    // Fintechs & Neobanks
    { id: 'kuda', name: 'Kuda Microfinance Bank', logo: '#40196d', type: 'MFB', isConnected: false },
    { id: 'opay', name: 'OPay / PayCom', logo: '#00bfa5', type: 'FINTECH', isConnected: false },
    { id: 'moniepoint', name: 'Moniepoint MFB', logo: '#034c81', type: 'MFB', isConnected: false },
    { id: 'palmpay', name: 'PalmPay', logo: '#6f2c91', type: 'FINTECH', isConnected: false },
    { id: 'vfd', name: 'VFD Microfinance (V Bank)', logo: '#bc2026', type: 'MFB', isConnected: false },
    { id: 'fairmoney', name: 'FairMoney MFB', logo: '#20c997', type: 'MFB', isConnected: false },
    { id: 'carbon', name: 'Carbon', logo: '#3b255b', type: 'FINTECH', isConnected: false },
    { id: 'paga', name: 'Paga', logo: '#f58220', type: 'FINTECH', isConnected: false },
    { id: 'chipper', name: 'Chipper Cash', logo: '#6a35ff', type: 'FINTECH', isConnected: false },
    { id: 'piggyvest', name: 'Pocket by PiggyVest', logo: '#0d6efd', type: 'FINTECH', isConnected: false },
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

            // Generate somewhat randomized data based on bank type if we wanted, 
            // but for now, we use a consistent messier dataset to test the AI.
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
        }, 2000); // 2 second Simulated Network Latency
    });
};
