
import React, { useState, useEffect, useRef } from 'react';
import { X, Building2, Wallet, Loader2, CheckCircle, User, Briefcase, ShieldCheck, ChevronDown, Search, AlertOctagon } from 'lucide-react';
import { ExpenseCategoryType } from '../types';
import { resolveBankAccount, initiatePayout } from '../services/baniService';
import { NIGERIAN_BANKS, Bank } from '../utils/banks';

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
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState(''); // For display in input
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  
  // Searchable Dropdown State
  const [isBankListOpen, setIsBankListOpen] = useState(false);
  const [bankSearchTerm, setBankSearchTerm] = useState('');
  const bankListRef = useRef<HTMLDivElement>(null);

  // Crypto Details
  const [walletAddress, setWalletAddress] = useState('');
  const [network, setNetwork] = useState('SOL');

  useEffect(() => {
      // Auto-verify account when 10 digits entered and bank is selected
      if (currency === 'NGN' && accountNumber.length === 10 && bankCode) {
          verifyAccount();
      } else {
          setAccountName('');
          setVerificationError('');
      }
  }, [accountNumber, bankCode, currency]);

  // Handle clicking outside the bank dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (bankListRef.current && !bankListRef.current.contains(event.target as Node)) {
            setIsBankListOpen(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const verifyAccount = async () => {
      setIsVerifying(true);
      setVerificationError('');
      setAccountName('');
      
      try {
          const name = await resolveBankAccount(accountNumber, bankCode);
          setAccountName(name);
      } catch (error) {
          setAccountName('');
          setVerificationError('Could not verify account details.');
      } finally {
          setIsVerifying(false);
      }
  };

  const filteredBanks = NIGERIAN_BANKS.filter(bank => 
      bank.name.toLowerCase().includes(bankSearchTerm.toLowerCase())
  );

  const handleSelectBank = (bank: Bank) => {
      setBankCode(bank.code);
      setBankName(bank.name);
      setIsBankListOpen(false);
      setBankSearchTerm(''); // Reset search
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    
    // Validations
    if (!val || val <= 0) return;
    if (currency === 'NGN' && val > balanceNGN) {
        alert("Insufficient NGN Balance");
        return;
    }
    if (currency === 'USDC' && val > balanceUSDC) {
        alert("Insufficient USDC Balance");
        return;
    }
    if (currency === 'NGN' && !accountName) {
        alert("Please ensure the account name is verified before proceeding.");
        return;
    }

    setStep('PROCESSING');

    try {
        // Call Bani Service
        await initiatePayout({
            amount: val,
            currency: currency,
            destination: currency === 'NGN' ? {
                type: 'BANK',
                bankCode,
                accountNumber
            } : {
                type: 'CRYPTO_WALLET',
                walletAddress,
                network
            },
            narration: narration || 'Withdrawal from Fiscana'
        });

        // If successful, update local app state
        onWithdraw(val, currency, narration, withdrawalType);
        setStep('SUCCESS');

    } catch (error) {
        alert("Withdrawal failed. Please try again.");
        setStep('INPUT');
    }
  };

  const reset = () => {
    setStep('INPUT');
    setAmount('');
    setNarration('');
    setWithdrawalType('PERSONAL');
    setAccountNumber('');
    setAccountName('');
    setWalletAddress('');
    setBankCode('');
    setBankName('');
    setVerificationError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 m-4 flex flex-col max-h-[90vh]">
        {step === 'INPUT' && (
            <>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold text-slate-900">Withdraw Funds</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto pr-1 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-4 p-1">
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
                            <div className="space-y-4">
                                {/* Searchable Bank Dropdown */}
                                <div className="relative" ref={bankListRef}>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Bank</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsBankListOpen(!isBankListOpen)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-left flex justify-between items-center bg-white"
                                    >
                                        <span className={bankName ? 'text-slate-900' : 'text-slate-400'}>
                                            {bankName || "Search or Select Bank..."}
                                        </span>
                                        <ChevronDown size={16} className="text-slate-400" />
                                    </button>

                                    {isBankListOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input 
                                                        type="text"
                                                        value={bankSearchTerm}
                                                        onChange={(e) => setBankSearchTerm(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                                        placeholder="Type to search..."
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                                {filteredBanks.length > 0 ? (
                                                    filteredBanks.map((bank) => (
                                                        <button
                                                            key={bank.code}
                                                            type="button"
                                                            onClick={() => handleSelectBank(bank)}
                                                            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 transition-colors border-b border-slate-50 last:border-0"
                                                        >
                                                            {bank.name}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 text-sm text-slate-400 text-center">No banks found</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            maxLength={10}
                                            minLength={10}
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 outline-none transition-colors ${
                                                verificationError ? 'border-red-300 focus:ring-red-500' : 
                                                accountName ? 'border-green-500 focus:ring-green-500' : 'border-slate-200 focus:ring-green-500'
                                            }`}
                                            placeholder="0123456789"
                                            required
                                        />
                                        {isVerifying && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <Loader2 size={16} className="animate-spin text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Account Holder Name Field (Populated by API) */}
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Verified Account Name</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={accountName || verificationError}
                                            readOnly
                                            className={`w-full px-4 py-3 border rounded-xl font-bold text-sm outline-none transition-all ${
                                                verificationError
                                                ? 'bg-red-50 border-red-200 text-red-600'
                                                : accountName 
                                                    ? 'bg-green-50 border-green-200 text-green-800' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                            }`}
                                            placeholder="Waiting for verification..."
                                        />
                                        {accountName && !verificationError && (
                                            <CheckCircle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 animate-in zoom-in" />
                                        )}
                                        {verificationError && (
                                            <AlertOctagon size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 animate-in zoom-in" />
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Auto-populated from NIBSS via Bani. Ensure this matches your beneficiary.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Network</label>
                                    <select 
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
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
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-mono"
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
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="e.g. Salary, Emergency Fund"
                            />
                        </div>

                        <div className="pt-2">
                            <button 
                                type="submit"
                                disabled={currency === 'NGN' && (!accountName || isVerifying)}
                                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                {isVerifying && <Loader2 size={18} className="animate-spin" />}
                                <span>{isVerifying ? 'Verifying Account...' : 'Withdraw Funds'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </>
        )}

        {step === 'PROCESSING' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <Loader2 size={48} className="text-green-600 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Processing via Bani</h3>
                <p className="text-slate-500">Initiating secure payout rails...</p>
            </div>
        )}

        {step === 'SUCCESS' && (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Withdrawal Initiated</h3>
                <p className="text-slate-500 mb-6">
                    {currency === 'NGN' ? '₦' : '$'}{parseFloat(amount).toLocaleString()} has been sent. <br/>
                    <span className="text-xs text-slate-400">Powered by Bani.africa</span>
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
