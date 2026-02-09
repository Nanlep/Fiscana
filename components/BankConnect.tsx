import React, { useState } from 'react';
import { X, Shield, CheckCircle, Loader2, Building2, AlertCircle, PlayCircle } from 'lucide-react';
import { bankingApi } from '../services/apiClient';
import { analyzeTransactionsFromBank } from '../services/geminiService';
import { Transaction, TransactionType } from '../types';
import { getTaxTagForCategory } from '../utils/categories';

interface BankConnectProps {
    isOpen: boolean;
    onClose: () => void;
    onImportTransactions: (transactions: Transaction[]) => void;
    notify: (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => void;
}

declare global {
    interface Window {
        Connect: any;
    }
}

const BankConnect: React.FC<BankConnectProps> = ({ isOpen, onClose, onImportTransactions, notify }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [linkedAccountId, setLinkedAccountId] = useState<string | null>(null);

    // Retrieve Mono Public Key from env
    // Retrieve Mono Public Key from Vite env
    const MONO_PUBLIC_KEY = import.meta.env.VITE_MONO_PUBLIC_KEY || 'test_pk_demo';

    if (!isOpen) return null;

    const processTransactionsViaBackend = async (authCode: string) => {
        setIsSyncing(true);
        setProgress(10);

        try {
            // 1. Exchange auth code via backend
            setProgress(20);
            const connectResponse = await bankingApi.connect(authCode);

            if (!connectResponse.success || !connectResponse.data) {
                throw new Error(connectResponse.error || 'Failed to link account');
            }

            const accountId = connectResponse.data.accountId;
            setLinkedAccountId(accountId);
            setProgress(40);

            // 2. Sync transactions with AI categorization (backend does this)
            setProgress(60);
            const syncResponse = await bankingApi.syncTransactions(accountId);

            if (!syncResponse.success || !syncResponse.data) {
                throw new Error(syncResponse.error || 'Failed to sync transactions');
            }

            setProgress(90);

            // 3. Map to local Transaction type
            const finalTransactions: Transaction[] = syncResponse.data.transactions.map((tx, index) => {
                const cat = tx.categorization;
                const category = cat?.category || 'Uncategorized';
                const taxTag = getTaxTagForCategory(category);
                const taxDeductible = taxTag === 'ALLOWABLE_EXPENSE' || taxTag === 'CAPITAL_EXPENSE';

                return {
                    id: `mono_${Date.now()}_${index}`,
                    date: tx.date,
                    description: tx.description,
                    payee: cat?.cleanedPayee || tx.description.substring(0, 30),
                    amount: tx.amount,
                    currency: tx.currency as 'NGN' | 'USD',
                    type: tx.direction === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE,
                    category: category,
                    expenseCategory: cat?.expenseCategory || 'PERSONAL',
                    taxTag: taxTag,
                    taxDeductible: taxDeductible,
                    tags: cat?.tags || ['#MonoImport'],
                    status: 'CLEARED'
                };
            });

            setProgress(100);

            setTimeout(() => {
                onImportTransactions(finalTransactions);
                setIsSyncing(false);
                onClose();
            }, 500);

        } catch (err) {
            console.error('Bank sync error:', err);
            notify('ERROR', err instanceof Error ? err.message : 'Failed to sync with Mono.');
            setIsSyncing(false);
        }
    };

    // Fallback demo sync using mock data
    const processDemoTransactions = async () => {
        setIsSyncing(true);
        setProgress(10);

        try {
            // Simulate a delay
            await new Promise(resolve => setTimeout(resolve, 500));
            setProgress(30);

            // Mock transactions for demo
            const today = new Date();
            const generateDate = (daysAgo: number) => {
                const d = new Date(today);
                d.setDate(d.getDate() - daysAgo);
                return d.toISOString().split('T')[0];
            };

            const mockRaw = [
                { date: generateDate(1), amount: 4500, description: "UBER TRIP LAGOS NGA", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(2), amount: 15000, description: "AWS EMEA BILLING", currency: 'USD', direction: 'DEBIT' },
                { date: generateDate(3), amount: 450000, description: "PAYSTACK/TRANSFER/UPWORK INC", currency: 'NGN', direction: 'CREDIT' },
                { date: generateDate(4), amount: 2500, description: "NETFLIX.COM LAGOS", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(5), amount: 50000, description: "TRF/RENT SAVINGS/PIGGYVEST", currency: 'NGN', direction: 'DEBIT' },
                { date: generateDate(8), amount: 1500000, description: "NIP/SALARY/ACME CORP", currency: 'NGN', direction: 'CREDIT' },
            ];

            setProgress(50);

            // AI categorize via backend (if authenticated) or local fallback
            const analyzed = await analyzeTransactionsFromBank(
                mockRaw.map(tx => ({
                    description: tx.description,
                    amount: tx.amount,
                    type: tx.direction as 'CREDIT' | 'DEBIT',
                    currency: tx.currency as 'NGN' | 'USD'
                }))
            );

            setProgress(80);

            const finalTransactions: Transaction[] = mockRaw.map((raw, index) => {
                const cat = analyzed[index];
                const category = cat?.category || 'General';
                const taxTag = getTaxTagForCategory(category);
                const taxDeductible = taxTag === 'ALLOWABLE_EXPENSE' || taxTag === 'CAPITAL_EXPENSE';

                return {
                    id: `demo_${Date.now()}_${index}`,
                    date: raw.date,
                    description: raw.description,
                    payee: cat?.cleanedPayee || raw.description.substring(0, 30),
                    amount: raw.amount,
                    currency: raw.currency as 'NGN' | 'USD',
                    type: raw.direction === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE,
                    category: category,
                    expenseCategory: cat?.expenseCategory || 'PERSONAL',
                    taxTag: taxTag,
                    taxDeductible: taxDeductible,
                    tags: ['#DemoImport', ...(cat?.tags || [])],
                    status: 'CLEARED'
                };
            });

            setProgress(100);

            setTimeout(() => {
                onImportTransactions(finalTransactions);
                notify('SUCCESS', `Imported ${finalTransactions.length} demo transactions`);
                setIsSyncing(false);
                onClose();
            }, 500);

        } catch (err) {
            console.error(err);
            notify('ERROR', 'Demo sync failed.');
            setIsSyncing(false);
        }
    };

    const handleMonoConnect = () => {
        if (!window.Connect) {
            notify('ERROR', 'Mono Connect library not loaded. Try demo mode.');
            return;
        }

        const mono = new window.Connect({
            key: MONO_PUBLIC_KEY,
            onSuccess: (data: any) => {
                notify('SUCCESS', 'Account linked successfully!');
                processTransactionsViaBackend(data.code);
            },
            onClose: () => {
                notify('INFO', 'Mono widget closed');
            },
            onEvent: (eventName: string, data: any) => {
                console.log('Mono event:', eventName, data);
            },
            reference: `ref_${Date.now()}`
        });

        mono.setup();
        mono.open();
    };

    const handleDemoSync = () => {
        notify('INFO', 'Starting Demo Sync...');
        processDemoTransactions();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl scale-100 m-4 flex flex-col">

                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">M</span>
                        </div>
                        <span className="font-bold text-slate-800 text-sm">Mono Open Banking</span>
                    </div>
                    <button onClick={onClose} disabled={isSyncing} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 text-center">
                    {isSyncing ? (
                        <div className="py-8">
                            <Loader2 size={48} className="text-black animate-spin mx-auto mb-6" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Syncing Transactions</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Retrieving financial data and AI categorizing expenses...
                            </p>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-black h-2 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 font-mono">{progress}% Complete</p>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-bottom-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Building2 size={32} className="text-slate-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Link Your Bank</h2>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                Connect your GTBank, Zenith, Kuda or other accounts securely using Mono. We only fetch read-only transaction history.
                            </p>

                            <button
                                onClick={handleMonoConnect}
                                className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center space-x-2 mb-3"
                            >
                                <Shield size={18} />
                                <span>Connect with Mono</span>
                            </button>

                            {/* Demo Fallback */}
                            <button
                                onClick={handleDemoSync}
                                className="w-full py-3 bg-white text-slate-600 border border-slate-200 font-medium rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center space-x-2"
                            >
                                <PlayCircle size={18} />
                                <span>Try Demo Mode</span>
                            </button>

                            <p className="text-[10px] text-slate-400 mt-6 flex items-center justify-center">
                                <Shield size={10} className="mr-1" />
                                Secured by Mono. End-to-end encryption.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BankConnect;
