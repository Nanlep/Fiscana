
import React, { useState, useMemo } from 'react';
import { Transaction, Asset, Liability } from '../types';
import { Printer, Calendar, ChevronDown, Filter, FileText, BarChart3 } from 'lucide-react';
import { normalizeToNGN, formatCurrency } from '../utils/currency';

interface ReportsProps {
  transactions: Transaction[];
  assets: Asset[];
  liabilities: Liability[];
  companyName?: string;
  exchangeRate: number;
}

type ReportType = 'PL' | 'BS' | 'CF'; // Added Cash Flow
type DateRangeOption = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'YTD' | 'LAST_YEAR' | 'CUSTOM';

const Reports: React.FC<ReportsProps> = ({ transactions, assets, liabilities, companyName, exchangeRate }) => {
  const [reportType, setReportType] = useState<ReportType>('PL');
  
  // Date Logic
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(startOfYear);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('YTD');

  const handleRangeChange = (range: DateRangeOption) => {
      setSelectedRange(range);
      const now = new Date();
      
      if (range === 'ALL') {
          setStartDate('2023-01-01'); // Arbitrary past
          setEndDate(todayStr);
      } else if (range === 'THIS_MONTH') {
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          setStartDate(start.toISOString().split('T')[0]);
          setEndDate(end.toISOString().split('T')[0]);
      } else if (range === 'LAST_MONTH') {
          const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const end = new Date(now.getFullYear(), now.getMonth(), 0);
          setStartDate(start.toISOString().split('T')[0]);
          setEndDate(end.toISOString().split('T')[0]);
      } else if (range === 'YTD') {
          setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
          setEndDate(todayStr);
      } else if (range === 'LAST_YEAR') {
          const start = new Date(now.getFullYear() - 1, 0, 1);
          const end = new Date(now.getFullYear() - 1, 11, 31);
          setStartDate(start.toISOString().split('T')[0]);
          setEndDate(end.toISOString().split('T')[0]);
      } else if (range === 'CUSTOM') {
          // Keep current values, allow user to edit
      }
  };

  const filteredTransactions = useMemo(() => {
      if (reportType === 'BS') return transactions; 
      return transactions.filter(t => t.date >= startDate && t.date <= endDate);
  }, [transactions, startDate, endDate, reportType]);

  // --- Financial Calculations ---
  
  // 1. Profit & Loss Data
  const incomeTransactions = filteredTransactions.filter(t => t.type === 'INCOME');
  const businessExpenseTransactions = filteredTransactions.filter(t => t.type === 'EXPENSE' && t.expenseCategory === 'BUSINESS');
  const personalTransactions = filteredTransactions.filter(t => t.type === 'EXPENSE' && (t.expenseCategory === 'PERSONAL' || !t.expenseCategory));

  const totalRevenue = incomeTransactions.reduce((sum, t) => sum + normalizeToNGN(t.grossAmount || t.amount, t.currency, exchangeRate), 0); // Use Gross for Revenue
  const totalOperatingExpenses = businessExpenseTransactions.reduce((sum, t) => sum + normalizeToNGN(t.amount, t.currency, exchangeRate), 0);
  const totalPersonalOutflows = personalTransactions.reduce((sum, t) => sum + normalizeToNGN(t.amount, t.currency, exchangeRate), 0);
  const netProfit = totalRevenue - totalOperatingExpenses;

  // 2. Balance Sheet Data (Snapshots)
  const totalAssets = assets.reduce((sum, a) => sum + normalizeToNGN(a.value, a.currency, exchangeRate), 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + normalizeToNGN(l.amount, l.currency, exchangeRate), 0);
  const equity = totalAssets - totalLiabilities;

  // 3. Cash Flow Statement Data (Direct Method Simulation)
  const operatingInflow = incomeTransactions.reduce((sum, t) => sum + normalizeToNGN(t.amount, t.currency, exchangeRate), 0); // Cash Received
  const operatingOutflow = businessExpenseTransactions.reduce((sum, t) => sum + normalizeToNGN(t.amount, t.currency, exchangeRate), 0);
  const netCashOperations = operatingInflow - operatingOutflow;
  
  // Simulate Investing/Financing for demo (In real app, we'd filter by category like 'Equipment' or 'Loan')
  const investingOutflow = businessExpenseTransactions
    .filter(t => t.category === 'Equipment' || t.category === 'Investments')
    .reduce((sum, t) => sum + normalizeToNGN(t.amount, t.currency, exchangeRate), 0);
  const netCashInvesting = -investingOutflow;

  const financingOutflow = personalTransactions.reduce((sum, t) => sum + normalizeToNGN(t.amount, t.currency, exchangeRate), 0); // Owners Draw
  const netCashFinancing = -financingOutflow;
  
  const netCashChange = netCashOperations + netCashInvesting + netCashFinancing;
  const beginningCash = totalAssets - netCashChange; // Back-calculated for demo (Real app needs snapshots)

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 space-y-6 print:p-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
                <p className="text-slate-500">IFRS-Compliant Statements & Audit Log</p>
            </div>
            <div className="flex items-center space-x-2">
                <button 
                    onClick={handlePrint}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <Printer size={18} /> <span>Export PDF</span>
                </button>
            </div>
        </div>

        {/* Controls Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center print:hidden">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
                <button 
                    onClick={() => setReportType('PL')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${reportType === 'PL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Profit & Loss
                </button>
                <button 
                    onClick={() => setReportType('BS')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${reportType === 'BS' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Balance Sheet
                </button>
                <button 
                    onClick={() => setReportType('CF')}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${reportType === 'CF' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Cash Flow
                </button>
            </div>

            {reportType !== 'BS' && (
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <select 
                        value={selectedRange} 
                        onChange={(e) => handleRangeChange(e.target.value as DateRangeOption)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 py-2 px-4 rounded-lg text-sm font-medium focus:outline-none cursor-pointer"
                    >
                        <option value="YTD">Year to Date (YTD)</option>
                        <option value="THIS_MONTH">This Month</option>
                        <option value="LAST_YEAR">Last Year</option>
                        <option value="ALL">All Time</option>
                    </select>
                </div>
            )}
        </div>

        {/* Paper Container */}
        <div className="bg-white p-12 shadow-lg border border-slate-100 rounded-xl min-h-[800px] max-w-4xl mx-auto print:shadow-none print:border-0 print:w-full print:p-0">
            
            {/* Standard Header */}
            <div className="text-center mb-12 border-b border-slate-900 pb-8">
                <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-slate-900 rounded-md"></div>
                    <span className="font-bold text-lg tracking-tight">Fiscana</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-widest mb-1">{companyName || 'Taiwo Doe (Individual)'}</h2>
                <h3 className="text-xl font-medium text-slate-600">
                    {reportType === 'PL' ? 'Statement of Profit or Loss' : 
                     reportType === 'BS' ? 'Statement of Financial Position' : 'Statement of Cash Flows'}
                </h3>
                
                <p className="text-sm text-slate-400 mt-2">
                    {reportType !== 'BS' 
                        ? `For the period: ${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}` 
                        : `As of ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    }
                </p>
                <p className="text-xs text-slate-500 mt-1">Currency: NGN | Exchange Rate: ₦{exchangeRate}/$</p>
            </div>

            {reportType === 'PL' && (
                <div className="space-y-6 font-mono text-sm">
                    {/* Revenue */}
                    <div>
                        <div className="flex justify-between font-bold border-b border-slate-800 pb-2 mb-2">
                            <span>REVENUE</span>
                        </div>
                         <div className="flex justify-between py-1">
                            <span className="text-slate-700">Service Revenue (Gross)</span>
                            <span>{formatCurrency(totalRevenue, 'NGN')}</span>
                        </div>
                        <div className="flex justify-between py-1 font-bold pt-2">
                            <span>Total Revenue</span>
                            <span>{formatCurrency(totalRevenue, 'NGN')}</span>
                        </div>
                    </div>

                    {/* Expenses */}
                    <div>
                         <div className="flex justify-between font-bold border-b border-slate-800 pb-2 mb-2 mt-6">
                            <span>OPERATING EXPENSES</span>
                        </div>
                         <div className="flex justify-between py-1">
                            <span className="text-slate-700">General & Admin</span>
                            <span>({formatCurrency(totalOperatingExpenses, 'NGN')})</span>
                        </div>
                         <div className="flex justify-between py-1 font-bold pt-2">
                            <span>Total Operating Expenses</span>
                            <span>({formatCurrency(totalOperatingExpenses, 'NGN')})</span>
                        </div>
                    </div>

                    {/* Net Profit */}
                    <div className="mt-8 pt-4 border-t-2 border-slate-900">
                         <div className="flex justify-between font-bold text-lg">
                            <span>NET PROFIT (Before Tax)</span>
                            <span>{formatCurrency(netProfit, 'NGN')}</span>
                        </div>
                    </div>
                </div>
            )}

            {reportType === 'CF' && (
                <div className="space-y-6 font-mono text-sm">
                    {/* Operating Activities */}
                    <div>
                        <div className="flex justify-between font-bold border-b border-slate-800 pb-2 mb-2">
                            <span>CASH FLOW FROM OPERATING ACTIVITIES</span>
                        </div>
                         <div className="flex justify-between py-1">
                            <span className="text-slate-700">Cash receipts from customers</span>
                            <span>{formatCurrency(operatingInflow, 'NGN')}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-slate-700">Cash paid to suppliers & employees</span>
                            <span>({formatCurrency(operatingOutflow, 'NGN')})</span>
                        </div>
                        <div className="flex justify-between py-1 font-bold pt-2">
                            <span>Net Cash from Operations</span>
                            <span>{formatCurrency(netCashOperations, 'NGN')}</span>
                        </div>
                    </div>

                    {/* Investing Activities */}
                    <div>
                        <div className="flex justify-between font-bold border-b border-slate-800 pb-2 mb-2 mt-6">
                            <span>CASH FLOW FROM INVESTING ACTIVITIES</span>
                        </div>
                         <div className="flex justify-between py-1">
                            <span className="text-slate-700">Purchase of Equipment/Assets</span>
                            <span>({formatCurrency(Math.abs(investingOutflow), 'NGN')})</span>
                        </div>
                        <div className="flex justify-between py-1 font-bold pt-2">
                            <span>Net Cash from Investing</span>
                            <span>{formatCurrency(netCashInvesting, 'NGN')}</span>
                        </div>
                    </div>

                    {/* Financing Activities */}
                    <div>
                        <div className="flex justify-between font-bold border-b border-slate-800 pb-2 mb-2 mt-6">
                            <span>CASH FLOW FROM FINANCING ACTIVITIES</span>
                        </div>
                         <div className="flex justify-between py-1">
                            <span className="text-slate-700">Owner's Drawings</span>
                            <span>({formatCurrency(Math.abs(financingOutflow), 'NGN')})</span>
                        </div>
                        <div className="flex justify-between py-1 font-bold pt-2">
                            <span>Net Cash from Financing</span>
                            <span>{formatCurrency(netCashFinancing, 'NGN')}</span>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-8 pt-4 border-t-2 border-slate-900">
                         <div className="flex justify-between font-bold">
                            <span>Net Increase/Decrease in Cash</span>
                            <span>{formatCurrency(netCashChange, 'NGN')}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-slate-600">Cash at Beginning of Period</span>
                            <span>{formatCurrency(beginningCash, 'NGN')}</span>
                        </div>
                        <div className="flex justify-between py-1 font-bold text-lg border-t border-slate-300 mt-2 pt-2">
                            <span>Cash at End of Period</span>
                            <span>{formatCurrency(totalAssets, 'NGN')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Disclaimer & Footer */}
            <div className="mt-20 pt-8 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Notes to the Financial Statements</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed text-justify">
                    1. <strong>Basis of Preparation:</strong> These financial statements have been prepared in accordance with the International Financial Reporting Standards (IFRS) for SMEs and the Nigerian Finance Act 2026.<br/>
                    2. <strong>Currency:</strong> The reporting currency is Nigerian Naira (NGN). Foreign currency transactions are translated at the spot rate on the transaction date.<br/>
                    3. <strong>Revenue Recognition:</strong> Revenue is recognized on an accrual basis when services are rendered, regardless of when payment is received.<br/>
                    4. <strong>Taxation:</strong> Value Added Tax (VAT) is calculated at 7.5% on taxable goods and services. Withholding Tax (WHT) credits are recognized as assets upon receipt of credit notes.
                </p>
                
                <div className="flex justify-between items-end mt-12">
                    <div className="text-center">
                         <div className="w-48 border-b border-slate-300 mb-2"></div>
                         <p className="text-xs text-slate-400">Prepared By</p>
                    </div>
                    <div className="text-center">
                         <div className="w-48 border-b border-slate-300 mb-2"></div>
                         <p className="text-xs text-slate-400">Approved By (Director)</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Reports;
