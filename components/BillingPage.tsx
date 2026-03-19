import React, { useState, useEffect } from 'react';
import { billingApi } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { Crown, Check, Loader2, ArrowLeft, Zap, Shield, TrendingUp } from 'lucide-react';

interface BillingPageProps {
    onBack: () => void;
}

const BillingPage: React.FC<BillingPageProps> = ({ onBack }) => {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);
    const [billingStatus, setBillingStatus] = useState<any>(null);
    const [statusLoading, setStatusLoading] = useState(true);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        setStatusLoading(true);
        try {
            const res = await billingApi.getStatus();
            if (res.success && res.data) {
                setBillingStatus(res.data);
            }
        } catch { }
        setStatusLoading(false);
    };

    const handleSubscribe = async (plan: 'MONTHLY' | 'ANNUAL') => {
        setLoading(plan);
        try {
            const res = await billingApi.initialize(plan);
            if (res.success && res.data?.paymentUrl) {
                window.location.href = res.data.paymentUrl;
            } else {
                alert(res.error || 'Failed to initialize payment. Please try again.');
            }
        } catch {
            alert('Something went wrong. Please try again.');
        }
        setLoading(null);
    };

    const isCurrentPlan = (plan: string) => {
        return billingStatus?.tier === plan && billingStatus?.active;
    };

    const features = [
        { icon: TrendingUp, text: 'Full Financial Dashboard' },
        { icon: Shield, text: 'AI-Powered Financial Advisor' },
        { icon: Zap, text: 'Unlimited Invoices & Transactions' },
        { icon: Crown, text: 'Credit Score & Health Analysis' },
    ];

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center space-x-2 text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Back to Dashboard</span>
                </button>
            </div>

            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
                    <Crown size={32} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Choose Your Plan</h1>
                <p className="text-slate-500 text-lg">Unlock the full power of Fiscana for your business</p>
            </div>

            {/* Current Status */}
            {statusLoading ? (
                <div className="text-center mb-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600 mx-auto" />
                </div>
            ) : billingStatus && (
                <div className={`rounded-xl p-4 mb-8 text-center text-sm font-medium ${billingStatus.active
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                    {billingStatus.tier === 'TRIAL' && billingStatus.active
                        ? `You're on a free trial — ${billingStatus.daysRemaining} day${billingStatus.daysRemaining === 1 ? '' : 's'} remaining`
                        : billingStatus.tier === 'SANDBOX'
                            ? 'You have a Sandbox account — unlimited access'
                            : billingStatus.active
                                ? `Active ${billingStatus.tier} plan — expires ${new Date(billingStatus.subscriptionEndsAt).toLocaleDateString()}`
                                : 'Your subscription has expired — choose a plan to continue'}
                </div>
            )}

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* Monthly */}
                <div className={`bg-white rounded-2xl border-2 p-8 transition-all ${isCurrentPlan('MONTHLY')
                    ? 'border-green-500 shadow-lg shadow-green-500/10'
                    : 'border-slate-200 hover:border-slate-300'
                    }`}>
                    <div className="mb-6">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly</p>
                        <div className="flex items-baseline">
                            <span className="text-4xl font-bold text-slate-900">₦2,500</span>
                            <span className="text-slate-500 ml-1">/month</span>
                        </div>
                    </div>

                    <ul className="space-y-3 mb-8">
                        {features.map((f, i) => (
                            <li key={i} className="flex items-center space-x-3 text-sm text-slate-700">
                                <Check size={16} className="text-green-500 flex-shrink-0" />
                                <span>{f.text}</span>
                            </li>
                        ))}
                    </ul>

                    {isCurrentPlan('MONTHLY') ? (
                        <div className="w-full bg-green-100 text-green-800 font-bold py-3 rounded-xl text-center text-sm">
                            ✓ Current Plan
                        </div>
                    ) : (
                        <button
                            onClick={() => handleSubscribe('MONTHLY')}
                            disabled={!!loading}
                            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                            {loading === 'MONTHLY' ? (
                                <><Loader2 size={18} className="animate-spin" /> <span>Processing...</span></>
                            ) : (
                                <span>Subscribe Monthly</span>
                            )}
                        </button>
                    )}
                </div>

                {/* Annual */}
                <div className={`bg-white rounded-2xl border-2 p-8 relative transition-all ${isCurrentPlan('ANNUAL')
                    ? 'border-green-500 shadow-lg shadow-green-500/10'
                    : 'border-green-400 shadow-lg shadow-green-500/5 hover:shadow-green-500/15'
                    }`}>
                    <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                        BEST VALUE — SAVE 17%
                    </span>

                    <div className="mb-6">
                        <p className="text-sm font-bold text-green-600 uppercase tracking-wider mb-2">Annual</p>
                        <div className="flex items-baseline">
                            <span className="text-4xl font-bold text-slate-900">₦24,900</span>
                            <span className="text-slate-500 ml-1">/year</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">That's ₦2,075/month</p>
                    </div>

                    <ul className="space-y-3 mb-8">
                        {features.map((f, i) => (
                            <li key={i} className="flex items-center space-x-3 text-sm text-slate-700">
                                <Check size={16} className="text-green-500 flex-shrink-0" />
                                <span>{f.text}</span>
                            </li>
                        ))}
                    </ul>

                    {isCurrentPlan('ANNUAL') ? (
                        <div className="w-full bg-green-100 text-green-800 font-bold py-3 rounded-xl text-center text-sm">
                            ✓ Current Plan
                        </div>
                    ) : (
                        <button
                            onClick={() => handleSubscribe('ANNUAL')}
                            disabled={!!loading}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                            {loading === 'ANNUAL' ? (
                                <><Loader2 size={18} className="animate-spin" /> <span>Processing...</span></>
                            ) : (
                                <span>Subscribe Annually</span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* FAQ */}
            <div className="bg-slate-50 rounded-2xl p-6 text-center">
                <p className="text-sm text-slate-500">
                    Payment is processed securely via Flutterwave. Your data remains safe even if your subscription expires.
                    Need help? Contact <a href="mailto:contactmike@fiscana.pro" className="text-green-600 hover:underline">contactmike@fiscana.pro</a>
                </p>
            </div>
        </div>
    );
};

export default BillingPage;
