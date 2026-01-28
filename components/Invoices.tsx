import React, { useState } from 'react';
import { Plus, Send, Download, CreditCard, Bitcoin, CheckCircle } from 'lucide-react';
import { Invoice, InvoiceStatus, PaymentMethod, Transaction, TransactionType } from '../types';

interface InvoicesProps {
  invoices: Invoice[];
  addInvoice: (inv: Invoice) => void;
  addTransaction: (t: Transaction) => void;
  markAsPaid: (id: string) => void;
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, addInvoice, addTransaction, markAsPaid }) => {
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [baniMethods, setBaniMethods] = useState<PaymentMethod[]>([PaymentMethod.FIAT_NGN]);
  const [addVat, setAddVat] = useState(false);

  const toggleMethod = (method: PaymentMethod) => {
    if (baniMethods.includes(method)) {
      setBaniMethods(baniMethods.filter(m => m !== method));
    } else {
      setBaniMethods([...baniMethods, method]);
    }
  };

  // Derived calculations for preview
  const baseAmount = parseFloat(amount) || 0;
  const vatAmount = addVat ? baseAmount * 0.075 : 0;
  const totalAmount = baseAmount + vatAmount;

  const handleCreate = () => {
    if (!clientName || !amount) return;
    
    const items = [{
        id: '1',
        description,
        quantity: 1,
        unitPrice: baseAmount
    }];

    if (addVat) {
        items.push({
            id: 'vat-75',
            description: 'VAT (7.5%)',
            quantity: 1,
            unitPrice: baseAmount * 0.075
        });
    }

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
      status: InvoiceStatus.SENT,
      paymentMethods: baniMethods,
      baniPaymentLink: `https://pay.bani.africa/${Math.random().toString(36).substr(2, 6)}`
    };

    // Create corresponding Income Transaction automatically (Accrual Basis)
    const newTransaction: Transaction = {
        id: `tx_${invoiceId}`,
        date: issueDate,
        description: `Invoice #${invoiceId} - ${description || 'Services Rendered'}`,
        payee: clientName, // Audit Requirement: Capture Client Name
        amount: totalAmount,
        currency: currency,
        type: TransactionType.INCOME,
        category: 'Service Revenue',
        taxDeductible: false,
        tags: ['#Invoiced', '#Receivable'],
        status: 'PENDING'
    };

    addInvoice(newInvoice);
    addTransaction(newTransaction);

    setIsCreating(false);
    setClientName('');
    setAmount('');
    setDescription('');
    setAddVat(false);
  };

  const handleSendReminder = (id: string) => {
      alert(`Reminder email sent to client for Invoice #${id}`);
  };

  const handleDownload = (id: string) => {
      alert(`Downloading Invoice #${id} as PDF...`);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500">Manage your billing and get paid via secure payment rails</p>
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
          <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Invoice</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="Project consultation fee"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'NGN' | 'USD')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {/* VAT Toggle */}
              <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <input 
                    type="checkbox" 
                    id="addVat"
                    checked={addVat}
                    onChange={(e) => setAddVat(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500 border-slate-300"
                />
                <div className="flex-1">
                    <label htmlFor="addVat" className="text-sm font-medium text-slate-700 cursor-pointer">Add VAT (7.5%)</label>
                    <p className="text-xs text-slate-400">Compliance with Finance Act</p>
                </div>
                {addVat && (
                    <span className="text-sm font-bold text-slate-900">
                         +{currency === 'NGN' ? '₦' : '$'}{vatAmount.toLocaleString()}
                    </span>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Methods</label>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => toggleMethod(PaymentMethod.FIAT_NGN)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center space-x-1 ${baniMethods.includes(PaymentMethod.FIAT_NGN) ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    <CreditCard size={14} /> <span>Bank Transfer</span>
                  </button>
                  <button 
                    onClick={() => toggleMethod(PaymentMethod.CRYPTO_USDC)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center space-x-1 ${baniMethods.includes(PaymentMethod.CRYPTO_USDC) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    <span className="font-bold">$</span> <span>USDC</span>
                  </button>
                  <button 
                    onClick={() => toggleMethod(PaymentMethod.CRYPTO_BTC)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center space-x-1 ${baniMethods.includes(PaymentMethod.CRYPTO_BTC) ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    <Bitcoin size={14} /> <span>Bitcoin</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row justify-between items-center border-t border-slate-100 pt-6">
            <div className="mb-4 md:mb-0 text-left">
                <p className="text-sm text-slate-500">Total Invoice Value</p>
                <p className="text-2xl font-bold text-slate-900">
                    {currency === 'NGN' ? '₦' : '$'}{totalAmount.toLocaleString()}
                </p>
                {addVat && <p className="text-xs text-green-600 font-medium">Includes 7.5% VAT</p>}
            </div>
            <div className="flex space-x-3">
                <button 
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                Cancel
                </button>
                <button 
                onClick={handleCreate}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                >
                Generate Payment Link
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{inv.clientName}</p>
                  <p className="text-xs text-slate-500">{inv.id}</p>
                </td>
                <td className="px-6 py-4 text-slate-600 text-sm">{inv.issueDate}</td>
                <td className="px-6 py-4 font-mono font-medium text-slate-800">
                  {inv.currency === 'NGN' ? '₦' : '$'} {inv.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0).toLocaleString()}
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
                  {inv.status !== InvoiceStatus.PAID && (
                    <button 
                        onClick={() => markAsPaid(inv.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Mark as Paid"
                    >
                        <CheckCircle size={18} />
                    </button>
                  )}
                  <button onClick={() => handleSendReminder(inv.id)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Send Reminder">
                    <Send size={18} />
                  </button>
                  <button onClick={() => handleDownload(inv.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download PDF">
                    <Download size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            No invoices yet. Create your first one to get paid.
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;