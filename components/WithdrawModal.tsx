import React, { useState } from 'react';
import { X, Building2, Wallet, Loader2, CheckCircle, User, Briefcase } from 'lucide-react';
import { ExpenseCategoryType } from '../types';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdraw: (amount: number, currency: 'NGN' | 'USDC', narration: string, category: ExpenseCategoryType) => void;
  balanceNGN: number;
  balanceUSDC: number;
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, onWithdraw, balanceNGN, balanceUSDC }) => {
  const [currency, setCurrency] = useState<'NGN' | 'USDC'>('NGN');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [withdrawalType, setWithdrawalType] = useState<ExpenseCategoryType>('PERSONAL');
  const [step, setStep] = useState<'INPUT' | 'PROCESSING' | 'SUCCESS'>('INPUT');
  
  // Bank Details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  
  // Crypto Details
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState('SOL');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    if (currency === 'NGN' && val > balanceNGN) {
        alert("Insufficient NGN Balance");
        return;
    }
    if (currency === 'USDC' && val > balanceUSDC) {
        alert("Insufficient USDC Balance");
        return;
    }

    setStep('PROCESSING');
    setTimeout(() => {
        onWithdraw(val, currency, narration, withdrawalType);
        setStep('SUCCESS');
    }, 2000);
  };

  const reset = () => {
    setStep('INPUT');
    setAmount('');
    setNarration('');
    setWithdrawalType('PERSONAL');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 m-4">
        {step === 'INPUT' && (
            <>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Withdraw Funds</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Currency Selector */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setCurrency('NGN')}
                            className={`py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center space-x-2 ${currency === 'NGN' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Building2 size={16} /> <span>NGN (Fiat)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrency('USDC')}
                            className={`py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center space-x-2 ${currency === 'USDC' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Wallet size={16} /> <span>USDC (Crypto)</span>
                        </button>
                    </div>

                    {/* Available Balance */}
                    <div className="text-center py-2">
                        <p className="text-xs text-slate-500">Available Balance</p>
                        <p className="text-xl font-bold text-slate-900">
                            {currency === 'NGN' ? '₦' : '$'}
                            {currency === 'NGN' ? balanceNGN.toLocaleString() : balanceUSDC.toLocaleString()}
                        </p>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Amount to Withdraw</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                {currency === 'NGN' ? '₦' : '$'}
                            </span>
                            <input 
                                type="number" 
                                required
                                min="1"
                                max={currency === 'NGN' ? balanceNGN : balanceUSDC}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-medium"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Conditional Fields */}
                    {currency === 'NGN' ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Bank</label>
                                <select 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    required
                                >
                                    <option value="">Select Bank...</option>
                                    <option value="GTBank">Guaranty Trust Bank</option>
                                    <option value="Zenith">Zenith Bank</option>
                                    <option value="Access">Access Bank</option>
                                    <option value="Kuda">Kuda Microfinance</option>
                                    <option value="OPay">OPay</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                                <input 
                                    type="text" 
                                    maxLength={10}
                                    minLength={10}
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="0123456789"
                                    required
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Network</label>
                                <select 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                    value={network}
                                    onChange={(e) => setNetwork(e.target.value)}
                                >
                                    <option value="SOL">Solana (Low Fee)</option>
                                    <option value="BASE">Base</option>
                                    <option value="ETH">Ethereum (ERC-20)</option>
                                    <option value="POL">Polygon</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Wallet Address</label>
                                <input 
                                    type="text" 
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-mono"
                                    placeholder="Addr..."
                                    required
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Withdrawal Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Withdrawal Type</label>
                        <div className="bg-slate-100 p-1 rounded-xl flex space-x-1">
                            <button
                                type="button"
                                onClick={() => setWithdrawalType('PERSONAL')}
                                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold transition-all ${
                                    withdrawalType === 'PERSONAL' 
                                    ? 'bg-white shadow-sm text-purple-700' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <User size={16} /> <span>Personal</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setWithdrawalType('BUSINESS')}
                                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold transition-all ${
                                    withdrawalType === 'BUSINESS' 
                                    ? 'bg-white shadow-sm text-blue-700' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Briefcase size={16} /> <span>Business</span>
                            </button>
                        </div>
                    </div>

                    {/* Narration Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Narration (Optional)</label>
                        <input 
                            type="text" 
                            value={narration}
                            onChange={(e) => setNarration(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="e.g. Salary, Emergency Fund"
                        />
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit"
                            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
                        >
                            Withdraw Funds
                        </button>
                    </div>
                </form>
            </>
        )}

        {step === 'PROCESSING' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <Loader2 size={48} className="text-green-600 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Processing Withdrawal</h3>
                <p className="text-slate-500">Communicating with Bani Rails...</p>
            </div>
        )}

        {step === 'SUCCESS' && (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Withdrawal Successful</h3>
                <p className="text-slate-500 mb-6">
                    {currency === 'NGN' ? '₦' : '$'}{parseFloat(amount).toLocaleString()} has been sent to your {currency === 'NGN' ? 'bank account' : 'wallet'}.
                </p>
                <button 
                    onClick={reset}
                    className="px-8 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800"
                >
                    Done
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawModal;