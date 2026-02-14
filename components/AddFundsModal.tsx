
import React, { useState, useCallback, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, Wallet, Zap } from 'lucide-react';
import { paymentsApi } from '../services/apiClient';

// Declare BaniPopUp on window (loaded from external script)
declare global {
    interface Window {
        BaniPopUp?: (config: {
            amount: string | number;
            phoneNumber: string;
            email: string;
            firstName: string;
            lastName: string;
            merchantKey: string;
            merchantRef?: string;
            metadata?: string | Record<string, any>;
            onClose?: (response: any) => void;
            callback?: (response: any) => void;
        }) => void;
    }
}

interface AddFundsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFundsAdded: () => void;
    userId?: string;
    userEmail?: string;
    userName?: string;
    userPhone?: string;
}

type ModalStep = 'INPUT' | 'SUCCESS';

const BANI_PUBLIC_KEY = import.meta.env.VITE_BANI_PUBLIC_KEY || 'pub_prod_SMWE9AH7SNYJAFN6Z263NNETPP4HZT';

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000];

const AddFundsModal: React.FC<AddFundsModalProps> = ({
    isOpen,
    onClose,
    onFundsAdded,
    userId = '',
    userEmail = '',
    userName = '',
    userPhone = '',
}) => {
    const [step, setStep] = useState<ModalStep>('INPUT');
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState(userPhone || '+234');
    const [error, setError] = useState('');
    const [isLaunching, setIsLaunching] = useState(false);
    const [paymentRef, setPaymentRef] = useState('');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');

    // Sync user details from props whenever modal opens or props change
    useEffect(() => {
        if (isOpen) {
            if (userName) {
                const parts = userName.trim().split(/\s+/);
                setFirstName(parts[0] || '');
                setLastName(parts.slice(1).join(' ') || '');
            }
            if (userEmail) {
                setEmail(userEmail);
            }
            if (userPhone) {
                setPhone(userPhone);
            }
        }
    }, [isOpen, userName, userEmail, userPhone]);

    const launchBaniPop = useCallback(() => {
        const val = parseFloat(amount);
        if (!val || val < 100) {
            setError('Minimum amount is ₦100');
            return;
        }
        if (!phone || phone.length < 10) {
            setError('Please enter a valid phone number');
            return;
        }
        if (!email) {
            setError('Email is required');
            return;
        }
        if (!firstName || !lastName) {
            setError('First and last name are required');
            return;
        }

        if (!window.BaniPopUp) {
            setError('Payment widget is still loading. Please try again in a moment.');
            return;
        }

        setError('');
        setIsLaunching(true);

        const merchantRef = `FISCANA-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        try {
            window.BaniPopUp({
                amount: val,
                phoneNumber: phone,
                email: email,
                firstName: firstName,
                lastName: lastName,
                merchantKey: BANI_PUBLIC_KEY,
                merchantRef: merchantRef,
                metadata: JSON.stringify({
                    source: 'add_funds',
                    userId: userId,
                }),
                onClose: (response: any) => {
                    console.log('[Bani Pop] Widget closed', response);
                    setIsLaunching(false);
                },
                callback: async (response: any) => {
                    console.log('[Bani Pop] Payment complete', response);
                    const ref = response?.reference || merchantRef;
                    setPaymentRef(ref);
                    setIsLaunching(false);

                    // Notify backend to credit wallet immediately
                    try {
                        await paymentsApi.confirmPopupPayment({
                            merchantRef: ref,
                            amount: val,
                            currency: 'NGN',
                        });
                        console.log('[Bani Pop] Wallet credited via backend');
                    } catch (err) {
                        console.error('[Bani Pop] Failed to confirm payment on backend', err);
                    }

                    setStep('SUCCESS');
                },
            });
        } catch (err: any) {
            console.error('[Bani Pop] Failed to launch', err);
            setError('Failed to launch payment widget. Please try again.');
            setIsLaunching(false);
        }
    }, [amount, phone, email, firstName, lastName]);

    const handleDone = () => {
        onFundsAdded();
        reset();
    };

    const reset = () => {
        setStep('INPUT');
        setAmount('');
        setError('');
        setPaymentRef('');
        setIsLaunching(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 m-4 flex flex-col max-h-[90vh]">

                {/* STEP: INPUT */}
                {step === 'INPUT' && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center space-x-2">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Wallet size={20} className="text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">Add Funds</h3>
                            </div>
                            <button onClick={reset} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <p className="text-sm text-slate-500 mb-4">
                            Enter the amount and your details below. You'll be redirected to Bani's secure payment page to complete the payment via bank transfer, crypto, or mobile money.
                        </p>

                        <div className="space-y-4 overflow-y-auto flex-1">
                            {/* Quick Amount Buttons */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-2">Quick Select</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {QUICK_AMOUNTS.map(qa => (
                                        <button
                                            key={qa}
                                            type="button"
                                            onClick={() => { setAmount(String(qa)); setError(''); }}
                                            className={`py-2 px-3 border-2 rounded-xl text-sm font-semibold transition-all ${amount === String(qa)
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-slate-200 text-slate-600 hover:border-green-300 hover:bg-green-50/50'
                                                }`}
                                        >
                                            ₦{qa.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Amount */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (NGN)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₦</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => { setAmount(e.target.value); setError(''); }}
                                        min="100"
                                        className="w-full px-4 py-3 pl-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                        placeholder="Enter amount (min ₦100)"
                                    />
                                </div>
                            </div>

                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="you@example.com"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="+2348012345678"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Launch Button */}
                            <button
                                onClick={launchBaniPop}
                                disabled={isLaunching || !amount}
                                className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
                            >
                                {isLaunching ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <Zap size={18} />
                                        <span>Pay ₦{amount ? parseFloat(amount).toLocaleString() : '0'}</span>
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-slate-400 text-center">
                                Secured by Bani · Bank Transfer · Crypto · Mobile Money
                            </p>
                        </div>
                    </>
                )}

                {/* STEP: SUCCESS */}
                {step === 'SUCCESS' && (
                    <div className="flex flex-col items-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="text-green-600" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Payment Complete!</h3>
                        <p className="text-sm text-slate-500 text-center mb-2">
                            Your payment has been processed successfully.
                        </p>
                        {paymentRef && (
                            <p className="text-xs text-slate-400 text-center mb-6 font-mono">
                                Ref: {paymentRef}
                            </p>
                        )}
                        <button
                            onClick={handleDone}
                            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
                        >
                            Done
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AddFundsModal;
