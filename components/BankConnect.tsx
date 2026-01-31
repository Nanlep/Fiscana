
import React, { useState } from 'react';
import { X, Shield, CheckCircle, Loader2, Building2, AlertCircle, PlayCircle } from 'lucide-react';
import { fetchMonoTransactions } from '../services/bankService';
import { autoCategorizeTransactions } from '../services/geminiService';
import { Transaction, TransactionType } from '../types';

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

    // Retrieve Mono Public Key from env or use a placeholder for logic demonstration
    // In production, this must be process.env.REACT_APP_MONO_PUBLIC_KEY
    const MONO_PUBLIC_KEY = process.env.REACT_APP_MONO_PUBLIC_KEY || 'test_pk_...';

    if (!isOpen) return null;

    const processTransactions = async (code: string | null, isDemo: boolean = false) => {
        setIsSyncing(true);
        setProgress(10);

        try {
            // 1. Exchange Code & Fetch Raw Data (Simulated Backend Call)
            // In production, send 'code' to your backend. Backend calls Mono API to get Account ID & Transactions.
            setProgress(30);
            const rawTransactions = await fetchMonoTransactions(code || 'demo_code');
            
            // 2. AI Categorization
            setProgress(50);
            const rawDescriptions = rawTransactions.map(t => t.description);
            const analyzedData = await autoCategorizeTransactions(rawDescriptions);
            
            setProgress(80);

            // 3. Map to App Transaction Type
            const finalTransactions: Transaction[] = rawTransactions.map((raw, index) => {
                const analysis = analyzedData[index];
                const category = analysis ? analysis.category : 'General';
                const expenseCategory = analysis ? analysis.expenseCategory : 'PERSONAL';
                const taxDeductible = analysis ? analysis.taxDeductible : false;
                const cleanedPayee = analysis ? analysis.cleanedPayee : raw.description;

                return {
                    id: `mono_${Date.now()}_${index}`,
                    date: raw.date,
                    description: raw.description,
                    payee: cleanedPayee,
                    amount: raw.amount,
                    currency: raw.currency,
                    type: raw.direction === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE,
                    category: category,
                    expenseCategory: expenseCategory,
                    taxDeductible: taxDeductible,
                    tags: ['#MonoImport', ...(analysis?.tags || [])],
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
            console.error(err);
            notify('ERROR', 'Failed to sync with Mono.');
            setIsSyncing(false);
        }
    };

    const handleMonoConnect = () => {
        if (!window.Connect) {
            notify('ERROR', 'Mono Connect library not loaded.');
            return;
        }

        const mono = new window.Connect({
            key: MONO_PUBLIC_KEY,
            onSuccess: (data: any) => {
                // data.code is the auth code
                notify('SUCCESS', 'Account linked successfully!');
                processTransactions(data.code);
            },
            onClose: () => {
                notify('INFO', 'Mono widget closed');
            },
            onEvent: (eventName: string, data: any) => {
                console.log(eventName, data);
            },
            reference: `ref_${Date.now()}`
        });

        mono.setup();
        mono.open();
    };

    const handleDemoSync = () => {
        notify('INFO', 'Starting Demo Sync...');
        processTransactions(null, true);
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

                            {/* Demo Fallback if no key */}
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
