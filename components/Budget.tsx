
import React, { useState, useMemo } from 'react';
import { Transaction, Budget, ExpenseCategoryType } from '../types';
import { Plus, X, Briefcase, User, Target, TrendingUp, AlertTriangle, CheckCircle, PieChart, DollarSign, Wallet, Download, FileText, Printer } from 'lucide-react';
import { normalizeToNGN, formatCurrency } from '../utils/currency';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import { EXPENSE_CATEGORIES } from '../utils/categories';

interface BudgetProps {
  transactions: Transaction[];
  budgets: Budget[];
  addBudget: (b: Budget) => void;
  deleteBudget: (id: string) => void;
  exchangeRate: number;
}

const BudgetModule: React.FC<BudgetProps> = ({ transactions, budgets, addBudget, deleteBudget, exchangeRate }) => {
  const [viewType, setViewType] = useState<ExpenseCategoryType>('BUSINESS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // New Budget Form State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newCurrency, setNewCurrency] = useState<'NGN' | 'USD'>('NGN');

  // Filter Budgets by current view
  const activeBudgets = budgets.filter(b => b.type === viewType);

  // Filter Transactions by current month and type
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && 
               tDate.getFullYear() === currentYear && 
               t.type === 'EXPENSE' && 
               t.expenseCategory === viewType;
    });
  }, [transactions, viewType]);

  // Helper to get spent amount for a specific budget category
  const getSpentForCategory = (category: string) => {
    return currentMonthTransactions
      .filter(t => t.category === category)
      .reduce((acc, t) => acc + normalizeToNGN(t.amount, t.currency, exchangeRate), 0);
  };

  // Calculations for Summary
  const totalBudgeted = activeBudgets.reduce((acc, b) => acc + normalizeToNGN(b.limit, b.currency, exchangeRate), 0);
  const totalSpent = currentMonthTransactions.reduce((acc, t) => acc + normalizeToNGN(t.amount, t.currency, exchangeRate), 0);
  const totalVariance = totalBudgeted - totalSpent;
  const percentageUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  // Use Centralized Categories
  const availableCategories = EXPENSE_CATEGORIES.filter(c => c.subType === viewType).map(c => c.name).sort();

  const handleCreate = (e: React.FormEvent) => {
      e.preventDefault();
      const finalCategory = selectedCategory === 'Other' ? customCategory.trim() : selectedCategory;
      if (!finalCategory || !newLimit) return;

      const budget: Budget = {
          id: `bdg_${Date.now()}`,
          category: finalCategory,
          limit: parseFloat(newLimit),
          currency: newCurrency,
          type: viewType,
          period: 'MONTHLY'
      };
      
      addBudget(budget);
      setIsModalOpen(false);
      setSelectedCategory('');
      setCustomCategory('');
      setNewLimit('');
  };

  const getStatusColor = (pct: number) => {
      if (pct >= 100) return 'bg-red-500';
      if (pct >= 75) return 'bg-amber-500';
      return 'bg-green-500';
  };

  const chartData = [
      { name: 'Spent', value: totalSpent },
      { name: 'Remaining', value: Math.max(0, totalVariance) }
  ];

  // --- EXPORT FUNCTIONALITY ---

  const handleExportCSV = () => {
    const headers = ['Category', 'Type', 'Period', 'Budgeted (NGN)', 'Actual (NGN)', 'Variance (NGN)', '% Used', 'Status'];
    
    const rows = activeBudgets.map(b => {
        const spent = getSpentForCategory(b.category);
        const limit = normalizeToNGN(b.limit, b.currency, exchangeRate);
        const variance = limit - spent;
        const pct = (spent / limit) * 100;
        const status = pct > 100 ? 'Over Budget' : pct > 80 ? 'Warning' : 'Good';
        
        return [
            `"${b.category}"`,
            b.type,
            b.period,
            limit.toFixed(2),
            spent.toFixed(2),
            variance.toFixed(2),
            `${pct.toFixed(2)}%`,
            status
        ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${viewType}_Budget_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
      if (!window.html2pdf) {
          alert("PDF generator loading. Please try again in a moment.");
          return;
      }
      setIsExporting(true);
      const element = document.getElementById('budget-report-print');
      const opt = {
          margin: 10,
          filename: `${viewType}_Budget_Performance_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      try {
        await window.html2pdf().set(opt).from(element).save();
      } catch (e) {
          console.error(e);
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Budgeting & Variance Analysis</h1>
                <p className="text-slate-500">Track budgeted vs. actual expenses for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex flex-wrap gap-2">
                 <button 
                    onClick={() => setViewType('BUSINESS')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all ${viewType === 'BUSINESS' ? 'bg-white text-blue-700 shadow-sm border border-blue-100' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                 >
                    <Briefcase size={16} /> <span>Business</span>
                 </button>
                 <button 
                    onClick={() => setViewType('PERSONAL')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all ${viewType === 'PERSONAL' ? 'bg-white text-purple-700 shadow-sm border border-purple-100' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}
                 >
                    <User size={16} /> <span>Personal</span>
                 </button>
                 
                 <div className="h-6 w-px bg-slate-300 mx-1 self-center hidden md:block"></div>

                 <button 
                    onClick={handleExportCSV}
                    className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center space-x-2"
                 >
                    <Download size={16} /> <span className="hidden md:inline">Export CSV</span>
                 </button>
                 <button 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center space-x-2 shadow-lg"
                 >
                    {isExporting ? <Printer size={16} className="animate-pulse"/> : <FileText size={16} />} 
                    <span className="hidden md:inline">{isExporting ? 'Generating...' : 'Export Report'}</span>
                 </button>
            </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-slate-100 rounded-xl">
                            <Target className="text-slate-600" size={24} />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded">Monthly Budget</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Total Budgeted Limit</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalBudgeted, 'NGN')}</h3>
                </div>
                 <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-slate-400">
                    Calculated in base currency (NGN)
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div>
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <TrendingUp className="text-blue-600" size={24} />
                        </div>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">Actuals</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Total Spent (MTD)</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalSpent, 'NGN')}</h3>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                            className={`h-2 rounded-full ${getStatusColor(percentageUsed)}`} 
                            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-right mt-1 font-medium">{percentageUsed.toFixed(1)}% Used</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-2 mb-2">
                        <Wallet size={20} className="text-green-600" />
                        <h3 className="font-bold text-slate-700">Remaining Budget</h3>
                    </div>
                    <p className={`text-3xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalVariance, 'NGN')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {totalVariance >= 0 ? 'You are within budget.' : 'You have exceeded your budget.'}
                    </p>
                </div>
                <div className="h-24 w-24">
                     <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={25}
                                outerRadius={40}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                <Cell key="cell-0" fill={percentageUsed > 100 ? '#ef4444' : '#3b82f6'} />
                                <Cell key="cell-1" fill="#f1f5f9" />
                            </Pie>
                        </RePieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Budget Performance Report Table (Best Practice View) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="budget-report-print">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Budget Performance Report</h3>
                    <p className="text-xs text-slate-500">Variance Analysis (Month-to-Date)</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-lg"
                >
                    <Plus size={16} /> <span>Set Limit</span>
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-semibold text-xs">
                        <tr>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4 text-right">Budgeted</th>
                            <th className="px-6 py-4 text-right">Actual</th>
                            <th className="px-6 py-4 text-right">Variance</th>
                            <th className="px-6 py-4 text-center">% Used</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-center print:hidden">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeBudgets.map((budget) => {
                            const spent = getSpentForCategory(budget.category);
                            const normalizedLimit = normalizeToNGN(budget.limit, budget.currency, exchangeRate);
                            const variance = normalizedLimit - spent;
                            const pct = (spent / normalizedLimit) * 100;

                            return (
                                <tr key={budget.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{budget.category}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-600">{formatCurrency(normalizedLimit, 'NGN')}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-900">{formatCurrency(spent, 'NGN')}</td>
                                    <td className={`px-6 py-4 text-right font-mono font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {variance < 0 ? `(${formatCurrency(Math.abs(variance), 'NGN')})` : formatCurrency(variance, 'NGN')}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div className={`h-1.5 rounded-full ${getStatusColor(pct)}`} style={{width: `${Math.min(pct, 100)}%`}}></div>
                                            </div>
                                            <span className="text-xs text-slate-500">{pct.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {pct > 100 ? (
                                            <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded border border-red-100">OVER</span>
                                        ) : (
                                            <span className="bg-green-50 text-green-600 text-xs font-bold px-2 py-1 rounded border border-green-100">OK</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center print:hidden">
                                        <button 
                                            onClick={() => deleteBudget(budget.id)}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="Remove Budget"
                                        >
                                            <X size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {activeBudgets.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                    No budget limits set for {viewType.toLowerCase()} expenses.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                        <tr>
                            <td className="px-6 py-4">TOTALS</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCurrency(totalBudgeted, 'NGN')}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCurrency(totalSpent, 'NGN')}</td>
                            <td className={`px-6 py-4 text-right font-mono ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {totalVariance < 0 ? `(${formatCurrency(Math.abs(totalVariance), 'NGN')})` : formatCurrency(totalVariance, 'NGN')}
                            </td>
                            <td colSpan={3}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        {/* Create Modal */}
        {isModalOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900">
                            Set {viewType === 'BUSINESS' ? 'Operating' : 'Living'} Budget
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select 
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                                required
                            >
                                <option value="">Select Category...</option>
                                {availableCategories.map(cat => (
                                    <option key={cat} value={cat} disabled={activeBudgets.some(b => b.category === cat)}>
                                        {cat} {activeBudgets.some(b => b.category === cat) ? '(Set)' : ''}
                                    </option>
                                ))}
                                <option value="Other">Other (Specify below)</option>
                            </select>
                        </div>

                        {selectedCategory === 'Other' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Specify Category Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="e.g. Charity, Annual Fees"
                                    value={customCategory}
                                    onChange={e => setCustomCategory(e.target.value)}
                                />
                            </div>
                        )}
                        
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Limit Amount</label>
                                <input 
                                    type="number" 
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="0.00"
                                    value={newLimit}
                                    onChange={e => setNewLimit(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                                <select 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    value={newCurrency}
                                    onChange={e => setNewCurrency(e.target.value as 'NGN' | 'USD')}
                                >
                                    <option value="NGN">NGN</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button 
                                type="submit"
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
                            >
                                Set Budget
                            </button>
                        </div>
                    </form>
                </div>
             </div>
        )}
    </div>
  );
};

export default BudgetModule;
