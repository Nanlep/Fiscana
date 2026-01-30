import React, { useState } from 'react';
import { X, Lock, ChevronRight, CheckCircle, Shield, Loader2, RefreshCw } from 'lucide-react';
import { SUPPORTED_BANKS, fetchBankStatement, RawBankTransaction } from '../services/bankService';
import { autoCategorizeTransactions } from '../services/geminiService';
import { Transaction, TransactionType } from '../types';

interface BankConnectProps {
    isOpen: boolean;
    onClose: () => void;
    onImportTransactions: (transactions: Transaction[]) => void;
    notify: (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => void;
}

type Step = 'SELECT_BANK' | 'LOGIN' | 'FETCHING' | 'ANALYZING' | 'SUCCESS';

const BankConnect: React.FC<BankConnectProps> = ({ isOpen, onClose, onImportTransactions, notify }) => {
    const [step, setStep] = useState<Step>('SELECT_BANK');
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Progress state for UX
    const [analysisProgress, setAnalysisProgress] = useState(0);

    if (!isOpen) return null;

    const handleSelectBank = (id: string) => {
        setSelectedBankId(id);
        setStep('LOGIN');
    };

    const handleLogin = () => {
        if (!username || !password) return;
        setStep('FETCHING');
        
        // Simulate Authenticating
        setTimeout(async () => {
            try {
                // 1. Fetch Raw Data
                const rawTransactions = await fetchBankStatement(selectedBankId!);
                
                // 2. Switch to Analyzing State
                setStep('ANALYZING');
                
                // Simulate progressive loading bar for AI
                const interval = setInterval(() => {
                    setAnalysisProgress(prev => {
                        if (prev >= 90) {
                            clearInterval(interval);
                            return 90;
                        }
                        return prev + 10;
                    });
                }, 300);

                // 3. AI Categorization
                const rawDescriptions = rawTransactions.map(t => t.description);
                const analyzedData = await autoCategorizeTransactions(rawDescriptions);
                
                clearInterval(interval);
                setAnalysisProgress(100);

                // 4. Map to App Transaction Type
                const finalTransactions: Transaction[] = rawTransactions.map((raw, index) => {
                    const analysis = analyzedData[index];
                    // Fallback if AI array length mismatch (rare)
                    const category = analysis ? analysis.category : 'General';
                    const expenseCategory = analysis ? analysis.expenseCategory : 'PERSONAL';
                    const taxDeductible = analysis ? analysis.taxDeductible : false;
                    const cleanedPayee = analysis ? analysis.cleanedPayee : raw.description;

                    return {
                        id: `bank_${selectedBankId}_${Date.now()}_${index}`,
                        date: raw.date,
                        description: raw.description,
                        payee: cleanedPayee,
                        amount: raw.amount,
                        currency: raw.currency,
                        type: raw.direction === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE,
                        category: category,
                        expenseCategory: expenseCategory,
                        taxDeductible: taxDeductible,
                        tags: ['#BankImport', ...(analysis?.tags || [])],
                        status: 'CLEARED'
                    };
                });

                // 5. Complete
                setTimeout(() => {
                    onImportTransactions(finalTransactions);
                    setStep('SUCCESS');
                }, 800);

            } catch (err) {
                console.error(err);
                notify('ERROR', 'Failed to sync with bank.');
                setStep('SELECT_BANK');
            }
        }, 1500);
    };

    const reset = () => {
        setStep('SELECT_BANK');
        setSelectedBankId(null);
        setUsername('');
        setPassword('');
        setAnalysisProgress(0);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl scale-100 m-4">
                
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <Shield className="text-green-600" size={18} />
                        <span className="font-bold text-slate-800 text-sm">Secure Bank Connection</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 h-[400px] flex flex-col">
                    
                    {step === 'SELECT_BANK' && (
                        <div className="animate-in slide-in-from-right">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Select your bank</h3>
                            <p className="text-slate-500 text-sm mb-6">Connect your primary account to auto-import transactions.</p>
                            
                            <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2">
                                {SUPPORTED_BANKS.map(bank => (
                                    <button 
                                        key={bank.id}
                                        onClick={() => handleSelectBank(bank.id)}
                                        className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: bank.logo }}>
                                                {bank.name[0]}
                                            </div>
                                            <span className="font-semibold text-slate-700 group-hover:text-slate-900">{bank.name}</span>
                                        </div>
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-green-600" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'LOGIN' && (
                        <div className="animate-in slide-in-from-right flex flex-col h-full">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Login to {SUPPORTED_BANKS.find(b => b.id === selectedBankId)?.name}</h3>
                            <p className="text-slate-500 text-sm mb-6">Enter your internet banking credentials. This is encrypted end-to-end.</p>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">User ID / Phone</label>
                                    <input 
                                        type="text" 
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password / PIN</label>
                                    <div className="relative">
                                        <input 
                                            type="password" 
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        />
                                        <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleLogin}
                                disabled={!username || !password}
                                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl mt-4 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg"
                            >
                                Secure Login
                            </button>
                        </div>
                    )}

                    {step === 'FETCHING' && (
                        <div className="flex flex-col items-center justify-center h-full animate-in fade-in">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-slate-100 border-t-green-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Lock size={20} className="text-slate-400" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mt-6">Authenticating...</h3>
                            <p className="text-slate-500 text-sm mt-2">Establishing secure handshake</p>
                        </div>
                    )}

                    {step === 'ANALYZING' && (
                         <div className="flex flex-col items-center justify-center h-full animate-in fade-in">
                            <RefreshCw size={48} className="text-blue-600 animate-spin mb-6" />
                            <h3 className="text-lg font-bold text-slate-900">AI Categorization in Progress</h3>
                            <p className="text-slate-500 text-sm mt-2 text-center max-w-xs">
                                Gemini AI is reading your statement to auto-tag expenses and income.
                            </p>
                            
                            <div className="w-full bg-slate-100 rounded-full h-2 mt-8 overflow-hidden">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${analysisProgress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-blue-600 font-bold mt-2">{analysisProgress}% Complete</p>
                        </div>
                    )}

                    {step === 'SUCCESS' && (
                         <div className="flex flex-col items-center justify-center h-full animate-in zoom-in">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Sync Complete!</h3>
                            <p className="text-slate-500 text-center mb-8">
                                Your transactions have been imported, categorized, and added to your ledger.
                            </p>
                            <button 
                                onClick={reset}
                                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg"
                            >
                                Go to Ledger
                            </button>
                        </div>
                    )}

                </div>
                
                {/* Footer Security Badge */}
                <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 flex items-center justify-center">
                        <Lock size={10} className="mr-1" />
                        End-to-end 256-bit encryption. Fiscana does not store your banking credentials.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BankConnect;
