import React, { useState } from 'react';
import { Asset, Liability } from '../types';
import { Wallet, Landmark, Monitor, TrendingUp, Plus, X, Briefcase, Activity, AlertCircle, ShieldCheck, Percent } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AssetsProps {
  assets: Asset[];
  liabilities: Liability[];
  addAsset: (a: Asset) => void;
  addLiability: (l: Liability) => void;
}

const Assets: React.FC<AssetsProps> = ({ assets, liabilities, addAsset, addLiability }) => {
  const totalAssets = assets.reduce((acc, curr) => acc + curr.value, 0);
  const totalLiabilities = liabilities.reduce((acc, curr) => acc + curr.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  const data = assets.map(a => ({ name: a.type, value: a.value }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Modal State
  const [modalType, setModalType] = useState<'ASSET' | 'LIABILITY' | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    type: 'CASH',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;

    if (modalType === 'ASSET') {
        const newAsset: Asset = {
            id: `a_${Date.now()}`,
            name: formData.name,
            value: parseFloat(formData.amount),
            currency: 'NGN',
            type: formData.type as any
        };
        addAsset(newAsset);
    } else {
        const newLiability: Liability = {
            id: `l_${Date.now()}`,
            name: formData.name,
            amount: parseFloat(formData.amount),
            currency: 'NGN'
        };
        addLiability(newLiability);
    }
    setModalType(null);
    setFormData({ name: '', amount: '', type: 'CASH' });
  };

  // Analysis Logic
  const liquidAssets = assets.filter(a => a.type === 'CASH' || a.type === 'CRYPTO').reduce((acc, curr) => acc + curr.value, 0);
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  
  // Solvency: Can assets cover liabilities?
  const isSolvent = totalAssets >= totalLiabilities;
  
  // Health Status
  const getHealthStatus = () => {
      if (debtRatio > 70) return { color: 'text-red-600', bg: 'bg-red-50', text: 'Critical', desc: 'High debt leverage. Priority: Debt Reduction.' };
      if (debtRatio > 40) return { color: 'text-amber-600', bg: 'bg-amber-50', text: 'Moderate', desc: 'Manageable debt, but monitor spending.' };
      return { color: 'text-green-600', bg: 'bg-green-50', text: 'Excellent', desc: 'Strong financial position. Focus on Growth.' };
  };

  const health = getHealthStatus();

  return (
    <div className="p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Assets & Liabilities</h1>
                <p className="text-slate-500">Your personal balance sheet</p>
            </div>
            <div className="flex items-center space-x-4">
                <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Net Worth</p>
                    <p className="text-2xl font-bold text-slate-800">₦ {netWorth.toLocaleString()}</p>
                </div>
                 <div className="flex space-x-2">
                    <button 
                        onClick={() => { setModalType('ASSET'); setFormData({name: '', amount: '', type: 'CASH'}); }}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                        title="Add Asset"
                    >
                        <Plus size={20} />
                    </button>
                    <button 
                        onClick={() => { setModalType('LIABILITY'); setFormData({name: '', amount: '', type: 'CASH'}); }}
                        className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                        title="Add Liability"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Assets Breakdown</h3>
                    <span className="text-green-600 font-bold">₦ {totalAssets.toLocaleString()}</span>
                </div>
                <div className="h-64 flex items-center justify-center">
                    {assets.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Value']} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="text-slate-400">No assets recorded</div>
                    )}
                </div>
                <div className="space-y-3 mt-4 max-h-60 overflow-y-auto">
                    {assets.map((asset, i) => (
                        <div key={asset.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    {asset.type === 'CRYPTO' ? <Wallet size={16}/> : 
                                     asset.type === 'EQUIPMENT' ? <Monitor size={16}/> : 
                                     asset.type === 'INVESTMENT' ? <TrendingUp size={16}/> :
                                     <Landmark size={16}/>}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">{asset.name}</p>
                                    <p className="text-xs text-slate-500">{asset.type}</p>
                                </div>
                            </div>
                            <div className="font-bold text-slate-700">₦ {asset.value.toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Liabilities & Net Worth */}
             <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Liabilities</h3>
                        <span className="text-red-600 font-bold">₦ {totalLiabilities.toLocaleString()}</span>
                    </div>
                    {liabilities.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Debt free! No liabilities recorded.
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                             {liabilities.map((l) => (
                                <div key={l.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                                    <span className="font-medium text-red-900">{l.name}</span>
                                    <span className="font-bold text-red-700">₦ {l.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-gradient-to-br from-green-600 to-teal-700 p-6 rounded-2xl shadow-lg text-white">
                    <h3 className="font-semibold mb-2 flex items-center"><TrendingUp className="mr-2"/> Financial Health</h3>
                    <p className="text-green-100 text-sm mb-4">
                        Your debt-to-asset ratio is {debtRatio.toFixed(1)}%. {health.desc}
                        Based on the 2026 proposed capital gains tax, your crypto assets held for over 12 months may qualify for a reduced rate.
                    </p>
                    <button 
                        onClick={() => setIsAnalysisOpen(true)}
                        className="bg-white/20 hover:bg-white/30 transition-colors text-white px-4 py-2 rounded-lg text-sm font-medium w-full text-center flex items-center justify-center space-x-2"
                    >
                        <Activity size={16} /> <span>View Detailed Analysis</span>
                    </button>
                </div>
             </div>
        </div>

        {/* Input Modal */}
        {modalType && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900">
                            Add {modalType === 'ASSET' ? 'Asset' : 'Liability'}
                        </h3>
                        <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input 
                                type="text" 
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder={modalType === 'ASSET' ? "e.g. Bitcoin, Laptop" : "e.g. Loan, Credit Card"}
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Value (₦)</label>
                            <input 
                                type="number" 
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({...formData, amount: e.target.value})}
                            />
                        </div>

                        {modalType === 'ASSET' && (
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                <select 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.type}
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                >
                                    <option value="CASH">Cash / Bank</option>
                                    <option value="CRYPTO">Crypto</option>
                                    <option value="EQUIPMENT">Equipment</option>
                                    <option value="INVESTMENT">Investment</option>
                                </select>
                            </div>
                        )}

                        <button 
                            type="submit"
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
                        >
                            Save {modalType === 'ASSET' ? 'Asset' : 'Liability'}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Detailed Analysis Modal */}
        {isAnalysisOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                        <div className="flex items-center space-x-2">
                             <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                <Activity size={20} />
                             </div>
                             <div>
                                 <h3 className="text-xl font-bold text-slate-900">Financial Health Report</h3>
                                 <p className="text-xs text-slate-500">Real-time analysis based on your ledger.</p>
                             </div>
                        </div>
                        <button onClick={() => setIsAnalysisOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                             <div className={`p-4 rounded-xl border ${health.bg} border-opacity-50`}>
                                <p className="text-sm font-semibold text-slate-600 mb-1">Health Status</p>
                                <h4 className={`text-2xl font-bold ${health.color} flex items-center`}>
                                    {health.text}
                                    <ShieldCheck className="ml-2" size={20} />
                                </h4>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{health.desc}</p>
                             </div>
                             <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                                <p className="text-sm font-semibold text-slate-600 mb-1">Solvency Check</p>
                                <h4 className={`text-2xl font-bold ${isSolvent ? 'text-blue-600' : 'text-red-600'} flex items-center`}>
                                    {isSolvent ? 'Solvent' : 'Insolvent'}
                                    {isSolvent ? <AlertCircle className="ml-2 text-blue-600" size={20} /> : <AlertCircle className="ml-2 text-red-600" size={20} />}
                                </h4>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                    {isSolvent 
                                     ? `You have ₦${(totalAssets - totalLiabilities).toLocaleString()} in surplus capital.` 
                                     : `Liabilities exceed assets by ₦${(totalLiabilities - totalAssets).toLocaleString()}.`}
                                </p>
                             </div>
                        </div>

                        {/* Ratios */}
                        <div>
                             <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                                <Percent className="mr-2 text-slate-400" size={18}/> Key Financial Ratios
                             </h4>
                             <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium text-slate-700">Debt-to-Asset Ratio</span>
                                        <span className="text-sm font-bold text-slate-900">{debtRatio.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                                        <div className={`h-2.5 rounded-full ${health.color.replace('text', 'bg')}`} style={{ width: `${Math.min(debtRatio, 100)}%` }}></div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Lower is better. Measures financial leverage.</p>
                                </div>
                                
                                <div>
                                     <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium text-slate-700">Liquidity (Cash & Crypto)</span>
                                        <span className="text-sm font-bold text-slate-900">₦ {liquidAssets.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                                         <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min((liquidAssets / totalAssets) * 100, 100)}%` }}></div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">{((liquidAssets/totalAssets)*100).toFixed(1)}% of your assets are liquid.</p>
                                </div>
                             </div>
                        </div>

                        {/* Tax Insights */}
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                             <h4 className="font-bold text-indigo-900 mb-3 flex items-center">
                                <Briefcase className="mr-2 text-indigo-600" size={18}/> 2026 Tax Strategy Insights
                             </h4>
                             <ul className="space-y-2 text-sm text-indigo-800">
                                {assets.some(a => a.type === 'CRYPTO') && (
                                    <li className="flex items-start">
                                        <span className="mr-2 mt-1 w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></span>
                                        <span><strong>Crypto Assets:</strong> Ensure you log the acquisition date. Holdings >12 months may qualify for Long Term Capital Gains (LTCG) at 10% instead of standard income rates.</span>
                                    </li>
                                )}
                                {assets.some(a => a.type === 'EQUIPMENT') && (
                                    <li className="flex items-start">
                                        <span className="mr-2 mt-1 w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></span>
                                        <span><strong>Equipment:</strong> Capital allowances can be claimed on hardware. Currently, 25% annual depreciation is standard for IT equipment.</span>
                                    </li>
                                )}
                                 <li className="flex items-start">
                                    <span className="mr-2 mt-1 w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></span>
                                    <span><strong>Net Worth:</strong> Your net worth of ₦{netWorth.toLocaleString()} puts you in the {netWorth > 10000000 ? 'High' : 'Standard'} Net Worth Individual bracket for tax assessment.</span>
                                </li>
                             </ul>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                        <button 
                            onClick={() => setIsAnalysisOpen(false)}
                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-lg"
                        >
                            Close Report
                        </button>
                    </div>
                </div>
             </div>
        )}
    </div>
  );
};

export default Assets;