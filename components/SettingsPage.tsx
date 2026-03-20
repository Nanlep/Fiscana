import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { billingApi, supportApi, SupportTicket, TicketMessageType } from '../services/apiClient';
import {
    ArrowLeft, User, CreditCard, HelpCircle, Mail, Camera, Save, Loader2,
    CheckCircle, Clock, AlertCircle, MessageSquare, Send, ChevronDown,
    ChevronUp, Building2, ShieldCheck, Crown, Plus, ExternalLink, XCircle
} from 'lucide-react';

type SettingsTab = 'personal' | 'subscription' | 'support';

interface SettingsPageProps {
    onBack: () => void;
    onNavigateBilling: () => void;
    notify: (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onNavigateBilling, notify }) => {
    const { user, updateProfile, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>('personal');

    const tabs = [
        { id: 'personal' as SettingsTab, label: 'Personal Info', icon: User },
        { id: 'subscription' as SettingsTab, label: 'Subscription', icon: CreditCard },
        { id: 'support' as SettingsTab, label: 'Support', icon: HelpCircle },
    ];

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center space-x-2 text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Back to Dashboard</span>
                </button>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-slate-100 rounded-xl p-1 mb-8">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === tab.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === 'personal' && <PersonalInfoTab user={user} updateProfile={updateProfile} notify={notify} />}
            {activeTab === 'subscription' && <SubscriptionTab onNavigateBilling={onNavigateBilling} />}
            {activeTab === 'support' && <SupportTab user={user} notify={notify} />}
        </div>
    );
};

// ==================== PERSONAL INFO TAB ====================
const PersonalInfoTab: React.FC<{
    user: any;
    updateProfile: (data: any) => Promise<boolean>;
    notify: (type: any, message: string) => void;
}> = ({ user, updateProfile, notify }) => {
    const [name, setName] = useState(user?.name || '');
    const [companyName, setCompanyName] = useState(user?.companyName || '');
    const [tin, setTin] = useState(user?.tin || '');
    const [saving, setSaving] = useState(false);
    const [profilePic, setProfilePic] = useState<string | null>(() => {
        return localStorage.getItem(`fiscana_profile_pic_${user?.id}`) || null;
    });
    const fileRef = useRef<HTMLInputElement>(null);

    const handlePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            notify('ERROR', 'Image must be under 2MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            setProfilePic(dataUrl);
            localStorage.setItem(`fiscana_profile_pic_${user?.id}`, dataUrl);
            notify('SUCCESS', 'Profile picture updated');
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setSaving(true);
        const success = await updateProfile({ name, companyName, tin });
        if (success) {
            notify('SUCCESS', 'Profile updated successfully');
        } else {
            notify('ERROR', 'Failed to update profile');
        }
        setSaving(false);
    };

    const getInitials = (n: string) => {
        const parts = n.split(' ').filter(Boolean);
        return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : n.substring(0, 2).toUpperCase();
    };

    return (
        <div className="space-y-8">
            {/* Profile Picture */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Profile Picture</h2>
                <div className="flex items-center space-x-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                            {profilePic ? (
                                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-white">{getInitials(user?.name || 'U')}</span>
                            )}
                        </div>
                        <button
                            onClick={() => fileRef.current?.click()}
                            className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            <Camera size={14} className="text-slate-600" />
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePicChange}
                            className="hidden"
                        />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                        <p className="text-xs text-slate-500 mt-1">Click the camera icon to upload a new photo</p>
                        <p className="text-xs text-slate-400 mt-0.5">Max 2MB • JPG, PNG or GIF</p>
                    </div>
                </div>
            </div>

            {/* Invoice / Receipt Logo */}
            {(() => {
                const canUseLogo = user?.subscriptionTier === 'ANNUAL' || user?.subscriptionTier === 'SANDBOX';
                const logoFileRef = React.createRef<HTMLInputElement>();
                return (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900">Invoice & Receipt Logo</h2>
                            {!canUseLogo && (
                                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full flex items-center space-x-1">
                                    <Crown size={12} />
                                    <span>Annual Plan Required</span>
                                </span>
                            )}
                        </div>
                        {canUseLogo ? (
                            <div className="flex items-center space-x-6">
                                <div className="w-[80px] h-[80px] rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
                                    {user?.invoiceLogo ? (
                                        <img src={user.invoiceLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-slate-400 text-center px-1">No logo</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-slate-600 mb-3">Upload your company or personal logo. It will appear on all generated invoices and receipts.</p>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={() => logoFileRef.current?.click()}
                                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            {user?.invoiceLogo ? 'Change Logo' : 'Upload Logo'}
                                        </button>
                                        {user?.invoiceLogo && (
                                            <button
                                                onClick={async () => {
                                                    setSaving(true);
                                                    const ok = await updateProfile({ invoiceLogo: null });
                                                    if (ok) notify('SUCCESS', 'Logo removed');
                                                    else notify('ERROR', 'Failed to remove logo');
                                                    setSaving(false);
                                                }}
                                                className="px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Max 500KB • PNG or JPG recommended</p>
                                    <input
                                        ref={logoFileRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/webp"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (file.size > 500 * 1024) {
                                                notify('ERROR', 'Logo must be under 500KB');
                                                return;
                                            }
                                            const reader = new FileReader();
                                            reader.onload = async () => {
                                                setSaving(true);
                                                const dataUrl = reader.result as string;
                                                const ok = await updateProfile({ invoiceLogo: dataUrl });
                                                if (ok) notify('SUCCESS', 'Logo saved! It will appear on your invoices and receipts.');
                                                else notify('ERROR', 'Failed to save logo');
                                                setSaving(false);
                                            };
                                            reader.readAsDataURL(file);
                                            e.target.value = '';
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-4 bg-slate-50 rounded-xl p-4">
                                <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0 opacity-50">
                                    <Camera size={20} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600">Add your custom logo to invoices and receipts.</p>
                                    <p className="text-xs text-slate-400 mt-1">Subscribe to the <strong>Annual plan</strong> to unlock this feature.</p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Basic Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Account Type</label>
                        <div className="flex items-center space-x-2 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl">
                            {user?.type === 'CORPORATE' ? <Building2 size={16} className="text-slate-500" /> : <User size={16} className="text-slate-500" />}
                            <span className="text-sm text-slate-500">{user?.type === 'CORPORATE' ? 'Corporate' : 'Individual (Freelancer)'}</span>
                        </div>
                    </div>
                    {user?.type === 'CORPORATE' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tax Identification Number (TIN)</label>
                        <input
                            type="text"
                            value={tin}
                            onChange={e => setTin(e.target.value)}
                            placeholder="Enter your TIN"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">KYC Status</label>
                        <div className={`flex items-center space-x-2 px-4 py-3 rounded-xl border ${user?.kycStatus === 'VERIFIED' ? 'bg-green-50 border-green-200' : user?.kycStatus === 'PENDING' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                            {user?.kycStatus === 'VERIFIED' ? <ShieldCheck size={16} className="text-green-600" /> : user?.kycStatus === 'PENDING' ? <Clock size={16} className="text-amber-600" /> : <AlertCircle size={16} className="text-slate-400" />}
                            <span className={`text-sm font-medium ${user?.kycStatus === 'VERIFIED' ? 'text-green-700' : user?.kycStatus === 'PENDING' ? 'text-amber-700' : 'text-slate-500'}`}>
                                {user?.kycStatus || 'UNVERIFIED'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            </div>

            {/* Account Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Account Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-1">Account Tier</p>
                        <p className="text-sm font-bold text-slate-900">{user?.tier?.replace('_', ' ') || 'TIER 1'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-1">Role</p>
                        <p className="text-sm font-bold text-slate-900">{user?.role || 'USER'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-1">Joined</p>
                        <p className="text-sm font-bold text-slate-900">
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==================== SUBSCRIPTION TAB ====================
const SubscriptionTab: React.FC<{ onNavigateBilling: () => void }> = ({ onNavigateBilling }) => {
    const { user } = useAuth();
    const [billingStatus, setBillingStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        setLoading(true);
        try {
            const res = await billingApi.getStatus();
            if (res.success && res.data) {
                setBillingStatus(res.data);
            }
        } catch { }
        setLoading(false);
    };

    const getTierBadge = (tier: string) => {
        const styles: Record<string, string> = {
            TRIAL: 'bg-blue-100 text-blue-700 border-blue-200',
            MONTHLY: 'bg-green-100 text-green-700 border-green-200',
            ANNUAL: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            SANDBOX: 'bg-purple-100 text-purple-700 border-purple-200',
            EXPIRED: 'bg-red-100 text-red-700 border-red-200',
        };
        return styles[tier] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Current Plan */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8">
                    <div className="flex items-center space-x-3 mb-3">
                        <Crown size={24} className="text-white/80" />
                        <h2 className="text-lg font-bold text-white">Current Plan</h2>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getTierBadge(billingStatus?.tier || user?.subscriptionTier || 'TRIAL')}`}>
                            {billingStatus?.tier || user?.subscriptionTier || 'TRIAL'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${billingStatus?.active ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                            {billingStatus?.active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {billingStatus?.tier === 'TRIAL' && billingStatus?.daysRemaining !== null && (
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <p className="text-xs text-blue-600 font-medium mb-1">Trial Remaining</p>
                                <p className="text-2xl font-bold text-blue-700">{billingStatus.daysRemaining} <span className="text-sm font-normal">days</span></p>
                            </div>
                        )}
                        {billingStatus?.subscriptionEndsAt && (
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-xs text-slate-500 font-medium mb-1">{billingStatus?.active ? 'Renews On' : 'Expired On'}</p>
                                <p className="text-sm font-bold text-slate-900">{new Date(billingStatus.subscriptionEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                        )}
                        {billingStatus?.plans && (
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-xs text-slate-500 font-medium mb-1">Available Plans</p>
                                <p className="text-sm text-slate-700">
                                    Monthly: ₦{billingStatus.plans.monthly.price.toLocaleString()} • Annual: ₦{billingStatus.plans.annual.price.toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={onNavigateBilling}
                            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
                        >
                            <CreditCard size={18} />
                            <span>Manage Plan</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Subscription Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Subscription Details</h2>
                <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Subscription Tier</span>
                        <span className="text-sm font-semibold text-slate-900">{user?.subscriptionTier || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Subscription Status</span>
                        <span className={`text-sm font-semibold ${user?.subscriptionStatus === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>{user?.subscriptionStatus || 'N/A'}</span>
                    </div>
                    {user?.trialEndsAt && (
                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Trial Ends</span>
                            <span className="text-sm font-semibold text-slate-900">{new Date(user.trialEndsAt).toLocaleDateString()}</span>
                        </div>
                    )}
                    {user?.subscriptionEndsAt && (
                        <div className="flex justify-between items-center py-3">
                            <span className="text-sm text-slate-500">Subscription Ends</span>
                            <span className="text-sm font-semibold text-slate-900">{new Date(user.subscriptionEndsAt).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ==================== SUPPORT TAB ====================
const SupportTab: React.FC<{
    user: any;
    notify: (type: any, message: string) => void;
}> = ({ user, notify }) => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

    // New ticket form
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reply
    const [replyText, setReplyText] = useState<Record<string, string>>({});
    const [replying, setReplying] = useState<string | null>(null);

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const res = await supportApi.listTickets();
            if (res.success && res.data) {
                setTickets(Array.isArray(res.data) ? res.data : []);
            }
        } catch { }
        setLoading(false);
    };

    const handleSubmitTicket = async () => {
        if (!subject.trim() || !message.trim()) {
            notify('ERROR', 'Please fill in both subject and message');
            return;
        }
        setSubmitting(true);
        try {
            const res = await supportApi.createTicket({ subject: subject.trim(), message: message.trim() });
            if (res.success && res.data) {
                setTickets(prev => [res.data!, ...prev]);
                setSubject('');
                setMessage('');
                setShowNewTicket(false);
                notify('SUCCESS', 'Support ticket created successfully');
            } else {
                notify('ERROR', res.error || 'Failed to create ticket');
            }
        } catch {
            notify('ERROR', 'Failed to create ticket');
        }
        setSubmitting(false);
    };

    const handleReply = async (ticketId: string) => {
        const text = replyText[ticketId]?.trim();
        if (!text) return;
        setReplying(ticketId);
        try {
            const res = await supportApi.addMessage(ticketId, text);
            if (res.success && res.data) {
                setTickets(prev => prev.map(t =>
                    t.id === ticketId
                        ? { ...t, messages: [...(t.messages || []), res.data!] }
                        : t
                ));
                setReplyText(prev => ({ ...prev, [ticketId]: '' }));
                notify('SUCCESS', 'Reply sent');
            }
        } catch {
            notify('ERROR', 'Failed to send reply');
        }
        setReplying(null);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OPEN': return <AlertCircle size={14} className="text-blue-500" />;
            case 'IN_PROGRESS': return <Clock size={14} className="text-amber-500" />;
            case 'RESOLVED': return <CheckCircle size={14} className="text-green-500" />;
            case 'CLOSED': return <XCircle size={14} className="text-slate-400" />;
            default: return null;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'IN_PROGRESS': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'RESOLVED': return 'bg-green-50 text-green-700 border-green-200';
            case 'CLOSED': return 'bg-slate-50 text-slate-500 border-slate-200';
            default: return 'bg-slate-50 text-slate-500 border-slate-200';
        }
    };

    return (
        <div className="space-y-8">
            {/* Contact Info */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8">
                <div className="flex items-start justify-between flex-col md:flex-row md:items-center space-y-4 md:space-y-0">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-2">Need Help?</h2>
                        <p className="text-green-100 text-sm max-w-md">
                            Submit a support ticket below or reach out directly via email. Our team typically responds within 24 hours.
                        </p>
                    </div>
                    <a
                        href="mailto:contactmike@fiscana.pro"
                        className="flex items-center space-x-2 bg-white/20 backdrop-blur text-white px-5 py-3 rounded-xl font-semibold hover:bg-white/30 transition-colors text-sm"
                    >
                        <Mail size={18} />
                        <span>contactmike@fiscana.pro</span>
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>

            {/* New Ticket Button / Form */}
            {!showNewTicket ? (
                <button
                    onClick={() => setShowNewTicket(true)}
                    className="w-full bg-white rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-green-400 hover:bg-green-50/50 transition-all group"
                >
                    <div className="flex items-center justify-center space-x-2">
                        <Plus size={20} className="text-slate-400 group-hover:text-green-600 transition-colors" />
                        <span className="text-sm font-semibold text-slate-500 group-hover:text-green-700 transition-colors">Submit a New Ticket</span>
                    </div>
                </button>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8">
                    <h3 className="text-md font-bold text-slate-900 mb-4">New Support Ticket</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="Brief description of your issue"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                rows={4}
                                placeholder="Describe your issue in detail..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                            />
                        </div>
                        <div className="flex items-center space-x-3 justify-end">
                            <button
                                onClick={() => { setShowNewTicket(false); setSubject(''); setMessage(''); }}
                                className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitTicket}
                                disabled={submitting}
                                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                <span>{submitting ? 'Submitting...' : 'Submit Ticket'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tickets List */}
            <div className="bg-white rounded-2xl border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <h3 className="text-md font-bold text-slate-900">Your Tickets</h3>
                        <span className="text-xs text-slate-400">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare size={32} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">No support tickets yet</p>
                        <p className="text-xs text-slate-400 mt-1">Submit a ticket if you need any help</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {tickets.map(ticket => (
                            <div key={ticket.id} className="group">
                                <button
                                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                                >
                                    <div className="flex items-center space-x-4 min-w-0">
                                        <div className="flex-shrink-0">{getStatusIcon(ticket.status)}</div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{ticket.subject}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {new Date(ticket.createdAt).toLocaleDateString()} • {ticket.messages?.length || 0} message{(ticket.messages?.length || 0) !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 flex-shrink-0">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyle(ticket.status)}`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                        {expandedTicket === ticket.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                </button>

                                {/* Expanded ticket messages */}
                                {expandedTicket === ticket.id && (
                                    <div className="px-6 pb-6">
                                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 max-h-80 overflow-y-auto">
                                            {(ticket.messages || []).map((msg: TicketMessageType) => (
                                                <div key={msg.id} className={`flex ${msg.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.senderRole === 'USER'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-white text-slate-800 border border-slate-200'
                                                        }`}>
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <span className={`text-xs font-semibold ${msg.senderRole === 'USER' ? 'text-green-100' : 'text-slate-500'}`}>
                                                                {msg.senderName} {msg.senderRole === 'ADMIN' && '(Support)'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                                        <p className={`text-xs mt-1 ${msg.senderRole === 'USER' ? 'text-green-200' : 'text-slate-400'}`}>
                                                            {new Date(msg.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Reply input */}
                                        {ticket.status !== 'CLOSED' && (
                                            <div className="flex items-center space-x-2 mt-3">
                                                <input
                                                    type="text"
                                                    placeholder="Type a reply..."
                                                    value={replyText[ticket.id] || ''}
                                                    onChange={e => setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleReply(ticket.id); }}
                                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                />
                                                <button
                                                    onClick={() => handleReply(ticket.id)}
                                                    disabled={replying === ticket.id || !replyText[ticket.id]?.trim()}
                                                    className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                                                >
                                                    {replying === ticket.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
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
};

export default SettingsPage;
