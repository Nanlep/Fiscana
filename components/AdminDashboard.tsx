import React, { useState, useEffect, useRef } from 'react';
import { Users, Activity, Server, AlertTriangle, LogOut, Search, Building2, User, Trash2, Ban, CheckCircle, RefreshCw, Terminal, DollarSign, ShieldCheck, TrendingUp, Save } from 'lucide-react';
import { UserProfile, KYCRequest } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
  adminProfile: UserProfile;
  kycRequests: KYCRequest[];
  onReviewKYC: (id: string, action: 'APPROVED' | 'REJECTED') => void;
  exchangeRate: number;
  onUpdateExchangeRate: (rate: number) => void;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  type: 'INDIVIDUAL' | 'CORPORATE';
  status: 'Active' | 'Suspended';
  joined: string;
}

type AdminView = 'OVERVIEW' | 'USERS' | 'HEALTH' | 'KYC';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, adminProfile, kycRequests, onReviewKYC, exchangeRate, onUpdateExchangeRate }) => {
  const [currentView, setCurrentView] = useState<AdminView>('OVERVIEW');
  
  // User Management State
  const [users, setUsers] = useState<AdminUser[]>([
    { id: 1, name: "Taiwo Doe", email: "taiwo@example.com", type: "INDIVIDUAL", status: "Active", joined: "2025-05-10" },
    { id: 2, name: "Acme Tech Ltd", email: "info@acmetech.ng", type: "CORPORATE", status: "Active", joined: "2025-05-12" },
    { id: 3, name: "Sarah Smith", email: "sarah@design.co", type: "INDIVIDUAL", status: "Suspended", joined: "2025-05-15" },
    { id: 4, name: "Logos Media", email: "hello@logos.ng", type: "CORPORATE", status: "Active", joined: "2025-05-18" },
    { id: 5, name: "John Wick", email: "john@continental.com", type: "INDIVIDUAL", status: "Active", joined: "2025-05-19" },
    { id: 6, name: "Emeka & Sons", email: "emeka@sons.ng", type: "CORPORATE", status: "Active", joined: "2025-05-20" },
    { id: 7, name: "Crypto King", email: "trade@binance.ng", type: "INDIVIDUAL", status: "Suspended", joined: "2025-05-21" },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Revenue Settings State
  const [commissionRate, setCommissionRate] = useState<number>(1.5);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVED'>('IDLE');

  // Exchange Rate State
  const [tempExchangeRate, setTempExchangeRate] = useState<string>(exchangeRate.toString());
  const [rateSaveStatus, setRateSaveStatus] = useState<'IDLE' | 'SAVED'>('IDLE');

  useEffect(() => {
    setTempExchangeRate(exchangeRate.toString());
  }, [exchangeRate]);

  const handleSaveRate = () => {
    setSaveStatus('SAVED');
    setTimeout(() => setSaveStatus('IDLE'), 2000);
  };

  const handleSaveExchangeRate = () => {
    const newRate = parseFloat(tempExchangeRate);
    if (!isNaN(newRate) && newRate > 0) {
        onUpdateExchangeRate(newRate);
        setRateSaveStatus('SAVED');
        setTimeout(() => setRateSaveStatus('IDLE'), 2000);
    }
  };

  // System Health State
  const [logs, setLogs] = useState<string[]>([
    "[INFO] System initialized successfully at 08:00:00 UTC",
    "[INFO] Connected to Postgres Database Cluster (latency: 24ms)",
    "[INFO] Bani Payment Rails: HEALTHY",
    "[INFO] Gemini AI Model loaded: gemini-3-flash-preview"
  ]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Simulate Logs
  useEffect(() => {
    if (currentView === 'HEALTH') {
        const interval = setInterval(() => {
            const actions = [
                "[INFO] Incoming GET /api/v1/invoices - 200 OK",
                "[INFO] Tax compliance check initiated for user_id: 1245",
                "[WARN] High latency detected on node-eu-west-3",
                "[INFO] Payment webhook received: tx_ref_99283",
                "[INFO] New user registration: CORPORATE"
            ];
            const randomLog = actions[Math.floor(Math.random() * actions.length)];
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            setLogs(prev => [...prev.slice(-15), `[${timestamp}] ${randomLog}`]); // Keep last 15 logs
        }, 3000);
        return () => clearInterval(interval);
    }
  }, [currentView]);

  useEffect(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handlers
  const handleStatusChange = (id: number, newStatus: 'Active' | 'Suspended') => {
      setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
      setSelectedUser(null);
  };

  const handleDeleteUser = (id: number) => {
      if(confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
          setUsers(users.filter(u => u.id !== id));
          setSelectedUser(null);
      }
  };

  const filteredUsers = users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingKYC = kycRequests.filter(req => req.status === 'PENDING');

  // --- Views ---

  const renderOverview = () => (
    <div className="space-y-8 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Users size={20} />
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+12%</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Total Users</p>
                <h3 className="text-2xl font-bold text-slate-900">{users.length.toLocaleString()}</h3>
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
                    {pendingKYC.length}
                </h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                        <Activity size={20} />
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+24%</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Tx Volume (24h)</p>
                <h3 className="text-2xl font-bold text-slate-900">₦ 45.2M</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                        <AlertTriangle size={20} />
                    </div>
                </div>
                <p className="text-slate-500 text-sm font-medium">Server Load</p>
                <h3 className="text-2xl font-bold text-slate-900">23%</h3>
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
                                className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center gap-2 ${saveStatus === 'SAVED' ? 'bg-green-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                            >
                                {saveStatus === 'SAVED' ? <CheckCircle size={20} /> : 'Save Rate'}
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
                                className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg flex items-center gap-2 ${rateSaveStatus === 'SAVED' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {rateSaveStatus === 'SAVED' ? <CheckCircle size={20} /> : <><Save size={18}/> Update</>}
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
                <p className="text-slate-500 text-sm">Manage user access and roles</p>
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
                    {filteredUsers.map((u) => (
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
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    u.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {u.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">{u.joined}</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end space-x-2">
                                    {u.status === 'Active' ? (
                                        <button 
                                            onClick={() => handleStatusChange(u.id, 'Suspended')}
                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                            title="Suspend User"
                                        >
                                            <Ban size={18} />
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleStatusChange(u.id, 'Active')}
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
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
            <button className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg">
                <RefreshCw size={16} /> <span>Refresh Status</span>
            </button>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Activity size={80} />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">API Gateway</p>
                    <h3 className="text-xl font-bold text-green-600 flex items-center">
                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        Operational
                    </h3>
                    <p className="text-xs text-slate-400 mt-2">Latency: 24ms</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                    <Server size={24} className="text-green-600" />
                </div>
             </div>

             <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Building2 size={80} />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Bani Payment Rails</p>
                    <h3 className="text-xl font-bold text-green-600 flex items-center">
                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        Connected
                    </h3>
                    <p className="text-xs text-slate-400 mt-2">Success Rate: 99.8%</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                    <Building2 size={24} className="text-blue-600" />
                </div>
             </div>

             <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Activity size={80} />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Gemini AI Engine</p>
                    <h3 className="text-xl font-bold text-green-600 flex items-center">
                         <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        Ready
                    </h3>
                    <p className="text-xs text-slate-400 mt-2">Model: 3.0 Flash Preview</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                    <Activity size={24} className="text-purple-600" />
                </div>
             </div>
        </div>

        {/* Live Logs */}
        <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <div className="flex items-center space-x-2">
                    <Terminal size={18} className="text-green-400" />
                    <h3 className="text-slate-200 font-mono text-sm font-bold">Live System Logs</h3>
                </div>
                <div className="flex space-x-1.5">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
            </div>
            <div className="p-6 font-mono text-xs md:text-sm text-slate-300 h-80 overflow-y-auto space-y-2">
                {logs.map((log, index) => (
                    <div key={index} className="border-b border-slate-800/50 pb-1 last:border-0 hover:text-white transition-colors">
                        <span className="text-slate-500 mr-2">{index + 1}</span>
                        <span className={log.includes("WARN") ? "text-amber-400" : log.includes("ERROR") ? "text-red-400" : "text-green-400"}>
                            {log}
                        </span>
                    </div>
                ))}
                <div ref={logsEndRef} />
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
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-600">All Systems Operational</span>
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