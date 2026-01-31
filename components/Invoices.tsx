
import React, { useState } from 'react';
import { Plus, Send, Download, CreditCard, Bitcoin, CheckCircle, Calculator, FileCheck, Loader2 } from 'lucide-react';
import { Invoice, InvoiceStatus, PaymentMethod, Transaction, TransactionType, UserProfile } from '../types';
import { calculateInvoiceTotals } from '../utils/tax';

interface InvoicesProps {
  invoices: Invoice[];
  user: UserProfile | null;
  addInvoice: (inv: Invoice) => void;
  addTransaction: (t: Transaction) => void;
  markAsPaid: (id: string) => void;
  notify: (type: 'SUCCESS' | 'ERROR' | 'INFO', message: string) => void;
}

declare global {
    interface Window {
        html2pdf: any;
    }
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, user, addInvoice, addTransaction, markAsPaid, notify }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Form State
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [baniMethods, setBaniMethods] = useState<PaymentMethod[]>([PaymentMethod.FIAT_NGN]);
  
  // Tax Configuration
  const [addVat, setAddVat] = useState(true);
  const [expectWht, setExpectWht] = useState(false); // Does client deduct WHT?

  const toggleMethod = (method: PaymentMethod) => {
    if (baniMethods.includes(method)) {
      setBaniMethods(baniMethods.filter(m => m !== method));
    } else {
      setBaniMethods([...baniMethods, method]);
    }
  };

  // Calculations
  const subTotal = parseFloat(amount) || 0;
  const { vat, wht, totalReceivable } = calculateInvoiceTotals(subTotal, addVat, expectWht, 'INDIVIDUAL'); // Defaulting to Individual for now

  const handleCreate = () => {
    if (!clientName || !amount) {
        notify('ERROR', 'Please fill in Client Name and Amount');
        return;
    }
    
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
      clientEmail: 'client@example.com',
      issueDate: issueDate,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: items,
      currency,
      subTotal: subTotal,
      vatAmount: vat,
      whtDeduction: wht,
      totalAmount: totalReceivable,
      status: InvoiceStatus.SENT,
      paymentMethods: baniMethods,
      baniPaymentLink: `https://pay.bani.africa/${Math.random().toString(36).substr(2, 6)}`
    };

    const newTransaction: Transaction = {
        id: `tx_${invoiceId}`,
        date: issueDate,
        description: `Invoice #${invoiceId} - ${description || 'Services Rendered'}`,
        payee: clientName,
        amount: totalReceivable, // Net Cash Expectation
        grossAmount: subTotal, // For Revenue Recognition
        currency: currency,
        exchangeRateSnapshot: 1550, // Ideally pulled from global context
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
    setAmount('');
    setDescription('');
    notify('SUCCESS', 'Invoice created and posted to ledger');
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

      setDownloadingId(filename); // Simple way to show loading state if we tracked it by ID, here just boolean essentially
      
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

      return (
        <div id={`pdf-${inv.id}-${type}`} className="hidden">
             {/* This container will be temporarily rendered for PDF generation */}
             <div className="p-8 bg-white max-w-[800px] mx-auto text-slate-900 font-sans" style={{ width: '800px' }}>
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
                        <p className={`font-mono font-bold ${inv.status === InvoiceStatus.PAID ? 'text-green-600' : 'text-slate-700'}`}>
                            {inv.status}
                        </p>
                        {inv.status !== InvoiceStatus.PAID && <p className="text-xs text-slate-400 mt-1">Due Date: {inv.dueDate}</p>}
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

                {/* Totals */}
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
                         : 'Please pay into the account details provided or use the payment link.'}
                    </p>
                </div>
             </div>
        </div>
      );
  };

  const handleGenerateReceipt = (inv: Invoice) => {
      // For Receipt, we trigger the PDF download logic directly
      notify('INFO', 'Generating Receipt PDF...');
      
      // We need to render the hidden element first, React handles this via state rendering
      // But here we can access it if it is already in DOM.
      // We will mount the hidden templates at the bottom of the component return.
      
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
              <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Finance Act 2026 Ready</span>
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
                  <button onClick={() => toggleMethod(PaymentMethod.FIAT_NGN)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center space-x-1 ${baniMethods.includes(PaymentMethod.FIAT_NGN) ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}><CreditCard size={14} /> <span>Bank Transfer</span></button>
                  <button onClick={() => toggleMethod(PaymentMethod.CRYPTO_USDC)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center space-x-1 ${baniMethods.includes(PaymentMethod.CRYPTO_USDC) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}><span className="font-bold">$</span> <span>USDC</span></button>
                </div>
              </div>
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
                        <input type="checkbox" id="addVat" checked={addVat} onChange={(e) => setAddVat(e.target.checked)} className="w-4 h-4 text-green-600 rounded"/>
                        <label htmlFor="addVat" className="text-sm text-slate-700">Add VAT (7.5%)</label>
                    </div>
                    <span className="text-sm font-mono">{currency === 'NGN' ? '₦' : '$'}{vat.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <input type="checkbox" id="expectWht" checked={expectWht} onChange={(e) => setExpectWht(e.target.checked)} className="w-4 h-4 text-red-600 rounded"/>
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
             <button onClick={handleCreate} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg">Generate Invoice</button>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Client / ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Gross</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Tax Impact</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Net Receivable</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{inv.clientName}</p>
                  <p className="text-xs text-slate-500">{inv.id}</p>
                </td>
                <td className="px-6 py-4 font-mono text-slate-600 text-sm">
                   {inv.currency === 'NGN' ? '₦' : '$'}{inv.subTotal?.toLocaleString() || 0}
                </td>
                <td className="px-6 py-4 text-xs">
                    <div className="text-green-600">+VAT: {inv.vatAmount?.toLocaleString() || 0}</div>
                    <div className="text-red-500">-WHT: {inv.whtDeduction?.toLocaleString() || 0}</div>
                </td>
                 <td className="px-6 py-4 font-mono font-bold text-slate-900">
                   {inv.currency === 'NGN' ? '₦' : '$'}{inv.totalAmount?.toLocaleString() || 0}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${inv.status === InvoiceStatus.PAID ? 'bg-green-100 text-green-800' : 
                      inv.status === InvoiceStatus.SENT ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-800'}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex justify-end space-x-2">
                  {inv.status === InvoiceStatus.PAID ? (
                      <button 
                        onClick={() => handleGenerateReceipt(inv)} 
                        disabled={!!downloadingId}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50" 
                        title="Download Receipt PDF"
                      >
                         {downloadingId && downloadingId.includes(inv.id) && downloadingId.includes('Receipt') ? <Loader2 size={18} className="animate-spin"/> : <FileCheck size={18} />}
                      </button>
                  ) : (
                    <button 
                        onClick={() => {
                            if(confirm(`Confirm payment of ${inv.currency === 'NGN' ? '₦' : '$'}${inv.totalAmount} received today?`)) {
                                markAsPaid(inv.id);
                            }
                        }} 
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                        title="Mark as Paid"
                    >
                        <CheckCircle size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDownloadInvoice(inv)} 
                    disabled={!!downloadingId}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50" 
                    title="Download Invoice PDF"
                  >
                     {downloadingId && downloadingId.includes(inv.id) && downloadingId.includes('Invoice') ? <Loader2 size={18} className="animate-spin"/> : <Download size={18} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hidden PDF Templates Area */}
      <div className="fixed top-0 left-[-10000px] pointer-events-none">
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
