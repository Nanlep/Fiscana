import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, SMEApplication, SMEApplicationStatus } from '../types';
import { smeFinanceApi } from '../services/apiClient';
import { 
    Building2, FileText, Upload, Loader2, CheckCircle, AlertCircle, 
    Clock, ChevronDown, ChevronUp, Banknote, ShieldCheck, Lock,
    ArrowRight, X
} from 'lucide-react';

interface SMEFinanceProps {
    userProfile: UserProfile | null;
    notify: (type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING', message: string) => void;
}

interface FormData {
    businessName: string;
    businessType: string;
    rcNumber: string;
    businessAddress: string;
    annualRevenue: string;
    loanAmount: string;
    loanPurpose: string;
    repaymentPeriod: string;
    collateralDescription: string;
    guarantorName: string;
    guarantorPhone: string;
    guarantorEmail: string;
    guarantorRelationship: string;
}

const BUSINESS_TYPES = [
    'Sole Proprietorship', 'Partnership', 'Limited Liability Company (LLC)',
    'Public Limited Company (PLC)', 'Cooperative', 'Non-Profit', 'Other'
];

const LOAN_PURPOSES = [
    'Working Capital', 'Equipment Purchase', 'Business Expansion',
    'Inventory Financing', 'Real Estate', 'Technology Investment',
    'Marketing & Advertising', 'Debt Refinancing', 'Staffing', 'Other'
];

const REPAYMENT_PERIODS = [
    { value: '6', label: '6 Months' },
    { value: '12', label: '12 Months' },
    { value: '18', label: '18 Months' },
    { value: '24', label: '24 Months' },
    { value: '36', label: '36 Months' },
    { value: '48', label: '48 Months' },
    { value: '60', label: '60 Months' },
];

const GUARANTOR_RELATIONSHIPS = [
    'Business Partner', 'Family Member', 'Employer', 'Colleague', 'Friend', 'Other'
];

const getStatusColor = (status: SMEApplicationStatus) => {
    switch (status) {
        case 'APPROVED': return 'bg-green-100 text-green-800';
        case 'PENDING': return 'bg-amber-100 text-amber-800';
        case 'DECLINED': return 'bg-red-100 text-red-800';
    }
};

const getStatusIcon = (status: SMEApplicationStatus) => {
    switch (status) {
        case 'APPROVED': return <CheckCircle size={14} />;
        case 'PENDING': return <Clock size={14} />;
        case 'DECLINED': return <AlertCircle size={14} />;
    }
};

const SMEFinance: React.FC<SMEFinanceProps> = ({ userProfile, notify }) => {
    const [applications, setApplications] = useState<SMEApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [expandedApp, setExpandedApp] = useState<string | null>(null);

    // File states
    const [bankStatement, setBankStatement] = useState<File | null>(null);
    const [taxClearance, setTaxClearance] = useState<File | null>(null);
    const [cacDocument, setCacDocument] = useState<File | null>(null);

    const [formData, setFormData] = useState<FormData>({
        businessName: userProfile?.companyName || '',
        businessType: '',
        rcNumber: '',
        businessAddress: '',
        annualRevenue: '',
        loanAmount: '',
        loanPurpose: '',
        repaymentPeriod: '12',
        collateralDescription: '',
        guarantorName: '',
        guarantorPhone: '',
        guarantorEmail: '',
        guarantorRelationship: '',
    });

    const isKYCVerified = userProfile?.kycStatus === 'VERIFIED';

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await smeFinanceApi.myApplications();
            if (res.success && res.data) {
                setApplications(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err) {
            console.error('Failed to fetch SME applications:', err);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isKYCVerified) {
            fetchApplications();
        } else {
            setLoading(false);
        }
    }, [isKYCVerified, fetchApplications]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        const requiredFields = ['businessName', 'businessType', 'businessAddress', 'annualRevenue', 'loanAmount', 'loanPurpose', 'guarantorName', 'guarantorPhone', 'guarantorEmail', 'guarantorRelationship'];
        const missing = requiredFields.filter(f => !formData[f as keyof FormData]);
        if (missing.length > 0) {
            notify('ERROR', 'Please fill in all required fields.');
            return;
        }

        setSubmitting(true);
        try {
            // Convert files to base64 for submission
            const payload: any = {
                ...formData,
                annualRevenue: parseFloat(formData.annualRevenue),
                loanAmount: parseFloat(formData.loanAmount),
                repaymentPeriod: parseInt(formData.repaymentPeriod),
            };

            if (bankStatement) {
                payload.bankStatementData = await fileToBase64(bankStatement);
                payload.bankStatementName = bankStatement.name;
            }
            if (taxClearance) {
                payload.taxClearanceData = await fileToBase64(taxClearance);
                payload.taxClearanceName = taxClearance.name;
            }
            if (cacDocument) {
                payload.cacDocumentData = await fileToBase64(cacDocument);
                payload.cacDocumentName = cacDocument.name;
            }

            const res = await smeFinanceApi.apply(payload);
            if (res.success && res.data) {
                setApplications(prev => [res.data, ...prev]);
                setShowForm(false);
                setFormData({
                    businessName: userProfile?.companyName || '',
                    businessType: '',
                    rcNumber: '',
                    businessAddress: '',
                    annualRevenue: '',
                    loanAmount: '',
                    loanPurpose: '',
                    repaymentPeriod: '12',
                    collateralDescription: '',
                    guarantorName: '',
                    guarantorPhone: '',
                    guarantorEmail: '',
                    guarantorRelationship: '',
                });
                setBankStatement(null);
                setTaxClearance(null);
                setCacDocument(null);
                notify('SUCCESS', 'SME Finance application submitted successfully! You will be notified when it\'s reviewed.');
            } else {
                notify('ERROR', res.error || 'Failed to submit application.');
            }
        } catch (err) {
            notify('ERROR', 'An error occurred while submitting your application.');
        }
        setSubmitting(false);
    };

    // KYC Gate
    if (!isKYCVerified) {
        return (
            <div className="p-4 md:p-8 h-full flex flex-col items-center justify-center space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 text-center max-w-lg mx-auto">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={40} className="text-amber-500" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">SME Finance</h1>
                    <p className="text-slate-500 mb-6 leading-relaxed">
                        To apply for SME Finance/Loans, you need to <strong>complete your KYC verification</strong> first. This ensures we can properly assess your application.
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
                        <ShieldCheck size={16} />
                        <span>
                            KYC Status: <strong className={
                                userProfile?.kycStatus === 'PENDING' ? 'text-amber-600' :
                                userProfile?.kycStatus === 'REJECTED' ? 'text-red-600' :
                                'text-slate-600'
                            }>
                                {userProfile?.kycStatus || 'UNVERIFIED'}
                            </strong>
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    const FileUploadField = ({ label, file, setFile, accept = '.pdf' }: { label: string; file: File | null; setFile: (f: File | null) => void; accept?: string }) => (
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
            <div className={`relative border-2 border-dashed rounded-xl p-4 transition-colors ${file ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}>
                {file ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <FileText size={18} className="text-green-600" />
                            <span className="text-sm font-medium text-green-800 truncate max-w-[200px]">{file.name}</span>
                            <span className="text-xs text-green-600">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button onClick={() => setFile(null)} className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center py-2">
                        <Upload size={24} className="text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">Click to upload PDF</span>
                        <span className="text-xs text-slate-400 mt-1">Max 5MB</span>
                        <input
                            type="file"
                            accept={accept}
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                    if (f.size > 5 * 1024 * 1024) {
                                        notify('ERROR', 'File size must be less than 5MB');
                                        return;
                                    }
                                    setFile(f);
                                }
                            }}
                        />
                    </label>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center">
                        <Banknote size={28} className="mr-2 text-green-600" /> SME Finance
                    </h1>
                    <p className="text-slate-500">Apply for business loans and track your applications</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 flex items-center space-x-2"
                >
                    {showForm ? <X size={18} /> : <ArrowRight size={18} />}
                    <span>{showForm ? 'Cancel' : 'New Application'}</span>
                </button>
            </div>

            {/* Application Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50">
                        <h2 className="text-lg font-bold text-slate-900">SME Finance Application</h2>
                        <p className="text-sm text-slate-500">Fill in all required fields and upload supporting documents</p>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Section 1: Business Information */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center">
                                <Building2 size={16} className="mr-2 text-blue-600" /> Business Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Business Name *</label>
                                    <input name="businessName" value={formData.businessName} onChange={handleChange} required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Business Type *</label>
                                    <select name="businessType" value={formData.businessType} onChange={handleChange} required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
                                        <option value="">Select type...</option>
                                        {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">RC Number</label>
                                    <input name="rcNumber" value={formData.rcNumber} onChange={handleChange} placeholder="e.g. RC1234567"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Business Address *</label>
                                    <input name="businessAddress" value={formData.businessAddress} onChange={handleChange} required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Financial Details */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center">
                                <Banknote size={16} className="mr-2 text-green-600" /> Financial Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Annual Revenue (₦) *</label>
                                    <input name="annualRevenue" type="number" value={formData.annualRevenue} onChange={handleChange} required min="0"
                                        placeholder="e.g. 50000000"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Loan Amount Requested (₦) *</label>
                                    <input name="loanAmount" type="number" value={formData.loanAmount} onChange={handleChange} required min="0"
                                        placeholder="e.g. 10000000"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Purpose of Loan *</label>
                                    <select name="loanPurpose" value={formData.loanPurpose} onChange={handleChange} required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
                                        <option value="">Select purpose...</option>
                                        {LOAN_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Repayment Period *</label>
                                    <select name="repaymentPeriod" value={formData.repaymentPeriod} onChange={handleChange} required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
                                        {REPAYMENT_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Collateral Description</label>
                                    <textarea name="collateralDescription" value={formData.collateralDescription} onChange={handleChange}
                                        rows={2} placeholder="Describe any collateral you can provide (property, equipment, etc.)"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none" />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Document Uploads */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center">
                                <FileText size={16} className="mr-2 text-purple-600" /> Supporting Documents (PDF)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FileUploadField label="Bank Statement" file={bankStatement} setFile={setBankStatement} />
                                <FileUploadField label="Tax Clearance Certificate" file={taxClearance} setFile={setTaxClearance} />
                                <FileUploadField label="CAC Registration Document" file={cacDocument} setFile={setCacDocument} />
                            </div>
                        </div>

                        {/* Section 4: Guarantor Information */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center">
                                <ShieldCheck size={16} className="mr-2 text-amber-600" /> Guarantor Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Guarantor Full Name *</label>
                                    <input name="guarantorName" value={formData.guarantorName} onChange={handleChange} required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Guarantor Phone *</label>
                                    <input name="guarantorPhone" value={formData.guarantorPhone} onChange={handleChange} required type="tel"
                                        placeholder="+234..."
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Guarantor Email *</label>
                                    <input name="guarantorEmail" value={formData.guarantorEmail} onChange={handleChange} required type="email"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Relationship *</label>
                                    <select name="guarantorRelationship" value={formData.guarantorRelationship} onChange={handleChange} required
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none">
                                        <option value="">Select relationship...</option>
                                        {GUARANTOR_RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {submitting ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                            <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
                        </button>
                    </div>
                </form>
            )}

            {/* Applications List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">My Applications</h2>
                    <p className="text-sm text-slate-500">Track the status of your SME finance applications</p>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Loading applications...</p>
                    </div>
                ) : applications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No Applications Yet</h3>
                        <p className="text-slate-500 text-sm">Click "New Application" to apply for SME Finance.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {applications.map(app => (
                            <div key={app.id} className="hover:bg-slate-50 transition-colors">
                                <div 
                                    className="p-5 flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="p-2 bg-slate-100 rounded-xl">
                                            <Building2 size={20} className="text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">{app.businessName}</p>
                                            <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                                                <span>₦{app.loanAmount.toLocaleString()}</span>
                                                <span>•</span>
                                                <span>{app.loanPurpose}</span>
                                                <span>•</span>
                                                <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className={`flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full ${getStatusColor(app.status)}`}>
                                            {getStatusIcon(app.status)}
                                            <span>{app.status}</span>
                                        </span>
                                        {expandedApp === app.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                </div>

                                {expandedApp === app.id && (
                                    <div className="px-5 pb-5">
                                        <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-slate-500">Business Type</span>
                                                <p className="font-medium text-slate-900">{app.businessType}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">RC Number</span>
                                                <p className="font-medium text-slate-900">{app.rcNumber || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Annual Revenue</span>
                                                <p className="font-medium text-slate-900">₦{app.annualRevenue.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Repayment Period</span>
                                                <p className="font-medium text-slate-900">{app.repaymentPeriod} Months</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Guarantor</span>
                                                <p className="font-medium text-slate-900">{app.guarantorName}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Guarantor Contact</span>
                                                <p className="font-medium text-slate-900">{app.guarantorPhone}</p>
                                            </div>
                                            {app.collateralDescription && (
                                                <div className="md:col-span-3">
                                                    <span className="text-slate-500">Collateral</span>
                                                    <p className="font-medium text-slate-900">{app.collateralDescription}</p>
                                                </div>
                                            )}
                                            {app.adminNote && (
                                                <div className="md:col-span-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                                    <span className="text-blue-600 text-xs font-bold uppercase">Admin Note</span>
                                                    <p className="font-medium text-blue-900 mt-1">{app.adminNote}</p>
                                                </div>
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
};

export default SMEFinance;
