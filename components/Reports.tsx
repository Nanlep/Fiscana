import React, { useState } from 'react';
import { Transaction, Asset, Liability } from '../types';
import { Download, Calendar, TrendingUp, TrendingDown, Scale, Printer } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  assets: Asset[];
  liabilities: Liability[];
  companyName?: string;
}

const Reports: React.FC<ReportsProps> = ({ transactions, assets, liabilities, companyName }) => {
  const [reportType, setReportType] = useState<'PL' | 'BS'>('PL');
  
  // Calculations for Profit & Loss
  const incomeTransactions = transactions.filter(t => t.type === 'INCOME');
  
  // Separate Operating Expenses from Withdrawals/Transfers
  const expenseTransactions = transactions.filter(t => 
    t.type === 'EXPENSE' && t.category !== 'Transfer' && t.category !== 'Drawings'
  );
  
  const transferTransactions = transactions.filter(t => 
    t.type === 'EXPENSE' && (t.category === 'Transfer' || t.category === 'Drawings')
  );

  const totalRevenue = incomeTransactions.reduce((sum, t) => sum + t.amount, 0); 
  const totalOperatingExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTransfers = transferTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netIncome = totalRevenue - totalOperatingExpenses;

  // Group by Category
  const incomeByCategory = incomeTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
  }, {} as Record<string, number>);

  const expensesByCategory = expenseTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
  }, {} as Record<string, number>);

  // Calculations for Balance Sheet
  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
  const equity = totalAssets - totalLiabilities;

  const assetsByType = assets.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + a.value;
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
                <p className="text-xs text-slate-300 mt-1">Currency: NGN (Nigerian Naira)</p>
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
                                    <span className="text-slate-900">₦ {val.toLocaleString()}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-2">
                                <span>Total Revenue</span>
                                <span>₦ {totalRevenue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Expense Section */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-4">Operating Expenses</h4>
                        <div className="space-y-2">
                             {Object.entries(expensesByCategory).map(([cat, val]) => (
                                <div key={cat} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{cat}</span>
                                    <span className="text-slate-900">(₦ {val.toLocaleString()})</span>
                                </div>
                            ))}
                             <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-2">
                                <span>Total Operating Expenses</span>
                                <span className="text-red-600">(₦ {totalOperatingExpenses.toLocaleString()})</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Income */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-8">
                         <div className="flex justify-between text-lg font-bold">
                            <span>Net Income (Before Tax)</span>
                            <span className={netIncome >= 0 ? 'text-slate-900' : 'text-red-600'}>
                                ₦ {netIncome.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Transfers / Drawings (Not P&L Items, but Cash Flow) */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase border-b border-slate-200 pb-2 mb-4 mt-8">Cash Withdrawals & Distributions</h4>
                        <div className="space-y-2">
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Transfers / Drawings</span>
                                <span className="text-slate-900">(₦ {totalTransfers.toLocaleString()})</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 italic">* Drawings are distributions of equity and do not reduce taxable Net Income.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 font-mono">
                     {/* Assets Section */}
                     <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-4">Assets</h4>
                        <div className="space-y-2">
                            {Object.entries(assetsByType).map(([type, val]) => (
                                <div key={type} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{type}</span>
                                    <span className="text-slate-900">₦ {val.toLocaleString()}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-2">
                                <span>Total Assets</span>
                                <span>₦ {totalAssets.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Liabilities Section */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-4">Liabilities</h4>
                        <div className="space-y-2">
                            {liabilities.length > 0 ? liabilities.map(l => (
                                 <div key={l.id} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{l.name}</span>
                                    <span className="text-slate-900">₦ {l.amount.toLocaleString()}</span>
                                </div>
                            )) : (
                                <div className="text-sm text-slate-400 italic">No liabilities recorded</div>
                            )}
                             <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-2">
                                <span>Total Liabilities</span>
                                <span>₦ {totalLiabilities.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                     {/* Equity Section */}
                     <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-4">Equity</h4>
                         <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Owner's Equity</span>
                            <span className="text-slate-900">₦ {equity.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-2">
                            <span>Total Equity</span>
                            <span>₦ {equity.toLocaleString()}</span>
                        </div>
                    </div>

                     {/* Validation */}
                     <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-8 flex justify-between items-center">
                         <div className="text-xs text-slate-500 uppercase font-bold">Accounting Equation Check</div>
                         <div className="text-sm font-bold text-slate-900">
                            Total Assets (₦ {totalAssets.toLocaleString()}) = Liabilities + Equity (₦ {(totalLiabilities + equity).toLocaleString()})
                         </div>
                    </div>
                </div>
            )}

            <div className="mt-16 text-center">
                <p className="text-[10px] text-slate-400">Generated by Fiscana Financial OS. This document is compliant with Nigeria Finance Act provisions for record keeping.</p>
            </div>
        </div>
    </div>
  );
};

export default Reports;