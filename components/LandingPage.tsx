import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Shield, Zap, Globe, Lock } from 'lucide-react';
import { UserRole, UserType } from '../types';

interface LandingPageProps {
  onLogin: (name: string, role: UserRole, type: UserType, companyName?: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [userType, setUserType] = useState<UserType>('INDIVIDUAL');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock Authentication Logic
    if (authMode === 'LOGIN') {
        if (email.toLowerCase().includes('admin')) {
            onLogin('Super Admin', 'ADMIN', 'INDIVIDUAL');
        } else {
            // Simulate user login
            onLogin(fullName || 'Taiwo Doe', 'USER', userType, companyName);
        }
    } else {
        // Simulate Signup
        onLogin(fullName, 'USER', userType, companyName);
    }
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
        
        <button 
            onClick={() => { setAuthMode('LOGIN'); document.getElementById('auth')?.scrollIntoView({behavior: 'smooth'}); }}
            className="text-sm font-semibold text-green-600 hover:text-green-700"
        >
            Log In
        </button>
      </nav>

      <div className="flex flex-col lg:flex-row">
        {/* Left Side: Hero Content */}
        <div className="lg:w-1/2 px-8 lg:px-20 py-20 flex flex-col justify-center">
            <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold mb-6 w-fit">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>Ready for 2026 Tax Reforms</span>
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
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-auto border border-slate-100">
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
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input 
                            type="password" 
                            required
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center justify-center space-x-2"
                    >
                        <span>{authMode === 'LOGIN' ? 'Sign In' : 'Get Started'}</span>
                        <ArrowRight size={18} />
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    {authMode === 'LOGIN' ? (
                        <p>
                            Don't have an account? {' '}
                            <button onClick={() => setAuthMode('SIGNUP')} className="text-green-600 font-semibold hover:underline">
                                Sign Up
                            </button>
                        </p>
                    ) : (
                        <p>
                            Already have an account? {' '}
                            <button onClick={() => setAuthMode('LOGIN')} className="text-green-600 font-semibold hover:underline">
                                Log In
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;