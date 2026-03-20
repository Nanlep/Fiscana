import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { billingApi } from '../services/apiClient';
import { Crown, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface SubscriptionGateProps {
    children: React.ReactNode;
    onNavigateBilling: () => void;
}

const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children, onNavigateBilling }) => {
    const { user, refreshUser } = useAuth();
    const [checking, setChecking] = useState(true);
    const [isActive, setIsActive] = useState(true);
    const [reason, setReason] = useState<string>('');
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
    const [showTrialBanner, setShowTrialBanner] = useState(false);

    useEffect(() => {
        const checkSubscription = async () => {
            if (!user) { setChecking(false); return; }

            // Admin and sandbox always pass
            if (user.role === 'ADMIN' || user.subscriptionTier === 'SANDBOX') {
                setIsActive(true);
                setChecking(false);
                return;
            }

            try {
                const res = await billingApi.getStatus();
                if (res.success && res.data) {
                    setIsActive(res.data.active);
                    setReason(res.data.reason || '');
                    setDaysRemaining(res.data.daysRemaining);

                    // Show trial banner if on trial
                    if (res.data.tier === 'TRIAL' && res.data.active) {
                        setShowTrialBanner(true);
                    }
                }
            } catch {
                // If billing check fails, allow access (fail open)
                setIsActive(true);
            }
            setChecking(false);
        };

        checkSubscription();
    }, [user]);


    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
        );
    }

    // Active subscription — show content with optional trial banner
    if (isActive) {
        return (
            <>
                {showTrialBanner && daysRemaining !== null && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center space-x-2 z-50">
                        <Clock size={16} />
                        <span>
                            {daysRemaining <= 0 ? 'Your free trial ends today!' :
                                `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left in your free trial`}
                        </span>
                        <button
                            onClick={onNavigateBilling}
                            className="ml-2 bg-white text-orange-600 font-bold px-3 py-1 rounded-lg text-xs hover:bg-orange-50 transition-colors"
                        >
                            Subscribe Now
                        </button>
                    </div>
                )}
                {children}
            </>
        );
    }

    // Expired — show paywall
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="max-w-lg w-full text-center">
                <div className="mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/20">
                        <Crown size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">
                        {reason === 'TRIAL_EXPIRED' ? 'Your Free Trial Has Ended' :
                            reason === 'PAYMENT_OVERDUE' ? 'Payment Overdue' :
                                'Subscription Required'}
                    </h1>
                    <p className="text-slate-400 text-lg">
                        {reason === 'TRIAL_EXPIRED'
                            ? 'Subscribe to continue using Fiscana and unlock all features.'
                            : reason === 'PAYMENT_OVERDUE'
                                ? 'Your payment is overdue. Please renew to restore access.'
                                : 'Subscribe to access your Fiscana dashboard and all features.'}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                        <p className="text-slate-400 text-sm font-medium mb-1">Monthly</p>
                        <p className="text-3xl font-bold text-white">₦2,500</p>
                        <p className="text-slate-500 text-xs">/month</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 relative">
                        <span className="absolute -top-2.5 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">SAVE 17%</span>
                        <p className="text-green-400 text-sm font-medium mb-1">Annual</p>
                        <p className="text-3xl font-bold text-white">₦24,900</p>
                        <p className="text-slate-500 text-xs">/year</p>
                    </div>
                </div>

                <button
                    onClick={onNavigateBilling}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl text-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/20"
                >
                    Choose a Plan →
                </button>

                <p className="text-slate-600 text-xs mt-4">
                    Your data is safe and will be available once you subscribe.
                </p>
            </div>
        </div>
    );
};

export default SubscriptionGate;
