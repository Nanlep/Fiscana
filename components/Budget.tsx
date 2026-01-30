import React, { useState, useMemo } from 'react';
import { Transaction, Budget, ExpenseCategoryType } from '../types';
import { Plus, X, Briefcase, User, Target, TrendingUp, AlertTriangle, CheckCircle, PieChart, DollarSign, Wallet } from 'lucide-react';
import { normalizeToNGN, formatCurrency } from '../utils/currency';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';

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
  
  // New Budget Form State
  const [newCategory, setNewCategory] = useState('');
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

  // Calculations for Summary
  const totalBudgeted = activeBudgets.reduce((acc, b) => acc + normalizeToNGN(b.limit, b.currency, exchangeRate), 0);
  
  const totalSpent = currentMonthTransactions.reduce((acc, t) => acc + normalizeToNGN(t.amount, t.currency, exchangeRate), 0);
  
  const totalVariance = totalBudgeted - totalSpent;
  const percentageUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  // Categories for Form
  const businessCategories = ['Rent', 'Utilities', 'Office Supplies', 'Equipment', 'Software', 'Marketing', 'Legal', 'Education', 'Bank Fees', 'Travel', 'Contractors'];
  const personalCategories = ['Groceries', 'Housing', 'Utilities', 'Healthcare', 'Transportation', 'Entertainment', 'Dining Out', 'Shopping', 'Travel', 'Drawings'];

  const handleCreate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategory || !newLimit) return;

      const budget: Budget = {
          id: `bdg_${Date.now()}`,
          category: newCategory,
          limit: parseFloat(newLimit),
          currency: newCurrency,
          type: viewType,
          period: 'MONTHLY'
      };
      
      addBudget(budget);
      setIsModalOpen(false);
      setNewCategory('');
      setNewLimit('');
  };

  // Helper to get spent amount for a specific budget category
  const getSpentForCategory = (category: string) => {
      return currentMonthTransactions
        .filter(t => t.category === category)
        .reduce((acc, t) => acc + normalizeToNGN(t.amount, t.currency, exchangeRate), 0);
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
  const CHART_COLORS = ['#3b82f6', '#e2e8f0'];

  return (
    <div className="p-8 space-y-8 animate-fade-in">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Budgeting & Variance Analysis</h1>
                <p className="text-slate-500">Track budgeted vs. actual expenses for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
                 <button 
                    onClick={() => setViewType('BUSINESS')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all ${viewType === 'BUSINESS' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                    <Briefcase size={16} /> <span>Business</span>
                 </button>
                 <button 
                    onClick={() => setViewType('PERSONAL')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-all ${viewType === 'PERSONAL' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                    <User size={16} /> <span>Personal</span>
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

        {/* Budget List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Category Breakdown</h3>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                    <Plus size={16} /> <span>Set Budget Limit</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {activeBudgets.map((budget) => {
                    const spent = getSpentForCategory(budget.category);
                    const normalizedLimit = normalizeToNGN(budget.limit, budget.currency, exchangeRate);
                    const pct = (spent / normalizedLimit) * 100;
                    const remaining = normalizedLimit - spent;

                    return (
                        <div key={budget.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow relative">
                            <button 
                                onClick={() => deleteBudget(budget.id)}
                                className="absolute top-3 right-3 text-slate-300 hover:text-red-500"
                            >
                                <X size={16} />
                            </button>
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-800">{budget.category}</h4>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{budget.period} Limit</p>
                                </div>
                                {pct > 100 ? (
                                    <AlertTriangle className="text-red-500" size={20} />
                                ) : (
                                    <CheckCircle className="text-green-500" size={20} />
                                )}
                            </div>

                            <div className="flex items-end justify-between mb-2">
                                <span className="text-2xl font-bold text-slate-900">{formatCurrency(spent, 'NGN')}</span>
                                <span className="text-xs font-medium text-slate-500 mb-1">of {formatCurrency(normalizedLimit, 'NGN')}</span>
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                                <div 
                                    className={`h-2.5 rounded-full transition-all duration-500 ${getStatusColor(pct)}`} 
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                ></div>
                            </div>
                            
                            <div className="flex justify-between text-xs">
                                <span className={pct > 100 ? 'text-red-600 font-bold' : 'text-slate-500'}>
                                    {pct.toFixed(0)}% Utilized
                                </span>
                                <span className={remaining < 0 ? 'text-red-600 font-bold' : 'text-slate-500'}>
                                    {remaining < 0 ? `${formatCurrency(Math.abs(remaining), 'NGN')} Over` : `${formatCurrency(remaining, 'NGN')} Left`}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {/* Create New Card Placeholder */}
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors min-h-[160px]"
                >
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                        <Plus size={20} />
                    </div>
                    <span className="font-medium">Add Category Limit</span>
                </button>
            </div>
        </div>

        {/* Create Modal */}
        {isModalOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
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
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                required
                            >
                                <option value="">Select Category...</option>
                                {(viewType === 'BUSINESS' ? businessCategories : personalCategories).map(cat => (
                                    <option key={cat} value={cat} disabled={activeBudgets.some(b => b.category === cat)}>
                                        {cat} {activeBudgets.some(b => b.category === cat) ? '(Set)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
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