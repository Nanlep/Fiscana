
import React, { useState } from 'react';
import { Plus, Send, Download, CreditCard, Bitcoin, CheckCircle, Calculator, FileCheck, Loader2, PieChart, X, AlertCircle, Wallet } from 'lucide-react';
import { Invoice, InvoiceStatus, PaymentMethod, Transaction, TransactionType, UserProfile } from '../types';
import { calculateInvoiceTotals } from '../utils/tax';
import { formatCurrency } from '../utils/currency';

interface InvoicesProps {
    invoices: Invoice[];
    user: UserProfile | null;
    addInvoice: (inv: Invoice) => void;
    addTransaction: (t: Transaction) => void;
    recordPayment: (id: string, amount: number, date: string, note?: string) => void;
    notify: (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => void;
}

declare global {
    interface Window {
        html2pdf: any;
    }
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, user, addInvoice, addTransaction, recordPayment, notify }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Payment Recording Modal State
    const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean, invoiceId: string, balance: number, currency: string }>({ isOpen: false, invoiceId: '', balance: 0, currency: 'NGN' });
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNote, setPaymentNote] = useState('');

    // Create Form State
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([PaymentMethod.FIAT_NGN]);
    const [addVat, setAddVat] = useState(true);
    const [expectWht, setExpectWht] = useState(false);

    // Payment Details State
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [walletAddress, setWalletAddress] = useState('');

    const toggleMethod = (method: PaymentMethod) => {
        if (paymentMethods.includes(method)) {
            setPaymentMethods(paymentMethods.filter(m => m !== method));
        } else {
            setPaymentMethods([...paymentMethods, method]);
        }
    };

    // Calculations
    const subTotal = parseFloat(amount) || 0;
    const { vat, wht, totalReceivable } = calculateInvoiceTotals(subTotal, addVat, expectWht, 'INDIVIDUAL');

    const handleCreate = async () => {
        if (!clientName || !amount) {
            notify('ERROR', 'Please fill in Client Name and Amount');
            return;
        }

        // Validate that at least one payment method has details
        const hasBankDetails = paymentMethods.includes(PaymentMethod.FIAT_NGN) && bankName && accountNumber && accountName;
        const hasWalletDetails = paymentMethods.includes(PaymentMethod.CRYPTO_USDT) && walletAddress;

        if (paymentMethods.includes(PaymentMethod.FIAT_NGN) && (!bankName || !accountNumber || !accountName)) {
            notify('ERROR', 'Please fill in your bank account details for Bank Transfer');
            return;
        }
        if (paymentMethods.includes(PaymentMethod.CRYPTO_USDT) && !walletAddress) {
            notify('ERROR', 'Please fill in your USDT wallet address');
            return;
        }
        if (!hasBankDetails && !hasWalletDetails) {
            notify('ERROR', 'Please select a payment channel and fill in the details');
            return;
        }

        setIsGenerating(true);

        try {
            const items = [{
                id: '1',
                description,
                quantity: 1,
                unitPrice: subTotal
            }];

            const invoiceId = Math.random().toString(36).substr(2, 9).toUpperCase();
            const issueDate = new Date().toISOString().split('T')[0];

            const newInvoice: Invoice = {
                id: invoiceId,
                clientName,
                clientEmail: clientEmail || 'client@example.com',
                issueDate: issueDate,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                items: items,
                currency,
                subTotal: subTotal,
                vatAmount: vat,
                whtDeduction: wht,
                totalAmount: totalReceivable,
                amountPaid: 0,
                payments: [],
                status: InvoiceStatus.SENT,
                paymentMethods: paymentMethods,
                paymentDetails: {
                    ...(hasBankDetails ? { bankName, accountNumber, accountName } : {}),
                    ...(hasWalletDetails ? { walletAddress, walletNetwork: 'TRC-20' } : {}),
                }
            };

            const newTransaction: Transaction = {
                id: `tx_${invoiceId}`,
                date: issueDate,
                description: `Invoice #${invoiceId} - ${description || 'Services Rendered'}`,
                payee: clientName,
                amount: totalReceivable,
                grossAmount: subTotal,
                currency: currency,
                exchangeRateSnapshot: 1550,
                type: TransactionType.INCOME,
                category: 'Service Revenue',
                taxDeductible: false,
                taxDetails: {
                    vatAmount: vat,
                    whtAmount: wht,
                    isRemitted: false
                },
                auditLog: {
                    createdAt: new Date().toISOString(),
                    createdBy: 'System (Invoice Module)',
                    source: 'INVOICE_GENERATED'
                },
                tags: ['#Invoiced', '#Receivable'],
                status: 'PENDING'
            };

            addInvoice(newInvoice);
            addTransaction(newTransaction);

            setIsCreating(false);
            setClientName('');
            setClientEmail('');
            setAmount('');
            setDescription('');
            setBankName('');
            setAccountNumber('');
            setAccountName('');
            setWalletAddress('');
            notify('SUCCESS', 'Invoice created successfully!');

        } catch (e: any) {
            notify('ERROR', e?.message || 'Failed to create invoice');
        } finally {
            setIsGenerating(false);
        }
    };

    const openPaymentModal = (inv: Invoice) => {
        const balance = inv.totalAmount - (inv.amountPaid || 0);
        setPaymentModal({
            isOpen: true,
            invoiceId: inv.id,
            balance: balance,
            currency: inv.currency
        });
        setPaymentAmount(balance.toString()); // Default to full remaining payment
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentNote('');
    };

    const submitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(paymentAmount);
        if (val <= 0 || val > paymentModal.balance + 1) { // Allow small float margin
            notify('ERROR', 'Invalid payment amount');
            return;
        }

        recordPayment(paymentModal.invoiceId, val, paymentDate, paymentNote);
        setPaymentModal({ ...paymentModal, isOpen: false });
    };

    const generatePDF = async (elementId: string, filename: string) => {
        if (!window.html2pdf) {
            notify('ERROR', 'PDF generator not loaded. Please refresh.');
            return;
        }

        const element = document.getElementById(elementId);
        if (!element) return;

        const opt = {
            margin: 10,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        setDownloadingId(filename);

        try {
            await window.html2pdf().set(opt).from(element).save();
            notify('SUCCESS', 'Document downloaded successfully.');
        } catch (e) {
            console.error(e);
            notify('ERROR', 'Failed to generate PDF.');
        } finally {
            setDownloadingId(null);
        }
    };

    const getDocTemplate = (inv: Invoice, type: 'INVOICE' | 'RECEIPT') => {
        const issuerName = user?.type === 'CORPORATE' ? user.companyName || user.name : user?.name || 'Fiscana User';
        const issuerEmail = user?.email || '';
        const symbol = inv.currency === 'NGN' ? '₦' : '$';
        const colorClass = type === 'RECEIPT' ? 'text-green-600' : 'text-blue-600';
        const title = type;
        const idPrefix = type === 'RECEIPT' ? 'RCP' : 'INV';

        const balanceDue = inv.totalAmount - (inv.amountPaid || 0);
        const isPaid = balanceDue <= 0;

        return (
            <div id={`pdf-${inv.id}-${type}`}>
                {/* This container will be temporarily rendered for PDF generation */}
                <div className="p-8 bg-white max-w-[700px] mx-auto text-slate-900 font-sans" style={{ width: '700px' }}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">{issuerName}</h2>
                            <p className="text-sm text-slate-500">{issuerEmail}</p>
                            {user?.tin && <p className="text-xs text-slate-400 mt-1">Tax ID: {user.tin}</p>}
                        </div>
                        <div className="text-right">
                            <h1 className={`text-3xl font-bold uppercase tracking-widest ${colorClass}`}>{title}</h1>
                            <p className="text-sm text-slate-500 mt-1">#{idPrefix}-{inv.id}</p>
                            <p className="text-sm text-slate-500">
                                {type === 'RECEIPT' ? 'Date Paid: ' : 'Issue Date: '}
                                <span className="font-semibold text-slate-900">
                                    {type === 'RECEIPT' ? (inv.paidDate || new Date().toISOString().split('T')[0]) : inv.issueDate}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="flex justify-between mb-8">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Bill To</p>
                            <h3 className="text-lg font-bold text-slate-800">{inv.clientName}</h3>
                            <p className="text-sm text-slate-500">{inv.clientEmail}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Payment Status</p>
                            <p className={`font-mono font-bold ${isPaid ? 'text-green-600' : balanceDue < inv.totalAmount ? 'text-amber-600' : 'text-slate-700'}`}>
                                {inv.status.replace('_', ' ')}
                            </p>
                            {!isPaid && <p className="text-xs text-slate-400 mt-1">Due Date: {inv.dueDate}</p>}
                        </div>
                    </div>

                    {/* Line Items */}
                    <table className="w-full mb-8 border-collapse">
                        <thead className="bg-slate-50 border-y border-slate-200">
                            <tr>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                                <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 uppercase">Qty</th>
                                <th className="py-3 px-4 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {inv.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-4 px-4 text-sm font-medium text-slate-700">{item.description}</td>
                                    <td className="py-4 px-4 text-center text-sm text-slate-600">{item.quantity}</td>
                                    <td className="py-4 px-4 text-right text-sm font-bold text-slate-900 font-mono">
                                        {symbol}{(item.unitPrice * item.quantity).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals Section */}
                    <div className="flex justify-end">
                        <div className="w-1/2 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Subtotal</span>
                                <span className="font-mono font-medium text-slate-700">{symbol}{inv.subTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">VAT (7.5%)</span>
                                <span className="font-mono font-medium text-slate-700">{symbol}{inv.vatAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">WHT (Deducted)</span>
                                <span className="font-mono font-medium text-red-500">({symbol}{inv.whtDeduction.toLocaleString()})</span>
                            </div>
                            <div className="flex justify-between pt-4 border-t border-slate-200">
                                <span className="text-base font-bold text-slate-900">Total {type === 'RECEIPT' ? 'Received' : 'Due'}</span>
                                <span className="text-xl font-bold text-slate-900 font-mono">{symbol}{inv.totalAmount.toLocaleString()}</span>
                            </div>

                            {/* New Section: Payment History on Invoice */}
                            {type === 'INVOICE' && (inv.amountPaid || 0) > 0 && (
                                <>
                                    <div className="flex justify-between text-sm text-green-600 font-medium pt-2">
                                        <span>Less: Amount Paid</span>
                                        <span>({symbol}{inv.amountPaid?.toLocaleString()})</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t-2 border-slate-100">
                                        <span>Balance Due</span>
                                        <span>{symbol}{balanceDue.toLocaleString()}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                        <div className="flex items-center justify-center space-x-1 mb-2 opacity-50">
                            <span className="text-xs font-bold text-slate-500">Powered by Fiscana</span>
                        </div>
                        <p className="text-xs text-slate-400">
                            {type === 'RECEIPT'
                                ? 'This is a computer-generated receipt and is valid without a signature.'
                                : 'Please pay into the account details provided below.'}
                        </p>
                        {type === 'INVOICE' && inv.paymentDetails && (
                            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-left">
                                <p className="text-xs font-semibold text-slate-700 mb-2">Payment Details:</p>
                                <div className="flex flex-col gap-1">
                                    {inv.paymentDetails.bankName && (
                                        <>
                                            <span className="text-xs text-slate-600">
                                                <strong>Bank:</strong> {inv.paymentDetails.bankName}
                                            </span>
                                            <span className="text-xs text-slate-600">
                                                <strong>Account Number:</strong> {inv.paymentDetails.accountNumber}
                                            </span>
                                            <span className="text-xs text-slate-600">
                                                <strong>Account Name:</strong> {inv.paymentDetails.accountName}
                                            </span>
                                        </>
                                    )}
                                    {inv.paymentDetails.walletAddress && (
                                        <>
                                            {inv.paymentDetails.bankName && <hr className="my-2 border-slate-200" />}
                                            <span className="text-xs text-slate-600">
                                                <strong>USDT Wallet ({inv.paymentDetails.walletNetwork}):</strong>
                                            </span>
                                            <span className="text-xs font-mono text-slate-700 break-all">
                                                {inv.paymentDetails.walletAddress}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const handleGenerateReceipt = (inv: Invoice) => {
        notify('INFO', 'Generating Receipt PDF...');
        setTimeout(() => {
            generatePDF(`pdf-${inv.id}-RECEIPT`, `Receipt-${inv.id}.pdf`);
        }, 100);
    };

    const handleDownloadInvoice = (inv: Invoice) => {
        notify('INFO', 'Generating Invoice PDF...');
        setTimeout(() => {
            generatePDF(`pdf-${inv.id}-INVOICE`, `Invoice-${inv.id}.pdf`);
        }, 100);
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
                    <p className="text-slate-500">VAT & WHT Compliant Invoicing</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center space-x-2 transition-colors shadow-lg shadow-green-600/20"
                >
                    <Plus size={20} />
                    <span>New Invoice</span>
                </button>
            </div>

            {isCreating && (
                <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-xl mb-8 animate-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                        Create Tax-Compliant Invoice
                        <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Finance Act Ready</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Client Email</label>
                                <input
                                    type="email"
                                    value={clientEmail}
                                    onChange={(e) => setClientEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="billing@client.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Service Description</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Project consultation fee"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Channels</label>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => toggleMethod(PaymentMethod.FIAT_NGN)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center space-x-1 ${paymentMethods.includes(PaymentMethod.FIAT_NGN) ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}><CreditCard size={14} /> <span>Bank Transfer</span></button>
                                    <button onClick={() => toggleMethod(PaymentMethod.CRYPTO_USDT)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center space-x-1 ${paymentMethods.includes(PaymentMethod.CRYPTO_USDT) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}><Wallet size={14} /> <span>USDT</span></button>
                                </div>
                            </div>

                            {/* Bank Account Details */}
                            {paymentMethods.includes(PaymentMethod.FIAT_NGN) && (
                                <div className="p-4 bg-green-50 rounded-xl border border-green-100 space-y-3">
                                    <p className="text-xs font-semibold text-green-800 flex items-center space-x-1"><CreditCard size={14} /> <span>Bank Account Details</span></p>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Bank Name</label>
                                        <input
                                            type="text"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                            placeholder="e.g. First Bank, GTBank"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Account Number</label>
                                        <input
                                            type="text"
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono"
                                            placeholder="0123456789"
                                            maxLength={10}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Account Name</label>
                                        <input
                                            type="text"
                                            value={accountName}
                                            onChange={(e) => setAccountName(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* USDT Wallet Details */}
                            {paymentMethods.includes(PaymentMethod.CRYPTO_USDT) && (
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                                    <p className="text-xs font-semibold text-blue-800 flex items-center space-x-1"><Wallet size={14} /> <span>USDT Wallet (TRC-20)</span></p>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Wallet Address</label>
                                        <input
                                            type="text"
                                            value={walletAddress}
                                            onChange={(e) => setWalletAddress(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                            placeholder="TVx3Rh..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex space-x-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Subtotal (Excl. Tax)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-bold"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value as 'NGN' | 'USD')}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    >
                                        <option value="NGN">NGN</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>

                            {/* Tax Logic */}
                            <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <input type="checkbox" id="addVat" checked={addVat} onChange={(e) => setAddVat(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
                                        <label htmlFor="addVat" className="text-sm text-slate-700">Add VAT (7.5%)</label>
                                    </div>
                                    <span className="text-sm font-mono">{currency === 'NGN' ? '₦' : '$'}{vat.toLocaleString()}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <input type="checkbox" id="expectWht" checked={expectWht} onChange={(e) => setExpectWht(e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
                                        <label htmlFor="expectWht" className="text-sm text-slate-700">Client deducts WHT (5%)</label>
                                    </div>
                                    <span className="text-sm font-mono text-red-500">-{currency === 'NGN' ? '₦' : '$'}{wht.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <div className="flex justify-between items-center text-lg font-bold text-slate-900">
                                    <span>Total Receivable</span>
                                    <span>{currency === 'NGN' ? '₦' : '$'}{totalReceivable.toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">This is the net cash hitting your account.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3 border-t border-slate-100 pt-6">
                        <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                        <button
                            onClick={handleCreate}
                            disabled={isGenerating}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isGenerating && <Loader2 size={16} className="animate-spin" />}
                            <span>{isGenerating ? 'Creating Invoice...' : 'Generate Invoice'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Invoice List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Client / ID</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Total</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Progress</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Balance</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {invoices.map((inv) => {
                            const paid = inv.amountPaid || 0;
                            const total = inv.totalAmount;
                            const balance = total - paid;
                            const percent = Math.min((paid / total) * 100, 100);

                            return (
                                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-900">{inv.clientName}</p>
                                        <p className="text-xs text-slate-500">{inv.id}</p>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-900 font-bold text-sm">
                                        {inv.currency === 'NGN' ? '₦' : '$'}{total.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-1.5 rounded-full ${percent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                style={{ width: `${percent}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">{percent.toFixed(0)}% Paid</p>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm font-medium text-slate-600">
                                        {balance > 0 ? (
                                            <span>{inv.currency === 'NGN' ? '₦' : '$'}{balance.toLocaleString()}</span>
                                        ) : (
                                            <span className="text-green-600 text-xs">Settled</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${inv.status === InvoiceStatus.PAID ? 'bg-green-100 text-green-800' :
                                                inv.status === InvoiceStatus.PARTIALLY_PAID ? 'bg-amber-100 text-amber-800' :
                                                    inv.status === InvoiceStatus.SENT ? 'bg-blue-100 text-blue-800' :
                                                        'bg-slate-100 text-slate-800'}`}>
                                            {inv.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end space-x-2">
                                        {/* Receipt Button */}
                                        {paid > 0 && (
                                            <button
                                                onClick={() => handleGenerateReceipt(inv)}
                                                disabled={!!downloadingId}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                                title="Download Receipt PDF"
                                            >
                                                {downloadingId && downloadingId.includes(inv.id) && downloadingId.includes('Receipt') ? <Loader2 size={18} className="animate-spin" /> : <FileCheck size={18} />}
                                            </button>
                                        )}

                                        {/* Record Payment Button */}
                                        {balance > 0 && (
                                            <button
                                                onClick={() => openPaymentModal(inv)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Record Payment"
                                            >
                                                <CreditCard size={18} />
                                            </button>
                                        )}

                                        {/* Invoice Download */}
                                        <button
                                            onClick={() => handleDownloadInvoice(inv)}
                                            disabled={!!downloadingId}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                            title="Download Invoice PDF"
                                        >
                                            {downloadingId && downloadingId.includes(inv.id) && downloadingId.includes('Invoice') ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Record Payment Modal */}
            {paymentModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Record Payment</h3>
                            <button onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                            <p className="text-xs text-slate-500 uppercase font-bold">Outstanding Balance</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {paymentModal.currency === 'NGN' ? '₦' : '$'}{paymentModal.balance.toLocaleString()}
                            </p>
                        </div>

                        <form onSubmit={submitPayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount</label>
                                <input
                                    type="number"
                                    required
                                    max={paymentModal.balance + 1} // Floating point tolerance
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date Received</label>
                                <input
                                    type="date"
                                    required
                                    value={paymentDate}
                                    onChange={e => setPaymentDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Note (Optional)</label>
                                <input
                                    type="text"
                                    value={paymentNote}
                                    onChange={e => setPaymentNote(e.target.value)}
                                    placeholder="e.g. 50% Upfront"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors shadow-lg"
                            >
                                Confirm Payment
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Hidden PDF Templates Area */}
            <div className="fixed top-0 left-0 pointer-events-none" style={{ opacity: 0, zIndex: -9999 }}>
                {invoices.map(inv => (
                    <React.Fragment key={inv.id}>
                        {getDocTemplate(inv, 'INVOICE')}
                        {getDocTemplate(inv, 'RECEIPT')}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default Invoices;
