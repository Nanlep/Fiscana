import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Activity, Server, AlertTriangle, LogOut, Search, Building2, User, Trash2, Ban, CheckCircle, RefreshCw, Terminal, DollarSign, ShieldCheck, TrendingUp, Save, Loader2, Banknote, Clock, ChevronDown, ChevronUp, MessageSquare, Send, HelpCircle, Mail, Inbox, XCircle, RotateCw } from 'lucide-react';
import { UserProfile, KYCRequest, SMEApplicationStatus } from '../types';
import { adminApi, AdminUser, PlatformStats, HealthStatus, smeFinanceApi, supportApi, SupportTicket, TicketMessageType } from '../services/apiClient';

interface AdminDashboardProps {
    onLogout: () => void;
    adminProfile: UserProfile;
    kycRequests: KYCRequest[];
    onReviewKYC: (id: string, action: 'APPROVED' | 'REJECTED') => void;
    exchangeRate: number;
    onUpdateExchangeRate: (rate: number) => void;
}

type AdminView = 'OVERVIEW' | 'USERS' | 'HEALTH' | 'KYC' | 'SME' | 'SUPPORT' | 'BROADCAST' | 'EMAIL_QUEUE';

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

    // SME State
    const [smeApplications, setSmeApplications] = useState<any[]>([]);
    const [smeLoading, setSmeLoading] = useState(false);
    const [smeStats, setSmeStats] = useState<{ total: number; pending: number; approved: number; declined: number } | null>(null);

    // Support Tickets State
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [supportLoading, setSupportLoading] = useState(false);
    const [supportTotal, setSupportTotal] = useState(0);
    const [expandedAdminTicket, setExpandedAdminTicket] = useState<string | null>(null);
    const [expandedApp, setExpandedApp] = useState<string | null>(null);
    const [adminReplyText, setAdminReplyText] = useState<Record<string, string>>({});
    const [adminReplying, setAdminReplying] = useState<string | null>(null);

    const logsEndRef = useRef<HTMLDivElement>(null);

    // Broadcast Email State
    type BroadcastTargetGroup = 'ALL' | 'PAID_ALL' | 'PAID_MONTHLY' | 'PAID_ANNUAL' | 'UNPAID_ALL' | 'UNPAID_TRIAL' | 'UNPAID_SANDBOX' | 'SINGLE' | 'SELECTED';
    const [broadcastSubject, setBroadcastSubject] = useState('');
    const [broadcastBody, setBroadcastBody] = useState('');
    const [broadcastStatus, setBroadcastStatus] = useState<'IDLE' | 'SENDING' | 'SENT' | 'ERROR'>('IDLE');
    const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number; total: number; targetGroup?: string } | null>(null);
    const [broadcastTargetGroup, setBroadcastTargetGroup] = useState<BroadcastTargetGroup>('ALL');
    const [broadcastTargetEmail, setBroadcastTargetEmail] = useState('');
    const [broadcastSelectedUsers, setBroadcastSelectedUsers] = useState<string[]>([]);
    const [broadcastUserSearch, setBroadcastUserSearch] = useState('');

    // Email Queue State
    type EmailQueueItem = { id: string; userId: string; emailType: string; status: string; scheduledFor: string; sentAt: string | null; attempts: number; error: string | null; createdAt: string };
    const [emailQueue, setEmailQueue] = useState<EmailQueueItem[]>([]);
    const [emailQueueLoading, setEmailQueueLoading] = useState(false);
    const [emailQueueFilter, setEmailQueueFilter] = useState<string>('ALL');
    const [emailQueueSummary, setEmailQueueSummary] = useState<{ pending: number; sent: number; failed: number; cancelled: number }>({ pending: 0, sent: 0, failed: 0, cancelled: 0 });

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

    const fetchSmeApplications = useCallback(async () => {
        setSmeLoading(true);
        try {
            const [appsRes, statsRes] = await Promise.all([
                smeFinanceApi.listAll({ limit: 100 }),
                smeFinanceApi.listAll({ status: 'PENDING' }),
            ]);
            if (appsRes.success && appsRes.data) {
                setSmeApplications(appsRes.data.applications);
                // Compute stats from the full list
                const apps = appsRes.data.applications;
                setSmeStats({
                    total: appsRes.data.total,
                    pending: apps.filter((a: any) => a.status === 'PENDING').length,
                    approved: apps.filter((a: any) => a.status === 'APPROVED').length,
                    declined: apps.filter((a: any) => a.status === 'DECLINED').length,
                });
            }
        } catch (err) { console.error('Failed to fetch SME apps', err); }
        finally { setSmeLoading(false); }
    }, []);

    const fetchSupportTickets = useCallback(async () => {
        setSupportLoading(true);
        try {
            const res = await supportApi.adminListTickets({ limit: 100 });
            if (res.success && res.data) {
                setSupportTickets(res.data.tickets);
                setSupportTotal(res.data.total);
            }
        } catch (err) { console.error('Failed to fetch support tickets', err); }
        finally { setSupportLoading(false); }
    }, []);

    // Initial data load
    useEffect(() => {
        fetchStats();
        fetchConfig();
        fetchUsers();
        fetchSmeApplications();
        fetchSupportTickets();
    }, [fetchStats, fetchConfig, fetchUsers, fetchSmeApplications, fetchSupportTickets]);

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

    // Fetch SME when SME tab is active
    useEffect(() => {
        if (currentView === 'SME') {
            fetchSmeApplications();
        }
    }, [currentView, fetchSmeApplications]);

    // Fetch support tickets when support tab is active
    useEffect(() => {
        if (currentView === 'SUPPORT') {
            fetchSupportTickets();
        }
    }, [currentView, fetchSupportTickets]);

    // Fetch email queue
    const fetchEmailQueue = useCallback(async () => {
        setEmailQueueLoading(true);
        try {
            const statusParam = emailQueueFilter === 'ALL' ? undefined : emailQueueFilter;
            const res = await adminApi.getEmailQueue({ status: statusParam, limit: 50 });
            if (res.success && res.data) {
                setEmailQueue(res.data.emails);
                setEmailQueueSummary(res.data.summary);
            }
        } catch (e) {
            console.error('Failed to fetch email queue:', e);
        } finally {
            setEmailQueueLoading(false);
        }
    }, [emailQueueFilter]);

    useEffect(() => {
        if (currentView === 'EMAIL_QUEUE') {
            fetchEmailQueue();
        }
    }, [currentView, fetchEmailQueue]);

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
        const targetUser = users.find(u => u.id === id);
        const displayName = targetUser ? `${targetUser.name} (${targetUser.email})` : 'this user';
        if (!confirm(`Are you sure you want to permanently delete ${displayName}?\n\nThis will remove the user's account and ALL their data including:\n• Transactions & Ledger entries\n• Invoices & Payments\n• Assets & Liabilities\n• Budgets\n• KYC documents\n• Wallet & Balances\n• SME Finance applications\n\nThis action CANNOT be undone.`)) return;
        try {
            const res = await adminApi.deleteUser(id);
            if (res.success) {
                setUsers(prev => prev.filter(u => u.id !== id));
                setUserTotal(prev => prev - 1);
                fetchStats(); // Refresh stats
            }
        } catch (err) { console.error('Failed to delete user', err); }
    };

    const handleSandboxToggle = async (id: string, currentTier?: string) => {
        const newTier = currentTier === 'SANDBOX' ? 'TRIAL' : 'SANDBOX';
        const action = newTier === 'SANDBOX' ? 'grant sandbox access to' : 'remove sandbox access from';
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;
        try {
            const res = await adminApi.toggleSandbox(id, newTier as 'SANDBOX' | 'TRIAL');
            if (res.success) {
                setUsers(prev => prev.map(u => u.id === id ? { ...u, subscriptionTier: newTier } : u));
            }
        } catch (err) { console.error('Failed to toggle sandbox', err); }
    };

    const handleSmeStatusChange = async (id: string, newStatus: SMEApplicationStatus, adminNote?: string) => {
        try {
            const res = await smeFinanceApi.updateStatus(id, newStatus, adminNote);
            if (res.success) {
                setSmeApplications(prev => prev.map(a => a.id === id ? { ...a, status: newStatus, adminNote: adminNote || a.adminNote } : a));
                if (smeStats) {
                    setSmeStats(prev => prev ? { ...prev, pending: prev.pending + (newStatus === 'PENDING' ? 1 : -1) } : prev);
                }
            }
        } catch (err) { console.error('Failed to update SME status', err); }
    };

    const handleAdminReply = async (ticketId: string) => {
        const text = adminReplyText[ticketId]?.trim();
        if (!text) return;
        setAdminReplying(ticketId);
        try {
            const res = await supportApi.addMessage(ticketId, text);
            if (res.success && res.data) {
                setSupportTickets(prev => prev.map(t =>
                    t.id === ticketId
                        ? { ...t, messages: [...(t.messages || []), res.data!] }
                        : t
                ));
                setAdminReplyText(prev => ({ ...prev, [ticketId]: '' }));
            }
        } catch (err) { console.error('Failed to reply', err); }
        setAdminReplying(null);
    };

    const handleTicketStatusChange = async (ticketId: string, status: string) => {
        try {
            const res = await supportApi.adminUpdateStatus(ticketId, status);
            if (res.success) {
                setSupportTickets(prev => prev.map(t =>
                    t.id === ticketId ? { ...t, status: status as SupportTicket['status'] } : t
                ));
            }
        } catch (err) { console.error('Failed to update ticket status', err); }
    };

    const pendingKYC = kycRequests.filter(req => req.status === 'PENDING');
    const openTickets = supportTickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS');

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
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setCurrentView('SME')}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <Banknote size={20} />
                        </div>
                        {(smeStats?.pending ?? 0) > 0 && <span className="text-xs font-bold text-white bg-purple-500 px-2 py-1 rounded-full">{smeStats!.pending} New</span>}
                    </div>
                    <p className="text-slate-500 text-sm font-medium">SME Applications</p>
                    <h3 className="text-2xl font-bold text-slate-900">
                        {statsLoading ? <Loader2 size={20} className="animate-spin" /> : (smeStats?.total ?? 0)}
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
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
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Subscription</th>
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
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                            u.subscriptionTier === 'SANDBOX' ? 'bg-amber-50 text-amber-700' :
                                            u.subscriptionTier === 'MONTHLY' || u.subscriptionTier === 'ANNUAL' ? 'bg-green-50 text-green-700' :
                                            u.subscriptionTier === 'TRIAL' ? 'bg-blue-50 text-blue-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {u.subscriptionTier || 'TRIAL'}
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
                                                <button
                                                    onClick={() => handleSandboxToggle(u.id, u.subscriptionTier)}
                                                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                                                        u.subscriptionTier === 'SANDBOX'
                                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                    title={u.subscriptionTier === 'SANDBOX' ? 'Remove Sandbox' : 'Set as Sandbox'}
                                                >
                                                    {u.subscriptionTier === 'SANDBOX' ? '✦ Sandbox' : '☆ Sandbox'}
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

    const renderSME = () => (
        <div className="space-y-6 animate-fade-in">
            {/* SME Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500 font-medium">Total Applications</p>
                    <h3 className="text-2xl font-bold text-slate-900">{smeStats?.total ?? 0}</h3>
                </div>
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
                    <p className="text-sm text-amber-700 font-medium">Pending Review</p>
                    <h3 className="text-2xl font-bold text-amber-800">{smeStats?.pending ?? 0}</h3>
                </div>
                <div className="bg-green-50 p-5 rounded-2xl border border-green-100 shadow-sm">
                    <p className="text-sm text-green-700 font-medium">Approved</p>
                    <h3 className="text-2xl font-bold text-green-800">{smeStats?.approved ?? 0}</h3>
                </div>
                <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm">
                    <p className="text-sm text-red-700 font-medium">Declined</p>
                    <h3 className="text-2xl font-bold text-red-800">{smeStats?.declined ?? 0}</h3>
                </div>
            </div>

            {/* Applications Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">All Applications</h3>
                    <button onClick={() => fetchSmeApplications()} className="text-sm text-blue-600 hover:underline flex items-center space-x-1">
                        <RefreshCw size={14} /> <span>Refresh</span>
                    </button>
                </div>

                {smeLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Loading applications...</p>
                    </div>
                ) : smeApplications.length === 0 ? (
                    <div className="p-12 text-center">
                        <Banknote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No SME Finance applications yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {smeApplications.map((app: any) => (
                            <div key={app.id}>
                                {/* Summary Row */}
                                <div className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}>
                                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                                        <div>
                                            <p className="font-medium text-slate-900">{app.user?.name || 'N/A'} <span className="text-xs text-slate-400">({app.user?.email || ''})</span></p>
                                            <p className="text-sm font-semibold text-slate-700">{app.businessName} <span className="text-xs text-slate-400">• {app.businessType}</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 flex-shrink-0">
                                        <span className="font-mono font-bold text-slate-900 text-sm">₦{Number(app.loanAmount).toLocaleString()}</span>
                                        {/* Pre-Qual Score Badge */}
                                        {app.preQualOutcome && (
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                                app.preQualOutcome === 'Qualified' ? 'bg-green-100 text-green-800' :
                                                app.preQualOutcome === 'Conditionally Qualified' ? 'bg-amber-100 text-amber-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {app.preQualOutcome} ({app.preQualScore}/9)
                                            </span>
                                        )}
                                        <span className={`inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                                            app.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                            app.status === 'DECLINED' ? 'bg-red-100 text-red-800' :
                                            'bg-amber-100 text-amber-800'
                                        }`}>
                                            {app.status === 'APPROVED' ? <CheckCircle size={12} /> :
                                                app.status === 'DECLINED' ? <Ban size={12} /> :
                                                <Clock size={12} />}
                                            <span>{app.status}</span>
                                        </span>
                                        <span className="text-xs text-slate-400">{new Date(app.createdAt).toLocaleDateString()}</span>
                                        {expandedApp === app.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {expandedApp === app.id && (
                                    <div className="px-5 pb-5 space-y-4">
                                        {/* Scoring Panel */}
                                        {app.preQualScore !== null && app.preQualScore !== undefined && (
                                            <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
                                                <h4 className="text-xs font-bold text-slate-800 uppercase mb-3">Pre-Qualification Scoring (Internal)</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                                    <div className="text-center">
                                                        <p className="text-xs text-slate-500">Score</p>
                                                        <p className="text-lg font-bold text-slate-900">{app.preQualScore}/9</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-slate-500">Revenue</p>
                                                        <p className={`text-sm font-bold ${app.revenueStrength === 'High' ? 'text-green-700' : app.revenueStrength === 'Medium' ? 'text-amber-700' : 'text-red-700'}`}>{app.revenueStrength || 'N/A'}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-slate-500">Repayment</p>
                                                        <p className={`text-sm font-bold ${app.repaymentCapacity === 'High' ? 'text-green-700' : app.repaymentCapacity === 'Medium' ? 'text-amber-700' : 'text-red-700'}`}>{app.repaymentCapacity || 'N/A'}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-slate-500">Credit</p>
                                                        <p className={`text-sm font-bold ${app.creditHistory === 'Good' ? 'text-green-700' : app.creditHistory === 'Fair' ? 'text-amber-700' : 'text-red-700'}`}>{app.creditHistory || 'N/A'}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-slate-500">Docs</p>
                                                        <p className={`text-sm font-bold ${app.documentationLevel === 'High' ? 'text-green-700' : app.documentationLevel === 'Medium' ? 'text-amber-700' : 'text-red-700'}`}>{app.documentationLevel || 'N/A'}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-slate-500">Outcome</p>
                                                        <p className={`text-sm font-bold ${app.preQualOutcome === 'Qualified' ? 'text-green-700' : app.preQualOutcome === 'Conditionally Qualified' ? 'text-amber-700' : 'text-red-700'}`}>{app.preQualOutcome || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Application Details Grid */}
                                        <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div><span className="text-slate-500 text-xs">RC Number</span><p className="font-medium text-slate-900">{app.rcNumber || 'N/A'}</p></div>
                                            <div><span className="text-slate-500 text-xs">CAC Registered</span><p className="font-medium text-slate-900">{app.registeredWithCAC ? 'Yes' : 'No'}</p></div>
                                            <div><span className="text-slate-500 text-xs">Industry</span><p className="font-medium text-slate-900">{app.industrySector || 'N/A'}</p></div>
                                            <div><span className="text-slate-500 text-xs">State</span><p className="font-medium text-slate-900">{app.state || 'N/A'}</p></div>
                                            <div><span className="text-slate-500 text-xs">Year Est.</span><p className="font-medium text-slate-900">{app.yearEstablished || 'N/A'}</p></div>
                                            <div><span className="text-slate-500 text-xs">Employees</span><p className="font-medium text-slate-900">{app.numberOfEmployees || 'N/A'}</p></div>
                                            <div><span className="text-slate-500 text-xs">Owner</span><p className="font-medium text-slate-900">{app.ownerFullName || 'N/A'}</p></div>
                                            <div><span className="text-slate-500 text-xs">BVN</span><p className="font-medium text-slate-900">{app.ownerBVN ? '•••' + app.ownerBVN.slice(-4) : 'N/A'}</p></div>
                                            <div><span className="text-slate-500 text-xs">Monthly Revenue</span><p className="font-medium text-slate-900">{app.monthlySalesRevenue ? `₦${Number(app.monthlySalesRevenue).toLocaleString()}` : 'N/A'}</p></div>
                                            <div><span className="text-slate-500 text-xs">Monthly Expenses</span><p className="font-medium text-slate-900">{app.monthlyExpenses ? `₦${Number(app.monthlyExpenses).toLocaleString()}` : 'N/A'}</p></div>
                                            <div><span className="text-slate-500 text-xs">Monthly Profit</span><p className="font-medium text-slate-900">{app.monthlyProfitEstimate ? `₦${Number(app.monthlyProfitEstimate).toLocaleString()}` : 'N/A'}</p></div>
                                            <div><span className="text-slate-500 text-xs">Loan Tenor</span><p className="font-medium text-slate-900">{app.loanTenorMonths || app.repaymentPeriod || 'N/A'} months</p></div>
                                            <div><span className="text-slate-500 text-xs">Previous Loan</span><p className="font-medium text-slate-900">{app.hasPreviousLoan ? `Yes — ${app.previousLoanStatus || 'N/A'}` : 'No'}</p></div>
                                            <div><span className="text-slate-500 text-xs">Keeps Records</span><p className="font-medium text-slate-900">{app.keepsFinancialRecords ? 'Yes' : 'No'}</p></div>
                                            <div><span className="text-slate-500 text-xs">Bank</span><p className="font-medium text-slate-900">{app.primaryBankName || 'N/A'}</p></div>
                                            <div><span className="text-slate-500 text-xs">Collateral</span><p className="font-medium text-slate-900">{app.hasCollateral ? (app.collateralType || 'Yes') : 'None'}</p></div>
                                        </div>

                                        {/* Admin Actions */}
                                        <div className="flex items-center space-x-2">
                                            {app.status !== 'APPROVED' && (
                                                <button
                                                    onClick={() => handleSmeStatusChange(app.id, 'APPROVED')}
                                                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                                                >Approve</button>
                                            )}
                                            {app.status !== 'DECLINED' && (
                                                <button
                                                    onClick={() => handleSmeStatusChange(app.id, 'DECLINED')}
                                                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                                                >Decline</button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderSupport = () => (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500 font-medium">Total Tickets</p>
                    <h3 className="text-2xl font-bold text-slate-900">{supportTotal}</h3>
                </div>
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                    <p className="text-sm text-blue-700 font-medium">Open</p>
                    <h3 className="text-2xl font-bold text-blue-800">{supportTickets.filter(t => t.status === 'OPEN').length}</h3>
                </div>
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
                    <p className="text-sm text-amber-700 font-medium">In Progress</p>
                    <h3 className="text-2xl font-bold text-amber-800">{supportTickets.filter(t => t.status === 'IN_PROGRESS').length}</h3>
                </div>
                <div className="bg-green-50 p-5 rounded-2xl border border-green-100 shadow-sm">
                    <p className="text-sm text-green-700 font-medium">Resolved</p>
                    <h3 className="text-2xl font-bold text-green-800">{supportTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length}</h3>
                </div>
            </div>

            {/* Tickets List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">All Tickets</h3>
                    <button onClick={() => fetchSupportTickets()} className="text-sm text-blue-600 hover:underline flex items-center space-x-1">
                        <RefreshCw size={14} /> <span>Refresh</span>
                    </button>
                </div>

                {supportLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Loading tickets...</p>
                    </div>
                ) : supportTickets.length === 0 ? (
                    <div className="p-12 text-center">
                        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">No support tickets yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {supportTickets.map(ticket => (
                            <div key={ticket.id}>
                                <button
                                    onClick={() => setExpandedAdminTicket(expandedAdminTicket === ticket.id ? null : ticket.id)}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                                >
                                    <div className="flex items-center space-x-4 min-w-0">
                                        <div className="flex-shrink-0">
                                            {ticket.status === 'OPEN' ? <AlertTriangle size={14} className="text-blue-500" /> :
                                             ticket.status === 'IN_PROGRESS' ? <Clock size={14} className="text-amber-500" /> :
                                             ticket.status === 'RESOLVED' ? <CheckCircle size={14} className="text-green-500" /> :
                                             <Ban size={14} className="text-slate-400" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{ticket.subject}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {ticket.user?.name || 'Unknown'} ({ticket.user?.email || ''}) • {new Date(ticket.createdAt).toLocaleDateString()} • {ticket.messages?.length || 0} msgs
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 flex-shrink-0">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                            ticket.status === 'OPEN' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            ticket.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            ticket.status === 'RESOLVED' ? 'bg-green-50 text-green-700 border-green-200' :
                                            'bg-slate-50 text-slate-500 border-slate-200'
                                        }`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                        {expandedAdminTicket === ticket.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                </button>

                                {expandedAdminTicket === ticket.id && (
                                    <div className="px-6 pb-6">
                                        {/* Status Controls */}
                                        <div className="flex items-center space-x-2 mb-4">
                                            <span className="text-xs text-slate-500 font-medium">Set status:</span>
                                            {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleTicketStatusChange(ticket.id, s)}
                                                    disabled={ticket.status === s}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                                        ticket.status === s
                                                            ? 'bg-slate-200 text-slate-500 cursor-default'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {s.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Messages */}
                                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 max-h-80 overflow-y-auto">
                                            {(ticket.messages || []).map((msg: TicketMessageType) => (
                                                <div key={msg.id} className={`flex ${msg.senderRole === 'USER' ? 'justify-start' : 'justify-end'}`}>
                                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                                        msg.senderRole === 'USER'
                                                            ? 'bg-white text-slate-800 border border-slate-200'
                                                            : 'bg-red-600 text-white'
                                                    }`}>
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <span className={`text-xs font-semibold ${msg.senderRole === 'USER' ? 'text-slate-500' : 'text-red-100'}`}>
                                                                {msg.senderName} {msg.senderRole === 'ADMIN' && '(Admin)'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                                        <p className={`text-xs mt-1 ${msg.senderRole === 'USER' ? 'text-slate-400' : 'text-red-200'}`}>
                                                            {new Date(msg.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Admin Reply */}
                                        {ticket.status !== 'CLOSED' && (
                                            <div className="flex items-center space-x-2 mt-3">
                                                <input
                                                    type="text"
                                                    placeholder="Type a reply as admin..."
                                                    value={adminReplyText[ticket.id] || ''}
                                                    onChange={e => setAdminReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleAdminReply(ticket.id); }}
                                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                />
                                                <button
                                                    onClick={() => handleAdminReply(ticket.id)}
                                                    disabled={adminReplying === ticket.id || !adminReplyText[ticket.id]?.trim()}
                                                    className="p-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                                                >
                                                    {adminReplying === ticket.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderEmailQueue = () => (
        <div className="space-y-6 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Pending', count: emailQueueSummary.pending, color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
                    { label: 'Sent', count: emailQueueSummary.sent, color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
                    { label: 'Failed', count: emailQueueSummary.failed, color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
                    { label: 'Cancelled', count: emailQueueSummary.cancelled, color: 'bg-slate-100 text-slate-800', dot: 'bg-slate-500' },
                ].map(item => (
                    <div key={item.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center space-x-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${item.dot}`}></div>
                            <span className="text-xs font-semibold text-slate-500 uppercase">{item.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{item.count}</p>
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                {['ALL', 'PENDING', 'SENT', 'FAILED', 'CANCELLED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setEmailQueueFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            emailQueueFilter === status
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                ))}
                <div className="flex-1"></div>
                <button
                    onClick={fetchEmailQueue}
                    disabled={emailQueueLoading}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw size={18} className={emailQueueLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Email Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {emailQueueLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-slate-400" />
                        <span className="ml-3 text-slate-500">Loading queue...</span>
                    </div>
                ) : emailQueue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Inbox size={40} className="mb-3 opacity-50" />
                        <p className="text-lg font-medium">No emails found</p>
                        <p className="text-sm">Try a different filter, or no emails have been queued yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Scheduled</th>
                                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Sent</th>
                                    <th className="hidden md:table-cell px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Attempts</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {emailQueue.map(email => {
                                    const statusColors: Record<string, string> = {
                                        PENDING: 'bg-amber-100 text-amber-800',
                                        SENT: 'bg-green-100 text-green-800',
                                        FAILED: 'bg-red-100 text-red-800',
                                        CANCELLED: 'bg-slate-100 text-slate-600',
                                    };
                                    return (
                                        <tr key={email.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-slate-900">{email.emailType.replace(/_/g, ' ')}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{email.id.slice(0, 8)}...</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[email.status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {email.status}
                                                </span>
                                                {email.error && (
                                                    <p className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate" title={email.error}>{email.error}</p>
                                                )}
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3 text-xs text-slate-500">
                                                {new Date(email.scheduledFor).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3 text-xs text-slate-500">
                                                {email.sentAt ? new Date(email.sentAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3 text-center text-xs font-mono text-slate-500">
                                                {email.attempts}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end space-x-1">
                                                    {email.status === 'PENDING' && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm('Cancel this pending email?')) return;
                                                                await adminApi.cancelEmail(email.id);
                                                                fetchEmailQueue();
                                                            }}
                                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Cancel"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    )}
                                                    {email.status === 'FAILED' && (
                                                        <button
                                                            onClick={async () => {
                                                                await adminApi.retryEmail(email.id);
                                                                fetchEmailQueue();
                                                            }}
                                                            className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Retry"
                                                        >
                                                            <RotateCw size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );

    // Audience option config for the broadcast filter
    const broadcastAudienceOptions: Array<{
        value: string;
        label: string;
        description: string;
        color: string;
        badge: string;
    }> = [
        { value: 'ALL',           label: '👥 All Users',            description: 'Every active user on the platform',          color: 'border-slate-300 bg-slate-50',   badge: 'bg-slate-100 text-slate-700' },
        { value: 'PAID_ALL',      label: '💳 All Paid Users',       description: 'Monthly + Annual subscribers',               color: 'border-green-300 bg-green-50',   badge: 'bg-green-100 text-green-700' },
        { value: 'PAID_MONTHLY',  label: '📅 Paid — Monthly',       description: 'Active monthly subscribers only',            color: 'border-blue-300 bg-blue-50',     badge: 'bg-blue-100 text-blue-700' },
        { value: 'PAID_ANNUAL',   label: '🏆 Paid — Annual',        description: 'Active annual subscribers only',             color: 'border-purple-300 bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
        { value: 'UNPAID_ALL',    label: '🆓 All Unpaid Users',     description: 'Trial + Sandbox users',                      color: 'border-amber-300 bg-amber-50',   badge: 'bg-amber-100 text-amber-700' },
        { value: 'UNPAID_TRIAL',  label: '⏳ Trial Users',          description: 'Users on the free trial period',             color: 'border-orange-300 bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
        { value: 'UNPAID_SANDBOX','label': '🧪 Sandbox Users',      description: 'Users with sandbox/demo access',             color: 'border-rose-300 bg-rose-50',     badge: 'bg-rose-100 text-rose-700' },
        { value: 'SINGLE',        label: '👤 Single User',          description: 'Send to one specific user by email',         color: 'border-cyan-300 bg-cyan-50',     badge: 'bg-cyan-100 text-cyan-700' },
        { value: 'SELECTED',      label: '☑️ Select Users',         description: 'Hand-pick specific users from the list',     color: 'border-indigo-300 bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' },
    ];

    const selectedOption = broadcastAudienceOptions.find(o => o.value === broadcastTargetGroup);

    // Filtered user list for SELECTED mode
    const filteredUsersForBroadcast = users.filter(u =>
        broadcastUserSearch === '' ||
        u.name.toLowerCase().includes(broadcastUserSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(broadcastUserSearch.toLowerCase())
    );

    const broadcastCanSend = broadcastSubject.trim() !== '' &&
        broadcastBody.trim() !== '' &&
        broadcastStatus !== 'SENDING' &&
        (broadcastTargetGroup !== 'SINGLE' || broadcastTargetEmail.trim() !== '') &&
        (broadcastTargetGroup !== 'SELECTED' || broadcastSelectedUsers.length > 0);

    const getConfirmMsg = () => {
        switch (broadcastTargetGroup) {
            case 'ALL':           return 'ALL active users';
            case 'PAID_ALL':      return 'all PAID users (Monthly + Annual)';
            case 'PAID_MONTHLY':  return 'all MONTHLY subscribers';
            case 'PAID_ANNUAL':   return 'all ANNUAL subscribers';
            case 'UNPAID_ALL':    return 'all unpaid users (Trial + Sandbox)';
            case 'UNPAID_TRIAL':  return 'all TRIAL users';
            case 'UNPAID_SANDBOX':return 'all SANDBOX users';
            case 'SINGLE':        return `${broadcastTargetEmail}`;
            case 'SELECTED':      return `${broadcastSelectedUsers.length} selected user(s)`;
            default:              return 'selected recipients';
        }
    };

    const renderBroadcast = () => (
        <div className="space-y-6 animate-fade-in">
            {/* Step 1 — Audience Selector */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-5">
                    <div className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <h3 className="text-base font-bold text-slate-900">Choose Audience</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {broadcastAudienceOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                setBroadcastTargetGroup(opt.value as any);
                                setBroadcastStatus('IDLE');
                                setBroadcastResult(null);
                                setBroadcastSelectedUsers([]);
                                setBroadcastTargetEmail('');
                                setBroadcastUserSearch('');
                            }}
                            className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                                broadcastTargetGroup === opt.value
                                    ? opt.color + ' shadow-sm ring-2 ring-offset-1 ring-green-500'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <p className="text-sm font-semibold text-slate-800 leading-tight">{opt.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{opt.description}</p>
                            {broadcastTargetGroup === opt.value && (
                                <span className="absolute top-2 right-2">
                                    <CheckCircle size={14} className="text-green-600" />
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* SINGLE — email input */}
                {broadcastTargetGroup === 'SINGLE' && (
                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Recipient Email</label>
                        <input
                            type="email"
                            value={broadcastTargetEmail}
                            onChange={e => setBroadcastTargetEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm text-slate-900"
                        />
                    </div>
                )}

                {/* SELECTED — user search + checkboxes */}
                {broadcastTargetGroup === 'SELECTED' && (
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700">Select Recipients</label>
                            {broadcastSelectedUsers.length > 0 && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                    {broadcastSelectedUsers.length} selected
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={broadcastUserSearch}
                                onChange={e => setBroadcastUserSearch(e.target.value)}
                                placeholder="Search users by name or email..."
                                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                            />
                        </div>
                        <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                            {filteredUsersForBroadcast.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-400">No users found</div>
                            ) : (
                                filteredUsersForBroadcast.map(u => {
                                    const checked = broadcastSelectedUsers.includes(u.id);
                                    return (
                                        <label key={u.id} className={`flex items-center space-x-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => {
                                                    setBroadcastSelectedUsers(prev =>
                                                        checked ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                                    );
                                                }}
                                                className="w-4 h-4 rounded accent-green-600"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                                                <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                            </div>
                                            <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                u.subscriptionTier === 'MONTHLY' || u.subscriptionTier === 'ANNUAL'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {u.subscriptionTier || 'TRIAL'}
                                            </span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                        {broadcastSelectedUsers.length > 0 && (
                            <button
                                onClick={() => setBroadcastSelectedUsers([])}
                                className="text-xs text-red-500 hover:text-red-700 transition-colors"
                            >
                                Clear selection
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Step 2 — Compose */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center space-x-3 mb-5">
                    <div className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <h3 className="text-base font-bold text-slate-900">Compose Message</h3>
                </div>

                {/* Preview Banner */}
                <div className="mb-5 bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 flex items-center space-x-3">
                    <img src="/Fiscana.svg" alt="Fiscana" className="w-8 h-8" />
                    <span className="text-white font-bold text-lg">Fiscana</span>
                    <span className="text-green-200 text-sm ml-auto">Email Header Preview</span>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Subject Line</label>
                        <input
                            type="text"
                            value={broadcastSubject}
                            onChange={(e) => setBroadcastSubject(e.target.value)}
                            placeholder="e.g. Important Update: New Feature Launch"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-slate-900 font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Email Body</label>
                        <textarea
                            value={broadcastBody}
                            onChange={(e) => setBroadcastBody(e.target.value)}
                            placeholder={"Type your message here...\n\nEach paragraph will be formatted automatically. The Fiscana header (logo + brand) and footer (copyright + link) are included automatically."}
                            rows={10}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-slate-900 resize-y"
                        />
                        <p className="text-xs text-slate-400 mt-1">Each line break creates a new paragraph. The Fiscana branded header and footer are added automatically.</p>
                    </div>
                </div>

                {/* Result banners */}
                {broadcastStatus === 'SENT' && broadcastResult && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-green-700 font-semibold">✅ Broadcast sent successfully!</p>
                        <p className="text-green-600 text-sm mt-1">
                            {broadcastResult.sent} of {broadcastResult.total} emails delivered.
                            {broadcastResult.failed > 0 && <span className="text-red-600"> ({broadcastResult.failed} failed)</span>}
                        </p>
                    </div>
                )}
                {broadcastStatus === 'ERROR' && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-700 font-semibold">❌ Failed to send broadcast. Please try again.</p>
                    </div>
                )}

                {/* Footer — recipient summary + send button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-6 border-t border-slate-100">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase">Sending to</p>
                        <div className="flex items-center space-x-2">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${selectedOption?.badge || 'bg-slate-100 text-slate-600'}`}>
                                {selectedOption?.label}
                            </span>
                            {broadcastTargetGroup === 'SINGLE' && broadcastTargetEmail && (
                                <span className="text-sm text-slate-600 font-medium">{broadcastTargetEmail}</span>
                            )}
                            {broadcastTargetGroup === 'SELECTED' && broadcastSelectedUsers.length > 0 && (
                                <span className="text-sm text-slate-600 font-medium">{broadcastSelectedUsers.length} user(s)</span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            if (!broadcastSubject.trim() || !broadcastBody.trim()) {
                                alert('Please fill in both the subject and body.');
                                return;
                            }
                            if (!confirm(`Send this email to ${getConfirmMsg()}?\n\nSubject: ${broadcastSubject}`)) return;
                            setBroadcastStatus('SENDING');
                            setBroadcastResult(null);
                            try {
                                const payload: Parameters<typeof adminApi.broadcastEmail>[0] = {
                                    subject: broadcastSubject,
                                    body: broadcastBody,
                                    targetGroup: broadcastTargetGroup,
                                };
                                if (broadcastTargetGroup === 'SINGLE') payload.targetEmail = broadcastTargetEmail;
                                if (broadcastTargetGroup === 'SELECTED') payload.targetUserIds = broadcastSelectedUsers;

                                const res = await adminApi.broadcastEmail(payload);
                                if (res.success && res.data) {
                                    setBroadcastStatus('SENT');
                                    setBroadcastResult(res.data);
                                    setBroadcastSubject('');
                                    setBroadcastBody('');
                                    if (broadcastTargetGroup !== 'SINGLE') {
                                        setBroadcastSelectedUsers([]);
                                        setBroadcastTargetEmail('');
                                    }
                                } else {
                                    setBroadcastStatus('ERROR');
                                }
                            } catch {
                                setBroadcastStatus('ERROR');
                            }
                        }}
                        disabled={!broadcastCanSend}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${
                            broadcastStatus === 'SENDING' ? 'bg-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {broadcastStatus === 'SENDING' ? (
                            <><Loader2 size={18} className="animate-spin" /><span>Sending...</span></>
                        ) : (
                            <><Send size={18} /><span>Send Email</span></>
                        )}
                    </button>
                </div>
            </div>
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
                        onClick={() => setCurrentView('SME')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'SME' ? 'bg-slate-800 text-white border-l-4 border-red-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Banknote size={20} />
                        <div className="flex justify-between w-full items-center">
                            <span className="font-medium">SME Finance</span>
                            {(smeStats?.pending ?? 0) > 0 && <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{smeStats!.pending}</span>}
                        </div>
                    </button>
                    <button
                        onClick={() => setCurrentView('SUPPORT')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'SUPPORT' ? 'bg-slate-800 text-white border-l-4 border-red-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <HelpCircle size={20} />
                        <div className="flex justify-between w-full items-center">
                            <span className="font-medium">Support</span>
                            {openTickets.length > 0 && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{openTickets.length}</span>}
                        </div>
                    </button>
                    <button
                        onClick={() => setCurrentView('HEALTH')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'HEALTH' ? 'bg-slate-800 text-white border-l-4 border-red-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Server size={20} />
                        <span className="font-medium">System Health</span>
                    </button>
                    <button
                        onClick={() => setCurrentView('BROADCAST')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'BROADCAST' ? 'bg-slate-800 text-white border-l-4 border-red-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Mail size={20} />
                        <span className="font-medium">Broadcast Email</span>
                    </button>
                    <button
                        onClick={() => setCurrentView('EMAIL_QUEUE')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'EMAIL_QUEUE' ? 'bg-slate-800 text-white border-l-4 border-red-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Inbox size={20} />
                        <span className="font-medium">Email Queue</span>
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
                                    currentView === 'KYC' ? 'Verification Queue' :
                                        currentView === 'SME' ? 'SME Finance Applications' :
                                            currentView === 'SUPPORT' ? 'Support Tickets' :
                                                currentView === 'BROADCAST' ? 'Broadcast Email' :
                                                    currentView === 'EMAIL_QUEUE' ? 'Email Queue' : 'System Health'}
                        </h1>
                        <p className="text-slate-500">
                            {currentView === 'OVERVIEW' ? 'Real-time platform monitoring' :
                                currentView === 'USERS' ? 'Manage global user access' :
                                    currentView === 'KYC' ? 'Review identity documents' :
                                        currentView === 'SME' ? 'Review and manage loan applications' :
                                            currentView === 'SUPPORT' ? 'View and respond to user support requests' :
                                                currentView === 'BROADCAST' ? 'Send updates to all users' :
                                                    currentView === 'EMAIL_QUEUE' ? 'Monitor and manage automated emails' : 'Infrastructure and logs'}
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
                {currentView === 'SME' && renderSME()}
                {currentView === 'SUPPORT' && renderSupport()}
                {currentView === 'HEALTH' && renderHealth()}
                {currentView === 'BROADCAST' && renderBroadcast()}
                {currentView === 'EMAIL_QUEUE' && renderEmailQueue()}

            </main>
        </div>
    );
};

export default AdminDashboard;