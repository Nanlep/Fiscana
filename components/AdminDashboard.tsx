import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Activity, Server, AlertTriangle, LogOut, Search, Building2, User, Trash2, Ban, CheckCircle, RefreshCw, Terminal, DollarSign, ShieldCheck, TrendingUp, Save, Loader2 } from 'lucide-react';
import { UserProfile, KYCRequest } from '../types';
import { adminApi, AdminUser, PlatformStats, HealthStatus } from '../services/apiClient';

interface AdminDashboardProps {
    onLogout: () => void;
    adminProfile: UserProfile;
    kycRequests: KYCRequest[];
    onReviewKYC: (id: string, action: 'APPROVED' | 'REJECTED') => void;
    exchangeRate: number;
    onUpdateExchangeRate: (rate: number) => void;
}

type AdminView = 'OVERVIEW' | 'USERS' | 'HEALTH' | 'KYC';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, adminProfile, kycRequests, onReviewKYC, exchangeRate, onUpdateExchangeRate }) => {
    const [currentView, setCurrentView] = useState<AdminView>('OVERVIEW');

    // User Management State — fetched from API
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [userTotal, setUserTotal] = useState(0);

    // Stats State — fetched from API
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Revenue Settings State — fetched from API
    const [commissionRate, setCommissionRate] = useState<number>(1.5);
    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');

    // Exchange Rate State
    const [tempExchangeRate, setTempExchangeRate] = useState<string>(exchangeRate.toString());
    const [rateSaveStatus, setRateSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');

    // Health State — fetched from API
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);

    const logsEndRef = useRef<HTMLDivElement>(null);

    // ---------- DATA FETCHING ----------

    const fetchUsers = useCallback(async (search?: string) => {
        setUsersLoading(true);
        try {
            const res = await adminApi.listUsers({ search, limit: 100 });
            if (res.success && res.data) {
                setUsers(res.data.users);
                setUserTotal(res.data.total);
            }
        } catch (err) { console.error('Failed to fetch users', err); }
        finally { setUsersLoading(false); }
    }, []);

    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const res = await adminApi.getStats();
            if (res.success && res.data) setStats(res.data);
        } catch (err) { console.error('Failed to fetch stats', err); }
        finally { setStatsLoading(false); }
    }, []);

    const fetchConfig = useCallback(async () => {
        try {
            const res = await adminApi.getConfig();
            if (res.success && res.data) {
                setCommissionRate(res.data.commissionRate);
                setTempExchangeRate(res.data.exchangeRate.toString());
                onUpdateExchangeRate(res.data.exchangeRate);
            }
        } catch (err) { console.error('Failed to fetch config', err); }
    }, [onUpdateExchangeRate]);

    const fetchHealth = useCallback(async () => {
        setHealthLoading(true);
        try {
            const res = await adminApi.getHealth();
            if (res.success && res.data) setHealth(res.data);
        } catch (err) { console.error('Failed to fetch health', err); }
        finally { setHealthLoading(false); }
    }, []);

    // Initial data load
    useEffect(() => {
        fetchStats();
        fetchConfig();
        fetchUsers();
    }, [fetchStats, fetchConfig, fetchUsers]);

    // Auto-refresh stats every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    // Fetch health when health tab is active
    useEffect(() => {
        if (currentView === 'HEALTH') {
            fetchHealth();
            const interval = setInterval(fetchHealth, 15000);
            return () => clearInterval(interval);
        }
    }, [currentView, fetchHealth]);

    // Sync exchange rate prop
    useEffect(() => {
        setTempExchangeRate(exchangeRate.toString());
    }, [exchangeRate]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(searchQuery || undefined);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, fetchUsers]);

    // ---------- HANDLERS ----------

    const handleSaveRate = async () => {
        setSaveStatus('SAVING');
        try {
            await adminApi.updateConfig({ commissionRate });
            setSaveStatus('SAVED');
            setTimeout(() => setSaveStatus('IDLE'), 2000);
        } catch { setSaveStatus('IDLE'); }
    };

    const handleSaveExchangeRate = async () => {
        const newRate = parseFloat(tempExchangeRate);
        if (!isNaN(newRate) && newRate > 0) {
            setRateSaveStatus('SAVING');
            try {
                await adminApi.updateConfig({ exchangeRate: newRate });
                onUpdateExchangeRate(newRate);
                setRateSaveStatus('SAVED');
                setTimeout(() => setRateSaveStatus('IDLE'), 2000);
            } catch { setRateSaveStatus('IDLE'); }
        }
    };

    const handleStatusChange = async (id: string, newStatus: 'ACTIVE' | 'SUSPENDED') => {
        try {
            const res = await adminApi.updateUserStatus(id, newStatus);
            if (res.success) {
                setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
                fetchStats(); // Refresh stats
            }
        } catch (err) { console.error('Failed to update user status', err); }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            const res = await adminApi.deleteUser(id);
            if (res.success) {
                setUsers(prev => prev.filter(u => u.id !== id));
                setUserTotal(prev => prev - 1);
                fetchStats(); // Refresh stats
            }
        } catch (err) { console.error('Failed to delete user', err); }
    };

    const pendingKYC = kycRequests.filter(req => req.status === 'PENDING');

    const formatCurrency = (amount: number): string => {
        if (amount >= 1_000_000_000) return `₦ ${(amount / 1_000_000_000).toFixed(1)}B`;
        if (amount >= 1_000_000) return `₦ ${(amount / 1_000_000).toFixed(1)}M`;
        if (amount >= 1_000) return `₦ ${(amount / 1_000).toFixed(1)}K`;
        return `₦ ${amount.toLocaleString()}`;
    };

    const formatUptime = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    // --- Views ---

    const renderOverview = () => (
        <div className="space-y-8 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setCurrentView('USERS')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Users size={20} />
                        </div>
                        {stats && stats.userGrowth !== 0 && (
                            <span className={`text-xs font-bold px-2 py-1 rounded ${stats.userGrowth > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                {stats.userGrowth > 0 ? '+' : ''}{stats.userGrowth}%
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Total Users</p>
                    <h3 className="text-2xl font-bold text-slate-900">
                        {statsLoading ? <Loader2 size={20} className="animate-spin" /> : (stats?.totalUsers ?? 0).toLocaleString()}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setCurrentView('KYC')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <ShieldCheck size={20} />
                        </div>
                        {pendingKYC.length > 0 && <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded-full">{pendingKYC.length} New</span>}
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Pending KYC</p>
                    <h3 className="text-2xl font-bold text-slate-900">
                        {statsLoading ? <Loader2 size={20} className="animate-spin" /> : (stats?.pendingKYC ?? pendingKYC.length)}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Activity size={20} />
                        </div>
                        {stats && stats.txGrowth !== 0 && (
                            <span className={`text-xs font-bold px-2 py-1 rounded ${stats.txGrowth > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                {stats.txGrowth > 0 ? '+' : ''}{stats.txGrowth}%
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Tx Volume (24h)</p>
                    <h3 className="text-2xl font-bold text-slate-900">
                        {statsLoading ? <Loader2 size={20} className="animate-spin" /> : formatCurrency(stats?.txVolume24h ?? 0)}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Total Transactions</p>
                    <h3 className="text-2xl font-bold text-slate-900">
                        {statsLoading ? <Loader2 size={20} className="animate-spin" /> : (stats?.totalTransactions ?? 0).toLocaleString()}
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Configuration */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                <DollarSign className="mr-2 text-green-600" size={24} /> Revenue Configuration
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Set global transaction markup for invoices.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Platform Commission Markup</label>
                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        value={commissionRate}
                                        onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
                                        step="0.1"
                                        min="0"
                                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg font-bold text-slate-900"
                                    />
                                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold">%</div>
                                </div>
                                <button
                                    onClick={handleSaveRate}
                                    disabled={saveStatus === 'SAVING'}
                                    className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center gap-2 ${saveStatus === 'SAVED' ? 'bg-green-600' : saveStatus === 'SAVING' ? 'bg-slate-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                                >
                                    {saveStatus === 'SAVED' ? <CheckCircle size={20} /> : saveStatus === 'SAVING' ? <Loader2 size={20} className="animate-spin" /> : 'Save Rate'}
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Applied to all settled invoices automatically via Bani Rails.</p>
                        </div>
                    </div>
                </div>

                {/* Exchange Rate Settings */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                <TrendingUp className="mr-2 text-blue-600" size={24} /> Exchange Rate Settings
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Update global conversion rate (USD to NGN).</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Current Rate (1 USD = NGN)</label>
                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold">₦</span>
                                    <input
                                        type="number"
                                        value={tempExchangeRate}
                                        onChange={(e) => setTempExchangeRate(e.target.value)}
                                        step="1"
                                        min="1"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg font-bold text-slate-900"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveExchangeRate}
                                    disabled={rateSaveStatus === 'SAVING'}
                                    className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center gap-2 ${rateSaveStatus === 'SAVED' ? 'bg-green-600' : rateSaveStatus === 'SAVING' ? 'bg-slate-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    {rateSaveStatus === 'SAVED' ? <CheckCircle size={20} /> : rateSaveStatus === 'SAVING' ? <Loader2 size={20} className="animate-spin" /> : <><Save size={18} /> Update</>}
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Updates reporting base currency and asset valuations instantly across the platform.</p>
                        </div>
                    </div>
                </div>

                {/* KYC Preview */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Pending Approvals</h3>
                        <button onClick={() => setCurrentView('KYC')} className="text-sm text-blue-600 hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                        {pendingKYC.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">No pending requests</div>
                        ) : (
                            pendingKYC.slice(0, 3).map((req) => (
                                <div key={req.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-sm text-slate-900">{req.userName}</p>
                                        <p className="text-xs text-slate-500">Submitted: {req.date}</p>
                                    </div>
                                    <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">Pending</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
                    <p className="text-slate-500 text-sm">Manage user access and roles — {userTotal} total users</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {usersLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Loading users...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-slate-500 text-sm">No users found</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-full ${u.type === 'CORPORATE' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {u.type === 'CORPORATE' ? <Building2 size={16} /> : <User size={16} />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{u.name}</p>
                                                <p className="text-xs text-slate-500">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.type === 'CORPORATE' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                                            {u.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        {u.role !== 'ADMIN' && (
                                            <div className="flex justify-end space-x-2">
                                                {u.status === 'ACTIVE' ? (
                                                    <button
                                                        onClick={() => handleStatusChange(u.id, 'SUSPENDED')}
                                                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Suspend User"
                                                    >
                                                        <Ban size={18} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                                                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Activate User"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                        {u.role === 'ADMIN' && (
                                            <span className="text-xs text-slate-400 font-medium">Admin</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    const renderKYC = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">KYC Approvals</h2>
                    <p className="text-slate-500 text-sm">Review identity documents (BVN/NIN) for Tier 3 upgrades.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-600">Pending Requests:</span>
                    <span className="bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full">{pendingKYC.length}</span>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {pendingKYC.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">All Caught Up!</h3>
                        <p className="text-slate-500">No pending verification requests.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                        {pendingKYC.map(req => (
                            <div key={req.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-slate-100 rounded-full text-slate-500">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">{req.userName}</p>
                                            <p className="text-xs text-slate-500">{req.userEmail}</p>
                                        </div>
                                    </div>
                                    <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-1 rounded border border-amber-100">
                                        PENDING
                                    </span>
                                </div>

                                <div className="space-y-3 mb-6 bg-slate-50 p-3 rounded-lg text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">BVN</span>
                                        <span className="font-mono font-medium">{req.bvn}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">NIN</span>
                                        <span className="font-mono font-medium">{req.nin}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Date</span>
                                        <span className="text-slate-700">{req.date}</span>
                                    </div>
                                </div>

                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => onReviewKYC(req.id, 'REJECTED')}
                                        className="flex-1 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => onReviewKYC(req.id, 'APPROVED')}
                                        className="flex-1 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg text-sm font-bold transition-colors shadow-md shadow-green-600/20"
                                    >
                                        Approve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderHealth = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">System Health</h2>
                    <p className="text-slate-500 text-sm">Monitor core services and infrastructure</p>
                </div>
                <button
                    onClick={fetchHealth}
                    disabled={healthLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50"
                >
                    <RefreshCw size={16} className={healthLoading ? 'animate-spin' : ''} />
                    <span>{healthLoading ? 'Refreshing...' : 'Refresh Status'}</span>
                </button>
            </div>

            {healthLoading && !health ? (
                <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Checking system health...</p>
                </div>
            ) : health ? (
                <>
                    {/* Status Indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* API Gateway */}
                        <div className={`bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between relative overflow-hidden ${health.services.api?.status === 'OPERATIONAL' ? 'border-green-100' : 'border-red-100'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Activity size={80} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">API Gateway</p>
                                <h3 className={`text-xl font-bold flex items-center ${health.services.api?.status === 'OPERATIONAL' ? 'text-green-600' : 'text-red-600'}`}>
                                    <span className={`w-2.5 h-2.5 rounded-full mr-2 ${health.services.api?.status === 'OPERATIONAL' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                    {health.services.api?.status === 'OPERATIONAL' ? 'Operational' : 'Down'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-2">
                                    Uptime: {formatUptime(health.uptime)}
                                </p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl">
                                <Server size={24} className="text-green-600" />
                            </div>
                        </div>

                        {/* Database */}
                        <div className={`bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between relative overflow-hidden ${health.services.database?.status === 'OPERATIONAL' ? 'border-green-100' : 'border-red-100'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Building2 size={80} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">PostgreSQL Database</p>
                                <h3 className={`text-xl font-bold flex items-center ${health.services.database?.status === 'OPERATIONAL' ? 'text-green-600' : 'text-red-600'}`}>
                                    <span className={`w-2.5 h-2.5 rounded-full mr-2 ${health.services.database?.status === 'OPERATIONAL' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                    {health.services.database?.status === 'OPERATIONAL' ? 'Connected' : 'Down'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-2">
                                    Latency: {health.services.database?.latency ?? '—'}ms
                                </p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <Building2 size={24} className="text-blue-600" />
                            </div>
                        </div>

                        {/* Overall Status */}
                        <div className={`bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between relative overflow-hidden ${health.overall === 'OPERATIONAL' ? 'border-green-100' : 'border-amber-100'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Activity size={80} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Overall Platform</p>
                                <h3 className={`text-xl font-bold flex items-center ${health.overall === 'OPERATIONAL' ? 'text-green-600' : 'text-amber-600'}`}>
                                    <span className={`w-2.5 h-2.5 rounded-full mr-2 ${health.overall === 'OPERATIONAL' ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span>
                                    {health.overall === 'OPERATIONAL' ? 'All Systems Go' : 'Degraded'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-2">
                                    Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-xl">
                                <Activity size={24} className="text-purple-600" />
                            </div>
                        </div>
                    </div>

                    {/* Service Details Panel */}
                    <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800">
                        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                            <div className="flex items-center space-x-2">
                                <Terminal size={18} className="text-green-400" />
                                <h3 className="text-slate-200 font-mono text-sm font-bold">Service Health Details</h3>
                            </div>
                            <div className="flex space-x-1.5">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                        </div>
                        <div className="p-6 font-mono text-xs md:text-sm text-slate-300 space-y-3">
                            {Object.entries(health.services).map(([name, service], idx) => (
                                <div key={name} className="border-b border-slate-800/50 pb-2 last:border-0 hover:text-white transition-colors">
                                    <span className="text-slate-500 mr-2">{idx + 1}</span>
                                    <span className={service.status === 'OPERATIONAL' ? 'text-green-400' : 'text-red-400'}>
                                        [{service.status}] {name.toUpperCase()}
                                        {service.latency !== undefined && ` — ${service.latency}ms`}
                                        {service.detail && ` — ${service.detail}`}
                                    </span>
                                </div>
                            ))}
                            <div className="border-b border-slate-800/50 pb-2 hover:text-white transition-colors">
                                <span className="text-slate-500 mr-2">{Object.keys(health.services).length + 1}</span>
                                <span className="text-blue-400">
                                    [INFO] Server uptime: {formatUptime(health.uptime)}
                                </span>
                            </div>
                            <div className="hover:text-white transition-colors">
                                <span className="text-slate-500 mr-2">{Object.keys(health.services).length + 2}</span>
                                <span className="text-slate-400">
                                    [INFO] Last health check: {new Date(health.timestamp).toISOString()}
                                </span>
                            </div>
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-100">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Unable to fetch health status. Click Refresh to try again.</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Admin Sidebar */}
            <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 border-r border-slate-800 z-50">
                <div className="p-6 border-b border-slate-800 flex items-center space-x-2">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-white">S</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">Super Admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setCurrentView('OVERVIEW')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'OVERVIEW' ? 'bg-slate-800 text-white border-l-4 border-red-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Activity size={20} />
                        <span className="font-medium">Overview</span>
                    </button>
                    <button
                        onClick={() => setCurrentView('USERS')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'USERS' ? 'bg-slate-800 text-white border-l-4 border-red-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Users size={20} />
                        <span className="font-medium">User Management</span>
                    </button>
                    <button
                        onClick={() => setCurrentView('KYC')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'KYC' ? 'bg-slate-800 text-white border-l-4 border-red-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <ShieldCheck size={20} />
                        <div className="flex justify-between w-full items-center">
                            <span className="font-medium">KYC Approvals</span>
                            {pendingKYC.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingKYC.length}</span>}
                        </div>
                    </button>
                    <button
                        onClick={() => setCurrentView('HEALTH')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'HEALTH' ? 'bg-slate-800 text-white border-l-4 border-red-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Server size={20} />
                        <span className="font-medium">System Health</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="mb-4 px-2">
                        <p className="text-xs text-slate-500 uppercase font-bold">Logged in as</p>
                        <p className="text-sm font-medium text-white">{adminProfile.name}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center space-x-2 text-slate-400 hover:text-red-400 px-2 transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            {currentView === 'OVERVIEW' ? 'System Overview' :
                                currentView === 'USERS' ? 'User Administration' :
                                    currentView === 'KYC' ? 'Verification Queue' : 'System Health'}
                        </h1>
                        <p className="text-slate-500">
                            {currentView === 'OVERVIEW' ? 'Real-time platform monitoring' :
                                currentView === 'USERS' ? 'Manage global user access' :
                                    currentView === 'KYC' ? 'Review identity documents' : 'Infrastructure and logs'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                        <div className={`w-2 h-2 rounded-full ${health?.overall === 'OPERATIONAL' || !health ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></div>
                        <span className="text-sm font-medium text-slate-600">
                            {health ? (health.overall === 'OPERATIONAL' ? 'All Systems Operational' : 'Systems Degraded') : 'Checking...'}
                        </span>
                    </div>
                </header>

                {currentView === 'OVERVIEW' && renderOverview()}
                {currentView === 'USERS' && renderUsers()}
                {currentView === 'KYC' && renderKYC()}
                {currentView === 'HEALTH' && renderHealth()}

            </main>
        </div>
    );
};

export default AdminDashboard;