import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, SMEApplication, SMEApplicationStatus } from '../types';
import { smeFinanceApi } from '../services/apiClient';
import { 
    Building2, FileText, Upload, Loader2, CheckCircle, AlertCircle, 
    Clock, ChevronDown, ChevronUp, Banknote, ShieldCheck, Lock,
    ArrowRight, X, User, Briefcase, CreditCard, FolderOpen, Shield, PenLine
} from 'lucide-react';

interface SMEFinanceProps {
    userProfile: UserProfile | null;
    notify: (type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING', message: string) => void;
    onNavigateBilling?: () => void;
}

interface FormData {
    // Section 1: Business Information
    businessName: string;
    rcNumber: string;
    registeredWithCAC: string;
    businessType: string;
    industrySector: string;
    businessAddress: string;
    state: string;
    yearEstablished: string;
    numberOfEmployees: string;
    contactPersonName: string;
    contactPhone: string;
    contactEmail: string;
    // Section 2: Owner/Director Details
    ownerFullName: string;
    ownerDOB: string;
    ownerGender: string;
    ownerBVN: string;
    ownerNationalId: string;
    ownerResidentialAddress: string;
    ownerPercentageOwnership: string;
    ownerPhone: string;
    ownerEmail: string;
    // Section 3: Business Operations
    businessActivities: string;
    productsServices: string;
    majorCustomers: string;
    hasExistingContracts: string;
    monthlySalesRevenue: string;
    monthlyExpenses: string;
    monthlyProfitEstimate: string;
    // Section 4: Loan Request Details
    loanAmount: string;
    loanPurpose: string;
    loanTenorMonths: string;
    expectedMonthlyRepayment: string;
    hasPreviousLoan: string;
    previousLoanSource: string;
    previousLoanStatus: string;
    // Section 5: Financial Records
    keepsFinancialRecords: string;
    hasBankStatements: string;
    hasFinancialStatements: string;
    hasTIN: string;
    primaryBankName: string;
    bankAccountNumber: string;
    // Section 6: Collateral / Guarantee
    hasCollateral: string;
    collateralType: string;
    collateralEstimatedValue: string;
    willingToProvideGuarantor: string;
    // Declaration
    applicantDeclarationName: string;
    declarationDate: string;
    declarationAgreed: boolean;
}

const INITIAL_FORM: FormData = {
    businessName: '', rcNumber: '', registeredWithCAC: '', businessType: '',
    industrySector: '', businessAddress: '', state: '', yearEstablished: '',
    numberOfEmployees: '', contactPersonName: '', contactPhone: '', contactEmail: '',
    ownerFullName: '', ownerDOB: '', ownerGender: '', ownerBVN: '', ownerNationalId: '',
    ownerResidentialAddress: '', ownerPercentageOwnership: '', ownerPhone: '', ownerEmail: '',
    businessActivities: '', productsServices: '', majorCustomers: '', hasExistingContracts: '',
    monthlySalesRevenue: '', monthlyExpenses: '', monthlyProfitEstimate: '',
    loanAmount: '', loanPurpose: '', loanTenorMonths: '', expectedMonthlyRepayment: '',
    hasPreviousLoan: '', previousLoanSource: '', previousLoanStatus: '',
    keepsFinancialRecords: '', hasBankStatements: '', hasFinancialStatements: '',
    hasTIN: '', primaryBankName: '', bankAccountNumber: '',
    hasCollateral: '', collateralType: '', collateralEstimatedValue: '', willingToProvideGuarantor: '',
    applicantDeclarationName: '', declarationDate: '', declarationAgreed: false,
};

const BUSINESS_TYPES = ['Sole Proprietorship', 'Partnership', 'Limited Company'];
const LOAN_PURPOSES = ['Working Capital', 'Asset Purchase', 'Expansion', 'Inventory', 'Invoice', 'Others'];
const COLLATERAL_TYPES = ['Land/Property', 'Equipment', 'Inventory', 'None'];
const NIGERIAN_STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River',
    'Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano',
    'Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun',
    'Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'
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

const SMEFinance: React.FC<SMEFinanceProps> = ({ userProfile, notify, onNavigateBilling }) => {
    const [applications, setApplications] = useState<SMEApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [expandedApp, setExpandedApp] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [draftRestored, setDraftRestored] = useState(false);

    // File states
    const [cacDocument, setCacDocument] = useState<File | null>(null);
    const [validId, setValidId] = useState<File | null>(null);
    const [bankStatement, setBankStatement] = useState<File | null>(null);
    const [utilityBill, setUtilityBill] = useState<File | null>(null);
    const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
    const [tinDocument, setTinDocument] = useState<File | null>(null);
    const [collateralDocument, setCollateralDocument] = useState<File | null>(null);

    const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM, businessName: userProfile?.companyName || '' });

    // ==================== DRAFT AUTO-SAVE ====================
    const DRAFT_KEY = `fiscana_sme_draft_${userProfile?.email || 'anonymous'}`;
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRestoringRef = useRef(false);

    const saveDraft = useCallback((data: FormData, step: number) => {
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData: data, currentStep: step, savedAt: new Date().toISOString() }));
        } catch (e) { console.warn('Failed to save SME form draft:', e); }
    }, [DRAFT_KEY]);

    const loadDraft = useCallback((): { formData: FormData; currentStep: number } | null => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.formData) return { formData: parsed.formData, currentStep: parsed.currentStep || 1 };
            }
        } catch (e) { console.warn('Failed to load SME form draft:', e); }
        return null;
    }, [DRAFT_KEY]);

    const clearDraft = useCallback(() => {
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
        setDraftRestored(false);
    }, [DRAFT_KEY]);

    const hasDraft = useCallback((): boolean => {
        try { return !!localStorage.getItem(DRAFT_KEY); } catch { return false; }
    }, [DRAFT_KEY]);

    // Auto-save formData changes (debounced 500ms)
    useEffect(() => {
        if (!showForm || isRestoringRef.current) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveDraft(formData, currentStep), 500);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [formData, currentStep, showForm, saveDraft]);

    // Restore draft when form opens
    useEffect(() => {
        if (showForm) {
            const draft = loadDraft();
            if (draft) {
                isRestoringRef.current = true;
                setFormData(draft.formData);
                setCurrentStep(draft.currentStep);
                setDraftRestored(true);
                // Allow auto-save after restoration settles
                setTimeout(() => { isRestoringRef.current = false; }, 100);
            }
        } else {
            setDraftRestored(false);
        }
    }, [showForm, loadDraft]);

    const discardDraft = () => {
        clearDraft();
        setFormData({ ...INITIAL_FORM, businessName: userProfile?.companyName || '' });
        setCurrentStep(1);
        setCacDocument(null); setValidId(null); setBankStatement(null);
        setUtilityBill(null); setPassportPhoto(null); setTinDocument(null);
        setCollateralDocument(null);
        notify('INFO', 'Draft discarded. Starting fresh.');
    };

    const isKYCVerified = userProfile?.kycStatus === 'VERIFIED';
    const hasAnnualPlan = userProfile?.subscriptionTier === 'ANNUAL' || userProfile?.subscriptionTier === 'SANDBOX';

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await smeFinanceApi.myApplications();
            if (res.success && res.data) {
                setApplications(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err) { console.error('Failed to fetch SME applications:', err); }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isKYCVerified) fetchApplications();
        else setLoading(false);
    }, [isKYCVerified, fetchApplications]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
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
        if (!formData.declarationAgreed) {
            notify('ERROR', 'Please agree to the declaration before submitting.');
            return;
        }
        if (!formData.businessName || !formData.businessType || !formData.businessAddress || !formData.loanAmount || !formData.loanPurpose) {
            notify('ERROR', 'Please fill in all required fields (Business Name, Type, Address, Loan Amount, Purpose).');
            return;
        }
        setSubmitting(true);
        try {
            const payload: any = { ...formData };
            // Convert booleans
            payload.registeredWithCAC = formData.registeredWithCAC === 'Yes';
            payload.hasExistingContracts = formData.hasExistingContracts === 'Yes';
            payload.hasPreviousLoan = formData.hasPreviousLoan === 'Yes';
            payload.keepsFinancialRecords = formData.keepsFinancialRecords === 'Yes';
            payload.hasBankStatements = formData.hasBankStatements === 'Yes';
            payload.hasFinancialStatements = formData.hasFinancialStatements === 'Yes';
            payload.hasTIN = formData.hasTIN === 'Yes';
            payload.hasCollateral = formData.hasCollateral === 'Yes';
            payload.willingToProvideGuarantor = formData.willingToProvideGuarantor === 'Yes';
            // Convert numerics
            if (formData.loanAmount) payload.loanAmount = parseFloat(formData.loanAmount);
            if (formData.monthlySalesRevenue) payload.monthlySalesRevenue = parseFloat(formData.monthlySalesRevenue);
            if (formData.monthlyExpenses) payload.monthlyExpenses = parseFloat(formData.monthlyExpenses);
            if (formData.monthlyProfitEstimate) payload.monthlyProfitEstimate = parseFloat(formData.monthlyProfitEstimate);
            if (formData.expectedMonthlyRepayment) payload.expectedMonthlyRepayment = parseFloat(formData.expectedMonthlyRepayment);
            if (formData.loanTenorMonths) payload.loanTenorMonths = parseInt(formData.loanTenorMonths);
            // Upload files as base64
            if (cacDocument) { payload.cacDocumentData = await fileToBase64(cacDocument); payload.cacDocumentName = cacDocument.name; }
            if (validId) { payload.validIdData = await fileToBase64(validId); payload.validIdName = validId.name; }
            if (bankStatement) { payload.bankStatementData = await fileToBase64(bankStatement); payload.bankStatementName = bankStatement.name; }
            if (utilityBill) { payload.utilityBillData = await fileToBase64(utilityBill); payload.utilityBillName = utilityBill.name; }
            if (passportPhoto) { payload.passportPhotoData = await fileToBase64(passportPhoto); payload.passportPhotoName = passportPhoto.name; }
            if (tinDocument) { payload.tinDocumentData = await fileToBase64(tinDocument); payload.tinDocumentName = tinDocument.name; }
            if (collateralDocument) { payload.collateralDocumentData = await fileToBase64(collateralDocument); payload.collateralDocumentName = collateralDocument.name; }

            const res = await smeFinanceApi.apply(payload);
            if (res.success && res.data) {
                clearDraft();
                setApplications(prev => [res.data, ...prev]);
                setShowForm(false);
                setCurrentStep(1);
                setFormData({ ...INITIAL_FORM, businessName: userProfile?.companyName || '' });
                setCacDocument(null); setValidId(null); setBankStatement(null);
                setUtilityBill(null); setPassportPhoto(null); setTinDocument(null);
                setCollateralDocument(null);
                notify('SUCCESS', 'SME Finance application submitted successfully! You will be notified when it\'s reviewed.');
            } else {
                notify('ERROR', res.error || 'Failed to submit application.');
            }
        } catch (err) {
            notify('ERROR', 'An error occurred while submitting your application.');
        }
        setSubmitting(false);
    };

    // ==================== GATES ====================

    if (!hasAnnualPlan) {
        return (
            <div className="p-4 md:p-8 h-full flex flex-col items-center justify-center space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 text-center max-w-lg mx-auto">
                    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Banknote size={40} className="text-purple-500" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Annual Plan Required</h1>
                    <p className="text-slate-500 mb-6 leading-relaxed">
                        SME Finance is an <strong>exclusive feature</strong> available only to users on the <strong>Annual Plan (₦24,900/year)</strong>. 
                        Upgrade your subscription to access business loans and financing options.
                    </p>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
                        <p className="text-sm font-semibold text-green-800 mb-1">🎯 Annual Plan Benefits</p>
                        <ul className="text-xs text-green-700 space-y-1 text-left">
                            <li>✓ Access to SME Finance & Loan Applications</li>
                            <li>✓ Save ₦5,100 vs monthly billing</li>
                            <li>✓ All premium features included</li>
                        </ul>
                    </div>
                    {onNavigateBilling && (
                        <button onClick={onNavigateBilling}
                            className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 flex items-center space-x-2 mx-auto">
                            <ArrowRight size={18} /><span>Upgrade to Annual Plan</span>
                        </button>
                    )}
                    <p className="text-xs text-slate-400 mt-4">
                        Current Plan: <strong className="text-slate-600">{userProfile?.subscriptionTier || 'TRIAL'}</strong>
                    </p>
                </div>
            </div>
        );
    }

    if (!isKYCVerified) {
        return (
            <div className="p-4 md:p-8 h-full flex flex-col items-center justify-center space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 text-center max-w-lg mx-auto">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={40} className="text-amber-500" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">SME Finance</h1>
                    <p className="text-slate-500 mb-6 leading-relaxed">
                        To apply for SME Finance/Loans, you need to <strong>complete your KYC verification</strong> first.
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
                        <ShieldCheck size={16} />
                        <span>KYC Status: <strong className={
                            userProfile?.kycStatus === 'PENDING' ? 'text-amber-600' :
                            userProfile?.kycStatus === 'REJECTED' ? 'text-red-600' : 'text-slate-600'
                        }>{userProfile?.kycStatus || 'UNVERIFIED'}</strong></span>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== REUSABLE COMPONENTS ====================

    const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm";
    const selectClass = inputClass;
    const labelClass = "block text-sm font-semibold text-slate-700 mb-1";

    const FileUploadField = ({ label, file, setFile, accept = '.pdf,.jpg,.jpeg,.png' }: { label: string; file: File | null; setFile: (f: File | null) => void; accept?: string }) => (
        <div>
            <label className={labelClass}>{label}</label>
            <div className={`relative border-2 border-dashed rounded-xl p-3 transition-colors ${file ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}>
                {file ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <FileText size={16} className="text-green-600" />
                            <span className="text-xs font-medium text-green-800 truncate max-w-[150px]">{file.name}</span>
                            <span className="text-xs text-green-600">({(file.size / 1024).toFixed(0)}KB)</span>
                        </div>
                        <button onClick={() => setFile(null)} className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                    </div>
                ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center py-1">
                        <Upload size={20} className="text-slate-400 mb-1" />
                        <span className="text-xs text-slate-500">Click to upload</span>
                        <span className="text-[10px] text-slate-400">Max 5MB</span>
                        <input type="file" accept={accept} className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                    if (f.size > 5 * 1024 * 1024) { notify('ERROR', 'File size must be less than 5MB'); return; }
                                    setFile(f);
                                }
                            }} />
                    </label>
                )}
            </div>
        </div>
    );

    const SectionHeader = ({ icon: Icon, title, color }: { icon: any; title: string; color: string }) => (
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center">
            <Icon size={16} className={`mr-2 ${color}`} /> {title}
        </h3>
    );

    const STEPS = [
        { num: 1, label: 'Business Info', icon: Building2 },
        { num: 2, label: 'Owner Details', icon: User },
        { num: 3, label: 'Operations', icon: Briefcase },
        { num: 4, label: 'Loan Request', icon: CreditCard },
        { num: 5, label: 'Financial Records', icon: FolderOpen },
        { num: 6, label: 'Collateral', icon: Shield },
        { num: 7, label: 'Documents', icon: FileText },
        { num: 8, label: 'Declaration', icon: PenLine },
    ];

    const renderStepIndicator = () => (
        <div className="flex items-center overflow-x-auto pb-2 mb-6 px-1 gap-1">
            {STEPS.map((s, i) => (
                <React.Fragment key={s.num}>
                    <button
                        type="button"
                        onClick={() => setCurrentStep(s.num)}
                        className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                            currentStep === s.num ? 'bg-green-600 text-white shadow-md' :
                            currentStep > s.num ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        <s.icon size={14} />
                        <span className="hidden md:inline">{s.label}</span>
                        <span className="md:hidden">{s.num}</span>
                    </button>
                    {i < STEPS.length - 1 && <div className="w-4 h-px bg-slate-300 flex-shrink-0" />}
                </React.Fragment>
            ))}
        </div>
    );

    // ==================== FORM STEPS ====================

    const renderStep1 = () => (
        <div>
            <SectionHeader icon={Building2} title="Section 1: Business Information" color="text-blue-600" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Business Name *</label>
                    <input name="businessName" value={formData.businessName} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>RC Number (if registered)</label>
                    <input name="rcNumber" value={formData.rcNumber} onChange={handleChange} placeholder="e.g. RC1234567" className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Registered with CAC *</label>
                    <select name="registeredWithCAC" value={formData.registeredWithCAC} onChange={handleChange} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Business Type *</label>
                    <select name="businessType" value={formData.businessType} onChange={handleChange} required className={selectClass}>
                        <option value="">Select type...</option>
                        {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Industry/Sector</label>
                    <input name="industrySector" value={formData.industrySector} onChange={handleChange} placeholder="e.g. Agriculture, Retail" className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>State</label>
                    <select name="state" value={formData.state} onChange={handleChange} className={selectClass}>
                        <option value="">Select state...</option>
                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className={labelClass}>Business Address *</label>
                    <input name="businessAddress" value={formData.businessAddress} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Year Established</label>
                    <input name="yearEstablished" value={formData.yearEstablished} onChange={handleChange} placeholder="e.g. 2020" type="number" min="1900" max={new Date().getFullYear()} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Number of Employees</label>
                    <input name="numberOfEmployees" value={formData.numberOfEmployees} onChange={handleChange} placeholder="e.g. 15" className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Contact Person Name</label>
                    <input name="contactPersonName" value={formData.contactPersonName} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Phone Number</label>
                    <input name="contactPhone" value={formData.contactPhone} onChange={handleChange} type="tel" placeholder="+234..." className={inputClass} />
                </div>
                <div className="md:col-span-2">
                    <label className={labelClass}>Email Address</label>
                    <input name="contactEmail" value={formData.contactEmail} onChange={handleChange} type="email" className={inputClass} />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div>
            <SectionHeader icon={User} title="Section 2: Owner / Director Details" color="text-purple-600" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Full Name</label>
                    <input name="ownerFullName" value={formData.ownerFullName} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Date of Birth</label>
                    <input name="ownerDOB" value={formData.ownerDOB} onChange={handleChange} type="date" className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Gender</label>
                    <select name="ownerGender" value={formData.ownerGender} onChange={handleChange} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>BVN</label>
                    <input name="ownerBVN" value={formData.ownerBVN} onChange={handleChange} placeholder="11-digit BVN" maxLength={11} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>National ID / Passport No</label>
                    <input name="ownerNationalId" value={formData.ownerNationalId} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Percentage Ownership (%)</label>
                    <input name="ownerPercentageOwnership" value={formData.ownerPercentageOwnership} onChange={handleChange} type="number" min="0" max="100" className={inputClass} />
                </div>
                <div className="md:col-span-2">
                    <label className={labelClass}>Residential Address</label>
                    <input name="ownerResidentialAddress" value={formData.ownerResidentialAddress} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Phone Number</label>
                    <input name="ownerPhone" value={formData.ownerPhone} onChange={handleChange} type="tel" placeholder="+234..." className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Email</label>
                    <input name="ownerEmail" value={formData.ownerEmail} onChange={handleChange} type="email" className={inputClass} />
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div>
            <SectionHeader icon={Briefcase} title="Section 3: Business Operations" color="text-indigo-600" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className={labelClass}>Describe your business activities</label>
                    <textarea name="businessActivities" value={formData.businessActivities} onChange={handleChange} rows={3}
                        placeholder="Brief description of what your business does..."
                        className={inputClass + " resize-none"} />
                </div>
                <div className="md:col-span-2">
                    <label className={labelClass}>What products/services do you offer?</label>
                    <textarea name="productsServices" value={formData.productsServices} onChange={handleChange} rows={2}
                        className={inputClass + " resize-none"} />
                </div>
                <div>
                    <label className={labelClass}>Major Customers</label>
                    <select name="majorCustomers" value={formData.majorCustomers} onChange={handleChange} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="Retail">Retail</option>
                        <option value="Corporate">Corporate</option>
                        <option value="Government">Government</option>
                        <option value="Export">Export</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Existing contracts or purchase orders?</label>
                    <select name="hasExistingContracts" value={formData.hasExistingContracts} onChange={handleChange} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Monthly Sales Revenue (₦)</label>
                    <input name="monthlySalesRevenue" value={formData.monthlySalesRevenue} onChange={handleChange} type="number" min="0"
                        placeholder="e.g. 500000" className={inputClass + " font-mono"} />
                </div>
                <div>
                    <label className={labelClass}>Monthly Expenses (₦)</label>
                    <input name="monthlyExpenses" value={formData.monthlyExpenses} onChange={handleChange} type="number" min="0"
                        placeholder="e.g. 300000" className={inputClass + " font-mono"} />
                </div>
                <div className="md:col-span-2">
                    <label className={labelClass}>Profit Estimate (Monthly) (₦)</label>
                    <input name="monthlyProfitEstimate" value={formData.monthlyProfitEstimate} onChange={handleChange} type="number" min="0"
                        placeholder="e.g. 200000" className={inputClass + " font-mono"} />
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div>
            <SectionHeader icon={CreditCard} title="Section 4: Loan Request Details" color="text-green-600" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Loan Amount Requested (₦) *</label>
                    <input name="loanAmount" value={formData.loanAmount} onChange={handleChange} required type="number" min="0"
                        placeholder="e.g. 5000000" className={inputClass + " font-mono"} />
                </div>
                <div>
                    <label className={labelClass}>Purpose of Loan *</label>
                    <select name="loanPurpose" value={formData.loanPurpose} onChange={handleChange} required className={selectClass}>
                        <option value="">Select purpose...</option>
                        {LOAN_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Loan Tenor (Months)</label>
                    <input name="loanTenorMonths" value={formData.loanTenorMonths} onChange={handleChange} type="number" min="1" max="120"
                        placeholder="e.g. 12" className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Expected Monthly Repayment (₦)</label>
                    <input name="expectedMonthlyRepayment" value={formData.expectedMonthlyRepayment} onChange={handleChange} type="number" min="0"
                        placeholder="e.g. 500000" className={inputClass + " font-mono"} />
                </div>
                <div>
                    <label className={labelClass}>Have you taken a loan before?</label>
                    <select name="hasPreviousLoan" value={formData.hasPreviousLoan} onChange={handleChange} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>
                {formData.hasPreviousLoan === 'Yes' && (
                    <>
                        <div>
                            <label className={labelClass}>If Yes, from where?</label>
                            <input name="previousLoanSource" value={formData.previousLoanSource} onChange={handleChange} placeholder="Bank name or institution" className={inputClass} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelClass}>Status</label>
                            <select name="previousLoanStatus" value={formData.previousLoanStatus} onChange={handleChange} className={selectClass}>
                                <option value="">Select status...</option>
                                <option value="Active">Active</option>
                                <option value="Repaid">Repaid</option>
                                <option value="Defaulted">Defaulted</option>
                            </select>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div>
            <SectionHeader icon={FolderOpen} title="Section 5: Financial Records" color="text-orange-600" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Do you keep financial records?</label>
                    <select name="keepsFinancialRecords" value={formData.keepsFinancialRecords} onChange={handleChange} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Bank Statements (6–12 months)?</label>
                    <select name="hasBankStatements" value={formData.hasBankStatements} onChange={handleChange} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Financial Statements?</label>
                    <select name="hasFinancialStatements" value={formData.hasFinancialStatements} onChange={handleChange} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Tax Identification Number (TIN)?</label>
                    <select name="hasTIN" value={formData.hasTIN} onChange={handleChange} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Primary Bank Name</label>
                    <input name="primaryBankName" value={formData.primaryBankName} onChange={handleChange} placeholder="e.g. First Bank" className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Account Number</label>
                    <input name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} placeholder="10-digit account number" maxLength={10} className={inputClass + " font-mono"} />
                </div>
            </div>
        </div>
    );

    const renderStep6 = () => (
        <div>
            <SectionHeader icon={Shield} title="Section 6: Collateral / Guarantee" color="text-red-600" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Do you have collateral?</label>
                    <select name="hasCollateral" value={formData.hasCollateral} onChange={handleChange} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>
                {formData.hasCollateral === 'Yes' && (
                    <>
                        <div>
                            <label className={labelClass}>Type of Collateral</label>
                            <select name="collateralType" value={formData.collateralType} onChange={handleChange} className={selectClass}>
                                <option value="">Select type...</option>
                                {COLLATERAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Estimated Value (₦)</label>
                            <input name="collateralEstimatedValue" value={formData.collateralEstimatedValue} onChange={handleChange} placeholder="e.g. 10,000,000" className={inputClass + " font-mono"} />
                        </div>
                    </>
                )}
                <div>
                    <label className={labelClass}>Willing to provide a guarantor?</label>
                    <select name="willingToProvideGuarantor" value={formData.willingToProvideGuarantor} onChange={handleChange} className={selectClass}>
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>
            </div>
        </div>
    );

    const renderStep7 = () => (
        <div>
            <SectionHeader icon={FileText} title="Section 7: Document Uploads" color="text-purple-600" />
            <p className="text-xs text-slate-500 mb-4">Upload supporting documents (PDF, JPG, PNG — max 5MB each)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FileUploadField label="CAC Document" file={cacDocument} setFile={setCacDocument} />
                <FileUploadField label="Valid ID (NIN/Voter's Card/Driver's License/Passport)" file={validId} setFile={setValidId} />
                <FileUploadField label="Bank Statement" file={bankStatement} setFile={setBankStatement} />
                <FileUploadField label="Utility Bill (≤3 months old)" file={utilityBill} setFile={setUtilityBill} />
                <FileUploadField label="Passport Photograph" file={passportPhoto} setFile={setPassportPhoto} accept=".jpg,.jpeg,.png" />
                <FileUploadField label="TIN Document" file={tinDocument} setFile={setTinDocument} />
                <FileUploadField label="Collateral Document (Proof of Ownership)" file={collateralDocument} setFile={setCollateralDocument} />
            </div>
        </div>
    );

    const renderStep8 = () => (
        <div>
            <SectionHeader icon={PenLine} title="Declaration" color="text-slate-800" />
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                    I hereby declare that the information provided is true and accurate to the best of my knowledge.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className={labelClass}>Applicant Name *</label>
                    <input name="applicantDeclarationName" value={formData.applicantDeclarationName} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Date *</label>
                    <input name="declarationDate" value={formData.declarationDate} onChange={handleChange} type="date" required className={inputClass} />
                </div>
            </div>
            <label className="flex items-start space-x-3 cursor-pointer">
                <input type="checkbox" name="declarationAgreed" checked={formData.declarationAgreed}
                    onChange={(e) => setFormData(prev => ({ ...prev, declarationAgreed: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500" />
                <span className="text-sm text-slate-700">
                    I confirm that all information provided is accurate and I authorize Fiscana to process my SME Finance application.
                </span>
            </label>
        </div>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            case 6: return renderStep6();
            case 7: return renderStep7();
            case 8: return renderStep8();
            default: return null;
        }
    };

    // ==================== MAIN RENDER ====================

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
                <button onClick={() => { if (showForm) { setShowForm(false); setCurrentStep(1); } else { setShowForm(true); } }}
                    className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 flex items-center space-x-2">
                    {showForm ? <X size={18} /> : <ArrowRight size={18} />}
                    <span>{showForm ? 'Cancel' : (hasDraft() ? 'Resume Application' : 'New Application')}</span>
                </button>
            </div>

            {/* Application Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">SME Finance Application & Pre-Qualification Form</h2>
                                <p className="text-sm text-slate-500">Complete all sections below. Fields marked with * are required.</p>
                            </div>
                            {showForm && <span className="text-xs text-green-600 bg-green-100 px-2.5 py-1 rounded-full font-semibold flex items-center space-x-1"><CheckCircle size={12} /><span>Auto-saved</span></span>}
                        </div>
                        {draftRestored && (
                            <div className="mt-3 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                                <div className="flex items-center space-x-2">
                                    <Clock size={14} className="text-blue-600" />
                                    <span className="text-xs font-medium text-blue-800">Your previous progress has been restored.</span>
                                </div>
                                <button type="button" onClick={discardDraft}
                                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline transition-colors">
                                    Discard & Start Fresh
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="p-6">
                        {renderStepIndicator()}
                        <div className="min-h-[300px]">
                            {renderCurrentStep()}
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                        <button type="button" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1}
                            className="px-5 py-2.5 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            ← Previous
                        </button>

                        <span className="text-xs text-slate-400 font-medium">Step {currentStep} of {STEPS.length}</span>

                        {currentStep < STEPS.length ? (
                            <button type="button" onClick={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}
                                className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20">
                                Next →
                            </button>
                        ) : (
                            <button type="submit" disabled={submitting}
                                className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
                                {submitting ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                                <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
                            </button>
                        )}
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
                                <div className="p-5 flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}>
                                    <div className="flex items-center space-x-4">
                                        <div className="p-2 bg-slate-100 rounded-xl"><Building2 size={20} className="text-slate-600" /></div>
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
                                            {getStatusIcon(app.status)}<span>{app.status}</span>
                                        </span>
                                        {expandedApp === app.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                </div>
                                {expandedApp === app.id && (
                                    <div className="px-5 pb-5">
                                        <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div><span className="text-slate-500">Business Type</span><p className="font-medium text-slate-900">{app.businessType}</p></div>
                                            <div><span className="text-slate-500">RC Number</span><p className="font-medium text-slate-900">{app.rcNumber || 'N/A'}</p></div>
                                            <div><span className="text-slate-500">State</span><p className="font-medium text-slate-900">{app.state || 'N/A'}</p></div>
                                            <div><span className="text-slate-500">Industry</span><p className="font-medium text-slate-900">{app.industrySector || 'N/A'}</p></div>
                                            <div><span className="text-slate-500">Loan Tenor</span><p className="font-medium text-slate-900">{app.loanTenorMonths || app.repaymentPeriod} Months</p></div>
                                            <div><span className="text-slate-500">Monthly Revenue</span><p className="font-medium text-slate-900">{app.monthlySalesRevenue ? `₦${app.monthlySalesRevenue.toLocaleString()}` : 'N/A'}</p></div>
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
