import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, Lock, CheckCircle, Fingerprint, Loader2, AlertCircle, FileText, Clock } from 'lucide-react';

interface KYCVerificationProps {
  user: UserProfile;
  onSubmit: (bvn: string, nin: string) => void;
}

const KYCVerification: React.FC<KYCVerificationProps> = ({ user, onSubmit }) => {
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (bvn.length !== 11) {
        setError('BVN must be exactly 11 digits');
        return;
    }
    if (nin.length !== 11) {
        setError('NIN must be exactly 11 digits');
        return;
    }

    setIsSubmitting(true);

    // Simulate Network Request
    setTimeout(() => {
        setIsSubmitting(false);
        onSubmit(bvn, nin);
    }, 1500);
  };

  if (user.kycStatus === 'VERIFIED') {
      return (
        <div className="p-8 h-full flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-3xl p-12 max-w-2xl w-full text-center shadow-sm border border-green-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck size={48} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Identity Verified</h2>
                <p className="text-slate-500 mb-8">Your account is upgraded to <strong>{user.tier.replace('_', ' ')}</strong>. You now have access to high-value transaction limits and global features.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Daily Transaction Limit</p>
                        <p className="text-xl font-bold text-slate-900">₦50,000,000</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Global Accounts</p>
                        <p className="text-xl font-bold text-slate-900">USD, GBP, EUR</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Crypto Withdrawals</p>
                        <p className="text-xl font-bold text-slate-900">Unlimited</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Verification Method</p>
                        <div className="flex items-center space-x-2">
                             <Fingerprint size={16} className="text-green-600"/>
                             <span className="font-semibold text-slate-900">Biometric (BVN/NIN)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  if (user.kycStatus === 'PENDING') {
    return (
        <div className="p-8 h-full flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-3xl p-12 max-w-xl w-full text-center shadow-sm border border-amber-100">
                <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock size={48} className="animate-pulse"/>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Verification Pending</h2>
                <p className="text-slate-500 mb-6">
                    Your documents have been securely transmitted and are currently under review by our compliance team.
                </p>
                <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 border border-slate-100">
                    <p className="mb-2"><strong>What happens next?</strong></p>
                    <ul className="text-left space-y-2 list-disc list-inside">
                        <li>Admin review (usually within 24 hours)</li>
                        <li>Notification via email upon approval</li>
                        <li>Automatic tier upgrade</li>
                    </ul>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
       <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Identity Verification</h1>
          <p className="text-slate-500">Upgrade your account tier to unlock higher limits and remove restrictions.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                        <Fingerprint className="mr-2 text-green-600"/> Submit Government ID
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {user.kycStatus === 'REJECTED' && (
                             <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center">
                                <AlertCircle className="flex-shrink-0 mr-2" size={16} />
                                Your previous application was rejected. Please ensure details match your bank records and try again.
                            </div>
                        )}

                        <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-100 flex items-start">
                            <AlertCircle className="flex-shrink-0 mr-2 mt-0.5" size={16} />
                            <p>
                                Fiscana is required by CBN regulations to verify the identity of all users performing high-volume transactions. 
                                Your data is encrypted and securely transmitted to NIBSS for verification.
                            </p>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center">
                                <AlertCircle className="flex-shrink-0 mr-2" size={16} />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Bank Verification Number (BVN)</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    maxLength={11}
                                    value={bvn}
                                    onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono tracking-widest"
                                    placeholder="22233344455"
                                />
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Dial *565*0# to check your BVN.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">National Identity Number (NIN)</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    maxLength={11}
                                    value={nin}
                                    onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono tracking-widest"
                                    placeholder="11122233344"
                                />
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Found on your NIMC slip.</p>
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={isSubmitting || bvn.length !== 11 || nin.length !== 11}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>Transmitting Data...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={20} />
                                        <span>Submit for Verification</span>
                                    </>
                                )}
                            </button>
                            <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center">
                                <Lock size={12} className="mr-1"/> 256-bit SSL Encrypted Verification
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Benefits Section */}
            <div className="lg:col-span-1 space-y-6">
                {/* Current Tier */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Current Level</span>
                        <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded">TIER 1</span>
                    </div>
                    <ul className="space-y-3">
                         <li className="flex items-center text-sm text-slate-600">
                            <CheckCircle size={16} className="text-slate-400 mr-2" />
                            <span>Invoicing & Basic Ledger</span>
                        </li>
                        <li className="flex items-center text-sm text-slate-600">
                            <CheckCircle size={16} className="text-slate-400 mr-2" />
                            <span>Limit: ₦50,000 / transaction</span>
                        </li>
                         <li className="flex items-center text-sm text-slate-600">
                            <CheckCircle size={16} className="text-slate-400 mr-2" />
                            <span>Standard Tax Report</span>
                        </li>
                    </ul>
                </div>

                {/* Target Tier */}
                <div className="bg-green-600 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ShieldCheck size={120} />
                    </div>
                     <div className="flex items-center justify-between mb-4 relative z-10">
                        <span className="text-xs font-bold text-green-200 uppercase tracking-wide">Upgrading To</span>
                        <span className="bg-white text-green-700 text-xs font-bold px-2 py-1 rounded">TIER 3</span>
                    </div>
                    <ul className="space-y-4 relative z-10">
                         <li className="flex items-start text-sm font-medium">
                            <CheckCircle size={18} className="text-green-300 mr-3 mt-0.5 flex-shrink-0" />
                            <span>High Volume Limit: ₦50M / day</span>
                        </li>
                        <li className="flex items-start text-sm font-medium">
                            <CheckCircle size={18} className="text-green-300 mr-3 mt-0.5 flex-shrink-0" />
                            <span>Access to Multi-currency Wallets</span>
                        </li>
                         <li className="flex items-start text-sm font-medium">
                            <CheckCircle size={18} className="text-green-300 mr-3 mt-0.5 flex-shrink-0" />
                            <span>Priority Support</span>
                        </li>
                         <li className="flex items-start text-sm font-medium">
                            <CheckCircle size={18} className="text-green-300 mr-3 mt-0.5 flex-shrink-0" />
                            <span>Advanced Tax AI Analysis</span>
                        </li>
                    </ul>
                </div>
            </div>
       </div>
    </div>
  );
};

export default KYCVerification;