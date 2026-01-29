import React, { useState } from 'react';
import { Transaction, Asset, Liability } from '../types';
import { Printer } from 'lucide-react';
import { normalizeToNGN, formatCurrency, EXCHANGE_RATE } from '../utils/currency';

interface ReportsProps {
  transactions: Transaction[];
  assets: Asset[];
  liabilities: Liability[];
  companyName?: string;
}

const Reports: React.FC<ReportsProps> = ({ transactions, assets, liabilities, companyName }) => {
  const [reportType, setReportType] = useState<'PL' | 'BS'>('PL');
  
  // Calculations for Profit & Loss (Normalized)
  const incomeTransactions = transactions.filter(t => t.type === 'INCOME');
  
  // Business Operating Expenses (Strictly BUSINESS category)
  const businessExpenseTransactions = transactions.filter(t => 
    t.type === 'EXPENSE' && t.expenseCategory === 'BUSINESS'
  );
  
  // Personal Expenses & Transfers (Strictly PERSONAL category)
  const personalTransactions = transactions.filter(t => 
    t.type === 'EXPENSE' && (t.expenseCategory === 'PERSONAL' || !t.expenseCategory)
  );

  const totalRevenue = incomeTransactions.reduce((sum, t) => sum + normalizeToNGN(t.amount, t.currency), 0); 
  const totalOperatingExpenses = businessExpenseTransactions.reduce((sum, t) => sum + normalizeToNGN(t.amount, t.currency), 0);
  const totalPersonalOutflows = personalTransactions.reduce((sum, t) => sum + normalizeToNGN(t.amount, t.currency), 0);
  
  // Net Business Income (Revenue - Business Expenses)
  const netBusinessIncome = totalRevenue - totalOperatingExpenses;
  
  // Net Cash Flow (Net Business Income - Personal Outflows)
  const netCashFlow = netBusinessIncome - totalPersonalOutflows;

  // Group by Category (Normalized)
  const incomeByCategory = incomeTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + normalizeToNGN(t.amount, t.currency);
      return acc;
  }, {} as Record<string, number>);

  const businessExpensesByCategory = businessExpenseTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + normalizeToNGN(t.amount, t.currency);
      return acc;
  }, {} as Record<string, number>);
  
  const personalExpensesByCategory = personalTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + normalizeToNGN(t.amount, t.currency);
      return acc;
  }, {} as Record<string, number>);

  // Calculations for Balance Sheet (Normalized)
  const totalAssets = assets.reduce((sum, a) => sum + normalizeToNGN(a.value, a.currency), 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + normalizeToNGN(l.amount, l.currency), 0);
  const equity = totalAssets - totalLiabilities;

  const assetsByType = assets.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + normalizeToNGN(a.value, a.currency);
      return acc;
  }, {} as Record<string, number>);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 space-y-8 print:p-0">
        <div className="flex justify-between items-center print:hidden">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
                <p className="text-slate-500">World-class standard financial statements</p>
            </div>
            <div className="flex space-x-2">
                <button 
                    onClick={handlePrint}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <Printer size={18} /> <span>Print / PDF</span>
                </button>
            </div>
        </div>

        {/* Report Toggle */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit print:hidden">
            <button 
                onClick={() => setReportType('PL')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'PL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Profit & Loss
            </button>
            <button 
                 onClick={() => setReportType('BS')}
                 className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'BS' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Balance Sheet
            </button>
        </div>

        {/* Paper Container */}
        <div className="bg-white p-12 shadow-lg border border-slate-100 rounded-xl min-h-[800px] max-w-4xl mx-auto print:shadow-none print:border-0 print:w-full">
            
            {/* Report Header */}
            <div className="text-center mb-12 border-b border-slate-900 pb-8">
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-widest mb-1">{companyName || 'Taiwo Doe (Individual)'}</h2>
                <h3 className="text-xl font-medium text-slate-600">{reportType === 'PL' ? 'Statement of Profit or Loss' : 'Statement of Financial Position'}</h3>
                <p className="text-sm text-slate-400 mt-2">As of {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="text-xs text-slate-500 mt-1">Base Reporting Currency: NGN (Rate Used: ₦{EXCHANGE_RATE}/$)</p>
            </div>

            {reportType === 'PL' ? (
                <div className="space-y-8 font-mono">
                    {/* Revenue Section */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-4">Operating Income</h4>
                        <div className="space-y-2">
                            {Object.entries(incomeByCategory).map(([cat, val]) => (
                                <div key={cat} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{cat}</span>
                                    <span className="text-slate-900">{formatCurrency(val, 'NGN')}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-2">
                                <span>Total Revenue</span>
                                <span>{formatCurrency(totalRevenue, 'NGN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Expense Section */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-4">Operating Expenses (Business)</h4>
                        <div className="space-y-2">
                             {Object.entries(businessExpensesByCategory).map(([cat, val]) => (
                                <div key={cat} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{cat}</span>
                                    <span className="text-slate-900">({formatCurrency(val, 'NGN')})</span>
                                </div>
                            ))}
                             <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-2">
                                <span>Total Operating Expenses</span>
                                <span className="text-red-600">({formatCurrency(totalOperatingExpenses, 'NGN')})</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Business Income */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-8">
                         <div className="flex justify-between text-lg font-bold">
                            <span>Net Business Income</span>
                            <span className={netBusinessIncome >= 0 ? 'text-slate-900' : 'text-red-600'}>
                                {formatCurrency(netBusinessIncome, 'NGN')}
                            </span>
                        </div>
                    </div>

                    {/* Personal Expenses / Draws */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase border-b border-slate-200 pb-2 mb-4 mt-8">Personal Expenses & Withdrawals</h4>
                        <div className="space-y-2">
                             {Object.entries(personalExpensesByCategory).map(([cat, val]) => (
                                <div key={cat} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{cat}</span>
                                    <span className="text-slate-900">({formatCurrency(val, 'NGN')})</span>
                                </div>
                            ))}
                             <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-2">
                                <span className="text-slate-600">Total Personal Outflows</span>
                                <span className="text-slate-900">({formatCurrency(totalPersonalOutflows, 'NGN')})</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 italic">* Personal expenses are treated as equity drawings and do not reduce business taxable income.</p>
                    </div>

                     {/* Net Cash Flow */}
                     <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-900 mt-8">
                         <div className="flex justify-between text-lg font-bold">
                            <span>Net Cash Flow</span>
                            <span className={netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {formatCurrency(netCashFlow, 'NGN')}
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 font-mono">
                    {/* Assets */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-4">Assets</h4>
                        <div className="space-y-2">
                            {Object.entries(assetsByType).map(([type, val]) => (
                                <div key={type} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{type}</span>
                                    <span className="text-slate-900">{formatCurrency(val, 'NGN')}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-2">
                                <span>Total Assets</span>
                                <span>{formatCurrency(totalAssets, 'NGN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Liabilities */}
                     <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-4">Liabilities</h4>
                        <div className="space-y-2">
                            {liabilities.map((l) => (
                                <div key={l.id} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{l.name}</span>
                                    <span className="text-slate-900">{formatCurrency(normalizeToNGN(l.amount, l.currency), 'NGN')}</span>
                                </div>
                            ))}
                            {liabilities.length === 0 && <div className="text-sm text-slate-400 italic">No liabilities recorded.</div>}
                            
                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-2">
                                <span>Total Liabilities</span>
                                <span>{formatCurrency(totalLiabilities, 'NGN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Equity */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-4">Owner's Equity</h4>
                        <div className="space-y-2">
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Net Assets</span>
                                <span className="text-slate-900">{formatCurrency(equity, 'NGN')}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-2">
                                <span>Total Equity</span>
                                <span>{formatCurrency(equity, 'NGN')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-8 text-center text-xs text-slate-500">
                        <p>Total Liabilities & Equity: {formatCurrency(totalLiabilities + equity, 'NGN')}</p>
                    </div>
                </div>
            )}

            <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-end text-xs text-slate-400">
                <div>
                    <p>Generated by Fiscana Financial OS</p>
                    <p>{new Date().toISOString()}</p>
                </div>
                <div className="text-right">
                    <p>Authorized Signature</p>
                    <div className="w-48 border-b border-slate-300 mt-8"></div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Reports;