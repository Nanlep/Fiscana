import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { Search, Filter, Plus, ArrowUpRight, ArrowDownRight, X, Check, Upload, FileText, Paperclip, Download, Tag } from 'lucide-react';

interface LedgerProps {
  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
}

const Ledger: React.FC<LedgerProps> = ({ transactions, addTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTxType, setNewTxType] = useState<TransactionType>(TransactionType.INCOME);
  const [formData, setFormData] = useState({
    description: '',
    payee: '',
    amount: '',
    currency: 'NGN' as 'NGN' | 'USD',
    category: '',
    tags: '',
    date: new Date().toISOString().split('T')[0],
    isDeductible: false
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const filtered = transactions.filter(t => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
        t.description.toLowerCase().includes(term) || 
        t.payee.toLowerCase().includes(term) ||
        t.tags?.some(tag => tag.toLowerCase().includes(term));
    const matchesType = filterType === 'ALL' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleExportCSV = () => {
      const headers = ['ID', 'Date', 'Type', 'Payee', 'Description', 'Amount', 'Currency', 'Category', 'Tags', 'Deductible'];
      const rows = filtered.map(t => [
          t.id,
          t.date,
          t.type,
          `"${t.payee}"`, // Quote to handle commas
          `"${t.description}"`,
          t.amount,
          t.currency,
          t.category,
          `"${t.tags?.join(', ') || ''}"`,
          t.taxDeductible ? 'Yes' : 'No'
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `fiscana_ledger_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const openModal = (type: TransactionType) => {
    setNewTxType(type);
    setFormData({
        description: '',
        payee: '',
        amount: '',
        currency: 'NGN',
        category: '',
        tags: '',
        date: new Date().toISOString().split('T')[0],
        isDeductible: false
    });
    setReceiptFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.payee) return;

    const receiptUrl = receiptFile ? URL.createObjectURL(receiptFile) : undefined;
    
    // Process tags
    const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

    const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        date: formData.date,
        description: formData.description,
        payee: formData.payee,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        type: newTxType,
        category: formData.category || 'General',
        tags: tagsArray,
        taxDeductible: formData.isDeductible,
        receiptUrl: receiptUrl,
        status: 'CLEARED'
    };

    addTransaction(newTx);
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">General Ledger</h1>
          <p className="text-slate-500">Double-entry record of all financial movements</p>
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={handleExportCSV}
                className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 hover:bg-slate-50 transition-colors"
            >
                <Download size={18} /> <span>Export CSV</span>
            </button>
            <button 
                onClick={() => openModal(TransactionType.INCOME)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
            >
                <Plus size={18} /> <span>Income</span>
            </button>
            <button 
                onClick={() => openModal(TransactionType.EXPENSE)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
            >
                <Plus size={18} /> <span>Expense</span>
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search payee, tag, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
            </div>
            <div className="flex items-center space-x-2 w-full md:w-auto">
                <Filter size={18} className="text-slate-400" />
                <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 text-sm focus:outline-none"
                >
                    <option value="ALL">All Transactions</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expenses</option>
                </select>
            </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Payee / Description</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Category & Tags</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Compliance</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filtered.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-600 font-mono whitespace-nowrap">{t.date}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-1.5 rounded-full flex-shrink-0 ${t.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {t.type === 'INCOME' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900">{t.payee}</span>
                                        <span className="text-sm text-slate-500">{t.description}</span>
                                        {t.receiptUrl && (
                                            <a 
                                                href={t.receiptUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center text-xs text-blue-600 hover:text-blue-700 mt-0.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Paperclip size={10} className="mr-1" /> Receipt
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col space-y-1">
                                    <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        {t.category}
                                    </span>
                                    {t.tags && t.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {t.tags.map((tag, i) => (
                                                <span key={i} className="flex items-center text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                    <Tag size={8} className="mr-1"/> {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className={`px-6 py-4 text-right font-mono font-bold whitespace-nowrap ${t.type === 'INCOME' ? 'text-green-600' : 'text-slate-800'}`}>
                                {t.type === 'INCOME' ? '+' : '-'} {t.currency === 'NGN' ? '₦' : '$'}{t.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {t.taxDeductible && (
                                    <span className="text-green-600 text-[10px] font-bold bg-green-50 px-2 py-1 rounded border border-green-100 uppercase">Deductible</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filtered.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                    No transactions found matching your criteria.
                </div>
            )}
        </div>
    </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl scale-100 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">
                        Record {newTxType === TransactionType.INCOME ? 'Income' : 'Expense'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Payee & Description */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                             <label className="block text-sm font-medium text-slate-700 mb-1">
                                {newTxType === TransactionType.INCOME ? 'Payer / Client' : 'Payee / Vendor'}
                             </label>
                            <input 
                                type="text" 
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder={newTxType === TransactionType.INCOME ? "e.g. Acme Corp" : "e.g. Amazon AWS"}
                                value={formData.payee}
                                onChange={e => setFormData({...formData, payee: e.target.value})}
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input 
                                type="date" 
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <input 
                                type="text" 
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Details of the transaction"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    {/* Amount & Currency */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                            <input 
                                type="number" 
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({...formData, amount: e.target.value})}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                            <select
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                value={formData.currency}
                                onChange={e => setFormData({...formData, currency: e.target.value as 'NGN' | 'USD'})}
                            >
                                <option value="NGN">NGN</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>

                    {/* Categorization */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select 
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none custom-select"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                <option value="">Select Category</option>
                                {newTxType === TransactionType.INCOME ? (
                                    <>
                                        <optgroup label="Professional Income">
                                            <option value="Service Revenue">Service Revenue</option>
                                            <option value="Consulting">Consulting Fees</option>
                                            <option value="Salary">Salary / Wages</option>
                                        </optgroup>
                                        <optgroup label="Sales & Products">
                                            <option value="Product Sales">Product Sales</option>
                                            <option value="Digital Products">Digital Products</option>
                                            <option value="Affiliate">Affiliate Income</option>
                                        </optgroup>
                                        <optgroup label="Investments">
                                            <option value="Crypto Gains">Crypto Gains</option>
                                            <option value="Dividends">Dividends</option>
                                            <option value="Rental">Rental Income</option>
                                        </optgroup>
                                    </>
                                ) : (
                                    <>
                                        <optgroup label="Operational">
                                            <option value="Rent">Rent</option>
                                            <option value="Utilities">Utilities</option>
                                            <option value="Office Supplies">Office Supplies</option>
                                            <option value="Equipment">Equipment</option>
                                            <option value="Software">Software & SaaS</option>
                                        </optgroup>
                                        <optgroup label="Professional">
                                            <option value="Marketing">Marketing</option>
                                            <option value="Legal">Legal & Accounting</option>
                                            <option value="Education">Education</option>
                                            <option value="Bank Fees">Bank Fees</option>
                                        </optgroup>
                                        <optgroup label="Personal/Other">
                                            <option value="Travel">Travel</option>
                                            <option value="Meals">Meals</option>
                                            <option value="Drawings">Owner Drawings</option>
                                        </optgroup>
                                    </>
                                )}
                            </select>
                        </div>
                         <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tags (Comma separated)</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="#ProjectA, #Personal"
                                value={formData.tags}
                                onChange={e => setFormData({...formData, tags: e.target.value})}
                            />
                        </div>
                    </div>

                    {newTxType === TransactionType.EXPENSE && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <input 
                                    type="checkbox" 
                                    id="deductible"
                                    checked={formData.isDeductible}
                                    onChange={e => setFormData({...formData, isDeductible: e.target.checked})}
                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                />
                                <label htmlFor="deductible" className="text-sm text-slate-700 font-medium">Tax Deductible Expense?</label>
                            </div>

                            {/* Receipt Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Receipt (Optional)</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors relative group cursor-pointer">
                                    <input 
                                        type="file" 
                                        accept="image/*,.pdf"
                                        onChange={(e) => e.target.files && setReceiptFile(e.target.files[0])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                                        {receiptFile ? (
                                            <>
                                                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                                    <FileText size={20} />
                                                </div>
                                                <p className="text-sm font-medium text-green-600 truncate max-w-[200px]">{receiptFile.name}</p>
                                                <p className="text-xs text-slate-400">Click to replace</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                                                    <Upload size={20} />
                                                </div>
                                                <p className="text-sm font-medium text-slate-600">Click to upload receipt</p>
                                                <p className="text-xs text-slate-400">PDF, JPG or PNG (Max 5MB)</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button 
                        type="submit"
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-colors flex justify-center items-center space-x-2 ${
                            newTxType === TransactionType.INCOME 
                            ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' 
                            : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                        }`}
                    >
                        <Check size={20} />
                        <span>Save Transaction</span>
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Ledger;