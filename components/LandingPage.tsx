import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle, Shield, Globe, Mail, Loader2 } from 'lucide-react';
import { UserType } from '../types';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/apiClient';

interface LandingPageProps {
    onLoginSuccess: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
    const { login, signup } = useAuth();
    const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD'>('LOGIN');
    const [resetSent, setResetSent] = useState(false);
    const [userType, setUserType] = useState<UserType>('INDIVIDUAL');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (authMode === 'LOGIN') {
                // Use AuthContext login which properly sets user state
                const success = await login(email, password);
                if (success) {
                    onLoginSuccess();
                } else {
                    setError('Login failed. Please check your credentials.');
                }
            } else if (authMode === 'SIGNUP') {
                // Use AuthContext signup which properly sets user state
                const success = await signup({
                    email,
                    password,
                    name: fullName,
                    type: userType,
                    companyName: userType === 'CORPORATE' ? companyName : undefined
                });
                if (success) {
                    onLoginSuccess();
                } else {
                    setError('Signup failed. Please try again.');
                }
            } else if (authMode === 'FORGOT_PASSWORD') {
                const response = await authApi.requestPasswordReset(email);
                if (response.success) {
                    setResetSent(true);
                } else {
                    setError(response.error || 'Failed to send reset email.');
                }
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetNavigation = () => {
        setAuthMode('LOGIN');
        setResetSent(false);
        setError(null);
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
            {/* Navigation */}
            <nav className="flex items-center justify-between px-8 py-6 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-white">F</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">Fiscana</span>
                </div>

                {authMode !== 'LOGIN' && (
                    <button
                        onClick={() => { setAuthMode('LOGIN'); setError(null); document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' }); }}
                        className="text-sm font-semibold text-green-600 hover:text-green-700"
                    >
                        Log In
                    </button>
                )}
            </nav>

            <div className="flex flex-col lg:flex-row">
                {/* Left Side: Hero Content */}
                <div className="lg:w-1/2 px-8 lg:px-20 py-20 flex flex-col justify-center">
                    <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold mb-6 w-fit">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span>Ready for Your Tax Reforms</span>
                    </div>
                    <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
                        The Financial OS for <span className="text-green-600">Global Players</span> in Nigeria.
                    </h1>
                    <p className="text-lg text-slate-500 mb-8 max-w-lg">
                        Manage invoices, multi-currency wallets, and tax compliance in one platform. Built for freelancers, remote workers, and modern businesses.
                    </p>

                    <div className="flex space-x-4 mb-12">
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="text-green-500" size={20} />
                            <span className="font-medium text-slate-700">Multi-currency Invoicing</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="text-green-500" size={20} />
                            <span className="font-medium text-slate-700">Crypto & Fiat Rails</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <Shield className="text-blue-600 mb-2" />
                            <h3 className="font-bold">Tax Compliant</h3>
                            <p className="text-sm text-slate-500">Auto-calculate VAT & Income Tax based on 2026 reforms.</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <Globe className="text-purple-600 mb-2" />
                            <h3 className="font-bold">Play Globally</h3>
                            <p className="text-sm text-slate-500">Receive USD, GBP, USDC and settle in NGN instantly.</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Auth Form */}
                <div id="auth" className="lg:w-1/2 bg-slate-50 px-8 lg:px-20 py-20 flex flex-col justify-center border-l border-slate-200">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-auto border border-slate-100 transition-all duration-300">

                        {/* Error Alert */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-red-600 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* --- FORGOT PASSWORD VIEW --- */}
                        {authMode === 'FORGOT_PASSWORD' ? (
                            <div className="animate-in fade-in slide-in-from-right duration-300">
                                {resetSent ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Mail size={32} />
                                        </div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
                                        <p className="text-slate-500 mb-8">
                                            We've sent a password reset link to <span className="font-semibold text-slate-900">{email}</span>.
                                        </p>
                                        <button
                                            onClick={handleResetNavigation}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2"
                                        >
                                            <ArrowLeft size={18} />
                                            <span>Back to Log In</span>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-8">
                                            <button
                                                onClick={() => { setAuthMode('LOGIN'); setError(null); }}
                                                className="text-slate-400 hover:text-slate-600 flex items-center space-x-1 mb-6 text-sm"
                                            >
                                                <ArrowLeft size={16} /> <span>Back</span>
                                            </button>
                                            <h2 className="text-2xl font-bold text-slate-900">Reset Password</h2>
                                            <p className="text-slate-500 text-sm mt-2">
                                                Enter the email associated with your account and we'll send you a link to reset your password.
                                            </p>
                                        </div>
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                                <input
                                                    type="email"
                                                    required
                                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                                    placeholder="you@example.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="animate-spin" size={18} />
                                                ) : (
                                                    <>
                                                        <span>Send Reset Link</span>
                                                        <ArrowRight size={18} />
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </>
                                )}
                            </div>
                        ) : (
                            /* --- LOGIN / SIGNUP VIEW --- */
                            <>
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-bold text-slate-900">
                                        {authMode === 'LOGIN' ? 'Welcome Back' : 'Create your account'}
                                    </h2>
                                    <p className="text-slate-500 text-sm mt-2">
                                        {authMode === 'LOGIN' ? 'Access your dashboard' : 'Start your financial freedom journey'}
                                    </p>
                                </div>

                                {authMode === 'SIGNUP' && (
                                    <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                                        <button
                                            onClick={() => setUserType('INDIVIDUAL')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${userType === 'INDIVIDUAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Individual
                                        </button>
                                        <button
                                            onClick={() => setUserType('CORPORATE')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${userType === 'CORPORATE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Corporate
                                        </button>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {authMode === 'SIGNUP' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                                    placeholder="John Doe"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                />
                                            </div>
                                            {userType === 'CORPORATE' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                                        placeholder="Acme Ltd"
                                                        value={companyName}
                                                        onChange={(e) => setCompanyName(e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-medium text-slate-700">Password</label>
                                            {authMode === 'LOGIN' && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setAuthMode('FORGOT_PASSWORD'); setError(null); }}
                                                    className="text-xs font-semibold text-green-600 hover:text-green-700"
                                                >
                                                    Forgot Password?
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            minLength={8}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        {authMode === 'SIGNUP' && (
                                            <p className="text-xs text-slate-400 mt-1">Min 8 chars with uppercase, lowercase, and number</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="animate-spin" size={18} />
                                        ) : (
                                            <>
                                                <span>{authMode === 'LOGIN' ? 'Log In' : 'Create Account'}</span>
                                                <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-8 text-center">
                                    <p className="text-slate-500 text-sm">
                                        {authMode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"}
                                        <button
                                            onClick={() => {
                                                setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN');
                                                setFullName('');
                                                setCompanyName('');
                                                setError(null);
                                            }}
                                            className="font-bold text-green-600 hover:text-green-700 ml-1"
                                        >
                                            {authMode === 'LOGIN' ? 'Sign up' : 'Log in'}
                                        </button>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;