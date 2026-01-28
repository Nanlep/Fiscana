import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { Transaction, Invoice, UserProfile } from '../types';
import { normalizeToNGN, formatCurrency, EXCHANGE_RATE } from '../utils/currency';

interface DashboardProps {
  transactions: Transaction[];
  invoices: Invoice[];
  user: UserProfile | null;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, invoices, user }) => {
  // Real data calculations with Currency Normalization
  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, curr) => acc + normalizeToNGN(curr.amount, curr.currency), 0);

  // Exclude 'Transfer' and 'Drawings' from Operating Expenses
  const operatingExpenses = transactions
    .filter(t => t.type === 'EXPENSE' && t.category !== 'Transfer' && t.category !== 'Drawings')
    .reduce((acc, curr) => acc + normalizeToNGN(curr.amount, curr.currency), 0);

  const netIncome = totalIncome - operatingExpenses;

  // Process transactions for the chart (Normalized to NGN)
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data: Record<string, { name: string, income: number, expense: number }> = {};
    
    transactions.forEach(t => {
        if (t.category === 'Transfer' || t.category === 'Drawings') return;

        const date = new Date(t.date);
        const monthName = date.toLocaleString('default', { month: 'short' });
        
        if (!data[monthName]) {
            data[monthName] = { name: monthName, income: 0, expense: 0 };
        }
        
        // Normalize amounts for chart consistency
        const normalizedAmount = normalizeToNGN(t.amount, t.currency);

        if (t.type === 'INCOME') {
            data[monthName].income += normalizedAmount;
        } else {
            data[monthName].expense += normalizedAmount;
        }
    });

    return Object.values(data).sort((a, b) => {
        return months.indexOf(a.name) - months.indexOf(b.name);
    });
  }, [transactions]);

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Overview</h1>
          <p className="text-slate-500">Welcome back, {user?.name.split(' ')[0] || 'User'}</p>
        </div>
        <div className="flex flex-col items-end">
             <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full border border-green-200 mb-1">
                Tax Compliant (2026 Draft)
            </span>
            <span className="text-xs text-slate-400 font-mono">
                Base Rate: ₦{EXCHANGE_RATE}/$
            </span>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <ArrowUpRight className="text-green-600" size={24} />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">YTD Revenue</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Income (NGN Eqv)</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalIncome, 'NGN')}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <ArrowDownRight className="text-red-600" size={24} />
            </div>
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">Operating Costs</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Expenses (NGN Eqv)</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(operatingExpenses, 'NGN')}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Activity className="text-blue-600" size={24} />
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">Net Margin</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Net Profit (Before Tax)</p>
          <h3 className={`text-2xl font-bold mt-1 ${netIncome >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
            {formatCurrency(netIncome, 'NGN')}
          </h3>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Cash Flow Analysis (Normalized NGN)</h3>
          <div className="h-72">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(val) => `₦${val/1000}k`} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [formatCurrency(value, 'NGN'), '']}
                    />
                    <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={20} name="Income" />
                    <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} name="Op. Expense" />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                    No transaction data available yet.
                </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    t.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {t.type === 'INCOME' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{t.description}</p>
                    <p className="text-xs text-slate-500">{t.date} • {t.category}</p>
                  </div>
                </div>
                <div className={`font-bold ${t.type === 'INCOME' ? 'text-green-600' : 'text-slate-800'}`}>
                  {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount, t.currency)}
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
                 <div className="text-center text-slate-400 py-8">
                    No recent transactions.
                 </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
