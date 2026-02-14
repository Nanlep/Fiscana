import React, { useState } from 'react';
import { LayoutDashboard, Receipt, BookOpen, Landmark, BrainCircuit, Wallet, LogOut, User, Building2, X, FileBarChart, ShieldCheck, PiggyBank, Plus } from 'lucide-react';
import { ViewState, UserProfile, WalletBalance } from '../types';

interface SidebarProps {
    currentView: ViewState;
    setView: (view: ViewState) => void;
    onLogout: () => void;
    user: UserProfile;
    onWithdraw: () => void;
    onAddFunds: () => void;
    walletBalances: WalletBalance[];
    isOpen?: boolean; // Mobile open state
    onClose?: () => void; // Mobile close handler
}

const Sidebar: React.FC<SidebarProps> = ({
    currentView,
    setView,
    onLogout,
    user,
    onWithdraw,
    onAddFunds,
    walletBalances,
    isOpen = false,
    onClose
}) => {
    const [showAllBalances, setShowAllBalances] = useState(false);
    const menuItems = [
        { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'INVOICES', label: 'Invoices', icon: Receipt },
        { id: 'LEDGER', label: 'General Ledger', icon: BookOpen },
        { id: 'BUDGETS', label: 'Budgets', icon: PiggyBank },
        { id: 'REPORTS', label: 'Financial Reports', icon: FileBarChart },
        { id: 'ASSETS', label: 'Assets & Liabilities', icon: Landmark },
        { id: 'TAX_AI', label: 'Tax Advisor AI', icon: BrainCircuit },
        { id: 'KYC', label: 'Verification', icon: ShieldCheck },
    ];

    const handleSignOut = () => {
        onLogout();
    };

    const sidebarClasses = `
    w-64 bg-slate-900 text-white h-screen flex flex-col border-r border-slate-800
    fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
    md:translate-x-0 md:static
  `;

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <div className={sidebarClasses}>
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-slate-900">F</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">Fiscana</span>
                    </div>
                    {/* Mobile Close Button */}
                    <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-6 py-4 bg-slate-800/50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-700 rounded-full">
                            {user.type === 'CORPORATE' ? <Building2 size={16} /> : <User size={16} />}
                        </div>
                        <div className="overflow-hidden">
                            <div className="flex items-center space-x-1">
                                <p className="text-sm font-semibold truncate">{user.name}</p>
                                {user.kycStatus === 'VERIFIED' && <ShieldCheck size={12} className="text-green-500" />}
                            </div>
                            <p className="text-xs text-slate-400 truncate">{user.type === 'CORPORATE' ? user.companyName : 'Freelancer'} • {user.tier ? user.tier.replace('_', ' ') : 'Tier 1'}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setView(item.id as ViewState)}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-green-600 text-white shadow-lg shadow-green-900/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="bg-slate-800 rounded-xl p-4 mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <Wallet size={16} className="text-green-400" />
                            <span className="text-xs font-semibold text-slate-300">Wallet Balance</span>
                        </div>
                        {/* Currency balances */}
                        {(() => {
                            const currencySymbols: Record<string, string> = {
                                NGN: '₦', USD: '$', GBP: '£', EUR: '€', KES: 'KSh', GHS: 'GH₵', ZAR: 'R',
                            };
                            // Define the order we always display
                            const allCurrencies = ['NGN', 'USD', 'GBP', 'KES', 'GHS', 'ZAR', 'USDT', 'BTC', 'ETH'];
                            const primaryCount = 3; // Always show first 3

                            // Build display list from walletBalances, filling in zeros for missing ones
                            const balanceMap = new Map(walletBalances.map(b => [b.currency, b]));
                            const fullList = allCurrencies.map(c => balanceMap.get(c) || { currency: c, available: 0, pending: 0 });

                            const displayList = showAllBalances ? fullList : fullList.slice(0, primaryCount);
                            const hasMore = fullList.length > primaryCount;

                            return (
                                <>
                                    <div className={`space-y-1 ${showAllBalances ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
                                        {displayList.map(b => (
                                            <div key={b.currency} className={`flex justify-between items-center py-0.5 ${b.available === 0 ? 'opacity-50' : ''}`}>
                                                <span className="text-xs text-slate-400">{b.currency}</span>
                                                <span className={`text-sm font-bold ${b.available > 0 ? 'text-white' : 'text-slate-500'}`}>
                                                    {currencySymbols[b.currency]
                                                        ? `${currencySymbols[b.currency]} ${b.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                        : `${b.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${b.currency}`
                                                    }
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {hasMore && (
                                        <button
                                            onClick={() => setShowAllBalances(!showAllBalances)}
                                            className="text-xs text-green-400 hover:text-green-300 text-center w-full mt-1 transition-colors"
                                        >
                                            {showAllBalances ? '▲ Show less' : `▼ +${fullList.length - primaryCount} more currencies`}
                                        </button>
                                    )}
                                </>
                            );
                        })()}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <button
                                onClick={onAddFunds}
                                className="py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1"
                            >
                                <Plus size={14} />
                                <span>Add Funds</span>
                            </button>
                            <button
                                onClick={onWithdraw}
                                className="py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1"
                            >
                                <span>Withdraw</span>
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center space-x-2 text-slate-400 hover:text-red-400 px-2 transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;