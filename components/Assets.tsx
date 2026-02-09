
import React, { useState } from 'react';
import { Asset, Liability, AssetType, LiabilityType } from '../types';
import { Wallet, Landmark, Monitor, TrendingUp, Plus, X, Activity, AlertCircle, ShieldCheck, Percent, Briefcase, Home, Car, CreditCard, FileText, Box, Lightbulb, Smartphone, ShoppingCart, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { normalizeToNGN, formatCurrency } from '../utils/currency';

interface AssetsProps {
  assets: Asset[];
  liabilities: Liability[];
  addAsset: (a: Asset) => void;
  addLiability: (l: Liability) => void;
  exchangeRate: number;
}

const ASSET_CATEGORIES: Record<string, AssetType[]> = {
    "Liquid Assets": ["CASH", "BANK_ACCOUNT", "MONEY_MARKET"],
    "Digital Assets": ["CRYPTO", "NFT", "DIGITAL_WALLET"],
    "Investments": ["STOCKS", "BONDS", "MUTUAL_FUNDS", "ETF", "REIT", "INVESTMENT"],
    "Fixed Assets": ["REAL_ESTATE", "VEHICLE", "EQUIPMENT", "ELECTRONICS", "FURNITURE"],
    "Business Assets": ["INVENTORY", "RECEIVABLE", "INTELLECTUAL_PROPERTY"],
    "Other": ["OTHER"]
};

const LIABILITY_CATEGORIES: Record<string, LiabilityType[]> = {
    "Short Term Debt": ["CREDIT_CARD", "OVERDRAFT", "LOAN_SHORT_TERM", "PAYABLE", "TAX_LIABILITY"],
    "Long Term Debt": ["MORTGAGE", "LOAN", "LOAN_STUDENT", "LOAN_VEHICLE"],
    "Other": ["OTHER"]
};

const Assets: React.FC<AssetsProps> = ({ assets, liabilities, addAsset, addLiability, exchangeRate }) => {
  // Normalize everything to NGN for aggregation
  const totalAssets = assets.reduce((acc, curr) => acc + normalizeToNGN(curr.value, curr.currency, exchangeRate), 0);
  const totalLiabilities = liabilities.reduce((acc, curr) => acc + normalizeToNGN(curr.amount, curr.currency, exchangeRate), 0);
  const netWorth = totalAssets - totalLiabilities;

  const data = assets.map(a => ({ name: a.name, value: normalizeToNGN(a.value, a.currency, exchangeRate) }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  // Modal State
  const [modalType, setModalType] = useState<'ASSET' | 'LIABILITY' | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    assetType: 'CASH' as AssetType,
    liabilityType: 'LOAN' as LiabilityType,
    currency: 'NGN' as 'NGN' | 'USD'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;

    if (modalType === 'ASSET') {
        const newAsset: Asset = {
            id: `a_${Date.now()}`,
            name: formData.name,
            description: formData.description,
            value: parseFloat(formData.amount),
            currency: formData.currency,
            type: formData.assetType
        };
        addAsset(newAsset);
    } else {
        const newLiability: Liability = {
            id: `l_${Date.now()}`,
            name: formData.name,
            description: formData.description,
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            type: formData.liabilityType
        };
        addLiability(newLiability);
    }
    setModalType(null);
    setFormData({ name: '', description: '', amount: '', assetType: 'CASH', liabilityType: 'LOAN', currency: 'NGN' });
  };

  // Helper to get Icon based on type
  const getIcon = (type: string) => {
      switch(type) {
          // Assets
          case 'CASH': case 'BANK_ACCOUNT': return <Landmark size={18} />;
          case 'CRYPTO': case 'DIGITAL_WALLET': return <Wallet size={18} />;
          case 'REAL_ESTATE': case 'REIT': return <Home size={18} />;
          case 'VEHICLE': return <Car size={18} />;
          case 'EQUIPMENT': case 'ELECTRONICS': return <Monitor size={18} />;
          case 'STOCKS': case 'ETF': case 'MUTUAL_FUNDS': return <TrendingUp size={18} />;
          case 'INTELLECTUAL_PROPERTY': return <Lightbulb size={18} />;
          case 'INVENTORY': return <Box size={18} />;
          // Liabilities
          case 'CREDIT_CARD': return <CreditCard size={18} />;
          case 'MORTGAGE': return <Home size={18} />;
          case 'TAX_LIABILITY': return <FileText size={18} />;
          case 'LOAN_VEHICLE': return <Car size={18} />;
          default: return <Layers size={18} />;
      }
  };

  const getReadableType = (type: string) => {
      return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  // Analysis Logic
  const liquidAssets = assets.filter(a => ['CASH', 'BANK_ACCOUNT', 'MONEY_MARKET', 'CRYPTO'].includes(a.type)).reduce((acc, curr) => acc + normalizeToNGN(curr.value, curr.currency, exchangeRate), 0);
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  
  const isSolvent = totalAssets >= totalLiabilities;
  
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
                <p className="text-slate-500">Your detailed personal balance sheet (Base: NGN)</p>
            </div>
            <div className="flex items-center space-x-4">
                <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Net Worth (Est.)</p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(netWorth, 'NGN')}</p>
                </div>
                 <div className="flex space-x-2">
                    <button 
                        onClick={() => { setModalType('ASSET'); setFormData({name: '', description: '', amount: '', assetType: 'CASH', liabilityType: 'LOAN', currency: 'NGN'}); }}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                        title="Add Asset"
                    >
                        <Plus size={20} />
                    </button>
                    <button 
                        onClick={() => { setModalType('LIABILITY'); setFormData({name: '', description: '', amount: '', assetType: 'CASH', liabilityType: 'LOAN', currency: 'NGN'}); }}
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
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Assets Breakdown</h3>
                    <span className="text-green-600 font-bold">{formatCurrency(totalAssets, 'NGN')}</span>
                </div>
                <div className="h-64 flex items-center justify-center mb-4">
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
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [formatCurrency(value, 'NGN'), 'Value']} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="text-slate-400">No assets recorded</div>
                    )}
                </div>
                <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-2" style={{maxHeight: '400px'}}>
                    {assets.map((asset) => (
                        <div key={asset.id} className="group relative p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {getIcon(asset.type)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{asset.name}</p>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{getReadableType(asset.type)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="font-bold text-slate-700">{formatCurrency(asset.value, asset.currency)}</div>
                            </div>
                            {asset.description && (
                                <p className="text-xs text-slate-500 mt-2 pl-12 border-l-2 border-slate-200 ml-3 italic">
                                    {asset.description}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Liabilities & Net Worth */}
             <div className="space-y-6 flex flex-col h-full">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Liabilities</h3>
                        <span className="text-red-600 font-bold">{formatCurrency(totalLiabilities, 'NGN')}</span>
                    </div>
                    {liabilities.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex-1 flex items-center justify-center">
                            Debt free! No liabilities recorded.
                        </div>
                    ) : (
                        <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2" style={{maxHeight: '400px'}}>
                             {liabilities.map((l) => (
                                <div key={l.id} className="p-3 bg-red-50 rounded-xl border border-red-100 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-white text-red-500 rounded-lg border border-red-100">
                                                {getIcon(l.type || 'LOAN')}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-red-900">{l.name}</p>
                                                {l.type && <span className="text-xs text-red-400 font-medium bg-white px-1.5 py-0.5 rounded border border-red-100">{getReadableType(l.type)}</span>}
                                            </div>
                                        </div>
                                        <span className="font-bold text-red-700">{formatCurrency(l.amount, l.currency)}</span>
                                    </div>
                                    {l.description && (
                                        <p className="text-xs text-red-600/70 mt-2 pl-12 border-l-2 border-red-200 ml-3 italic">
                                            {l.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-gradient-to-br from-green-600 to-teal-700 p-6 rounded-2xl shadow-lg text-white">
                    <h3 className="font-semibold mb-2 flex items-center"><TrendingUp className="mr-2"/> Financial Health</h3>
                    <p className="text-green-100 text-sm mb-4">
                        Your debt-to-asset ratio is {debtRatio.toFixed(1)}%. {health.desc}
                        Net Worth is calculated by converting foreign assets to NGN at current rates.
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
                <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
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
                                placeholder={modalType === 'ASSET' ? "e.g. Bitcoin Wallet, Toyota Camry" : "e.g. Student Loan, Credit Card Balance"}
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>

                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Category / Type
                            </label>
                            <select 
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none custom-select"
                                value={modalType === 'ASSET' ? formData.assetType : formData.liabilityType}
                                onChange={e => {
                                    if (modalType === 'ASSET') setFormData({...formData, assetType: e.target.value as AssetType});
                                    else setFormData({...formData, liabilityType: e.target.value as LiabilityType});
                                }}
                            >
                                {modalType === 'ASSET' ? (
                                    Object.entries(ASSET_CATEGORIES).map(([group, types]) => (
                                        <optgroup key={group} label={group}>
                                            {types.map(t => (
                                                <option key={t} value={t}>{getReadableType(t)}</option>
                                            ))}
                                        </optgroup>
                                    ))
                                ) : (
                                    Object.entries(LIABILITY_CATEGORIES).map(([group, types]) => (
                                        <optgroup key={group} label={group}>
                                            {types.map(t => (
                                                <option key={t} value={t}>{getReadableType(t)}</option>
                                            ))}
                                        </optgroup>
                                    ))
                                )}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Value / Amount</label>
                                <input 
                                    type="number" 
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={e => setFormData({...formData, amount: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                                <select 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.currency}
                                    onChange={e => setFormData({...formData, currency: e.target.value as 'NGN' | 'USD'})}
                                >
                                    <option value="NGN">NGN</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Description (Optional)</label>
                            <textarea 
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                                placeholder={modalType === 'ASSET' ? "e.g. 2021 Model, 50k mileage, Good condition" : "e.g. 15% Interest rate, due monthly"}
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </div>

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
                                 <p className="text-xs text-slate-500">Real-time analysis based on your ledger (Normalized to NGN).</p>
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
                                     ? `You have ${formatCurrency(totalAssets - totalLiabilities, 'NGN')} in surplus capital.` 
                                     : `Liabilities exceed assets by ${formatCurrency(totalLiabilities - totalAssets, 'NGN')}.`}
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
                                        <span className="text-sm font-bold text-slate-900">{formatCurrency(liquidAssets, 'NGN')}</span>
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
                                        <span><strong>Crypto Assets:</strong> Ensure you log the acquisition date. Holdings {'>'}12 months may qualify for Long Term Capital Gains (LTCG) at 10% instead of standard income rates.</span>
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
                                    <span><strong>Net Worth:</strong> Your net worth of {formatCurrency(netWorth, 'NGN')} puts you in the {netWorth > 10000000 ? 'High' : 'Standard'} Net Worth Individual bracket for tax assessment.</span>
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
