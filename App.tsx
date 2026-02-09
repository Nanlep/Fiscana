import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Invoices from './components/Invoices';
import Ledger from './components/Ledger';
import Reports from './components/Reports';
import Assets from './components/Assets';
import TaxAdvisor from './components/TaxAdvisor';
import BudgetModule from './components/Budget';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import WithdrawModal from './components/WithdrawModal';
import KYCVerification from './components/KYCVerification';
import Toast, { ToastMessage, ToastType } from './components/Toast';
import { ViewState, Transaction, Invoice, TransactionType, InvoiceStatus, PaymentMethod, Asset, Liability, UserProfile, KYCRequest, ExpenseCategoryType, Budget } from './types';
import { Menu, Loader2 } from 'lucide-react';
import { DEFAULT_EXCHANGE_RATE } from './utils/currency';

function App() {
  // --- Use Auth Context ---
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  // Map Supabase user to local UserProfile type
  const userProfile: UserProfile | null = user ? {
    name: user.name,
    email: user.email,
    role: user.role,
    type: user.type,
    companyName: user.companyName || undefined,
    kycStatus: user.kycStatus,
    tier: user.tier
  } : null;

  // --- Exchange Rate State ---
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem('fiscana_exchange_rate');
    return saved ? parseFloat(saved) : DEFAULT_EXCHANGE_RATE;
  });

  useEffect(() => {
    localStorage.setItem('fiscana_exchange_rate', exchangeRate.toString());
  }, [exchangeRate]);

  // --- Global State for KYC Requests (Simulating Backend until KYC API is built) ---
  const [kycRequests, setKycRequests] = useState<KYCRequest[]>(() => {
    const saved = localStorage.getItem('fiscana_kyc_requests');
    return saved ? JSON.parse(saved) : [];
  });

  // App View State
  const [currentView, setView] = useState<ViewState>('DASHBOARD');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const notify = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Persistence Effect for KYC ---
  useEffect(() => {
    localStorage.setItem('fiscana_kyc_requests', JSON.stringify(kycRequests));
  }, [kycRequests]);

  // --- Seed Data Constants (empty for clean slate) ---
  const seedTransactions: Transaction[] = [];
  const seedInvoices: Invoice[] = [];
  const seedAssets: Asset[] = [];
  const seedBudgets: Budget[] = [];

  // --- State Initialization with Persistence ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('fiscana_transactions');
    return saved ? JSON.parse(saved) : seedTransactions;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('fiscana_invoices');
    return saved ? JSON.parse(saved) : seedInvoices;
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('fiscana_assets');
    return saved ? JSON.parse(saved) : seedAssets;
  });

  const [liabilities, setLiabilities] = useState<Liability[]>(() => {
    const saved = localStorage.getItem('fiscana_liabilities');
    return saved ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('fiscana_budgets');
    return saved ? JSON.parse(saved) : seedBudgets;
  });

  // --- Data Persistence Effects ---
  useEffect(() => { localStorage.setItem('fiscana_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('fiscana_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('fiscana_assets', JSON.stringify(assets)); }, [assets]);
  useEffect(() => { localStorage.setItem('fiscana_liabilities', JSON.stringify(liabilities)); }, [liabilities]);
  useEffect(() => { localStorage.setItem('fiscana_budgets', JSON.stringify(budgets)); }, [budgets]);


  // Derived Values
  const walletBalanceNGN = assets.find(a => a.id === 'wallet_ngn' || a.name === 'Wallet Balance')?.value || 0;
  const walletBalanceUSDC = assets.find(a => a.id === 'wallet_usdc' || a.name === 'USDC Balance')?.value || 0;

  // Handlers
  const handleLogout = async () => {
    await logout();
    notify('INFO', 'Logged out successfully');
  };

  // --- KYC Logic ---
  const handleKYCSubmit = (bvn: string, nin: string) => {
    if (!userProfile) return;

    const newRequest: KYCRequest = {
      id: `kyc_${Date.now()}`,
      userId: userProfile.email,
      userName: userProfile.name,
      userEmail: userProfile.email,
      bvn,
      nin,
      status: 'PENDING',
      date: new Date().toLocaleDateString()
    };

    setKycRequests(prev => [...prev, newRequest]);
    notify('SUCCESS', 'KYC Documents submitted for review.');
  };

  const handleKYCReview = (id: string, action: 'APPROVED' | 'REJECTED') => {
    setKycRequests(prev => prev.map(req =>
      req.id === id ? { ...req, status: action } : req
    ));
    notify(action === 'APPROVED' ? 'SUCCESS' : 'INFO', `Request ${action === 'APPROVED' ? 'Approved' : 'Rejected'}`);
  };

  // Helper to update wallet balance based on transaction
  const updateWalletForTransaction = (amount: number, currency: 'NGN' | 'USD', type: TransactionType) => {
    const targetAssetName = currency === 'NGN' ? 'Wallet Balance' : 'USDC Balance';

    setAssets(prevAssets => {
      const exists = prevAssets.find(a => a.name === targetAssetName);

      if (!exists) {
        return [...prevAssets, {
          id: currency === 'NGN' ? 'wallet_ngn' : 'wallet_usdc',
          name: targetAssetName,
          value: type === TransactionType.INCOME ? amount : -amount,
          currency: currency,
          type: currency === 'NGN' ? 'CASH' : 'CRYPTO'
        }];
      }

      return prevAssets.map(asset => {
        if (asset.name === targetAssetName) {
          const change = type === TransactionType.INCOME ? amount : -amount;
          return { ...asset, value: asset.value + change };
        }
        return asset;
      });
    });
  };

  const handleWithdraw = (amount: number, currency: 'NGN' | 'USDC', narration: string, category: ExpenseCategoryType) => {
    const targetAssetName = currency === 'NGN' ? 'Wallet Balance' : 'USDC Balance';
    setAssets(assets.map(asset => {
      if (asset.name === targetAssetName) {
        return { ...asset, value: asset.value - amount };
      }
      return asset;
    }));

    const newTx: Transaction = {
      id: `wd_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: narration ? `Withdrawal: ${narration}` : `Withdrawal to ${currency === 'NGN' ? 'Bank' : 'External Wallet'}`,
      payee: 'Self',
      amount: amount,
      currency: currency === 'NGN' ? 'NGN' : 'USD',
      type: TransactionType.EXPENSE,
      category: 'Transfer',
      expenseCategory: category,
      taxDeductible: false,
      tags: ['#Withdrawal']
    };
    setTransactions([newTx, ...transactions]);
    notify('SUCCESS', `Withdrawal of ${currency === 'NGN' ? '₦' : '$'}${amount} successful`);
  };

  const addInvoice = (inv: Invoice) => {
    setInvoices([inv, ...invoices]);
  };

  const recordPayment = (id: string, amount: number, date: string, note?: string) => {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;

    const newAmountPaid = (invoice.amountPaid || 0) + amount;
    const isFullyPaid = newAmountPaid >= invoice.totalAmount;
    const newStatus = isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    setInvoices(invoices.map(inv =>
      inv.id === id ? {
        ...inv,
        amountPaid: newAmountPaid,
        payments: [...(inv.payments || []), { id: `pay_${Date.now()}`, date, amount, note }],
        status: newStatus,
        paidDate: isFullyPaid ? date : undefined
      } : inv
    ));

    updateWalletForTransaction(amount, invoice.currency, TransactionType.INCOME);

    const newTx: Transaction = {
      id: `tx_pay_${Date.now()}`,
      date: date,
      description: `Payment for Invoice #${invoice.id} ${note ? `(${note})` : ''}`,
      payee: invoice.clientName,
      amount: amount,
      currency: invoice.currency,
      type: TransactionType.INCOME,
      category: 'Service Revenue',
      taxDeductible: false,
      tags: ['#PaymentReceived', `#Invoice-${invoice.id}`]
    };
    addTransaction(newTx);

    notify('SUCCESS', `Payment of ${invoice.currency === 'NGN' ? '₦' : '$'}${amount.toLocaleString()} recorded.`);
  };

  const addTransaction = (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
  };

  const addTransactions = (newTxs: Transaction[]) => {
    setTransactions(prev => [...newTxs, ...prev]);

    newTxs.forEach(t => {
      updateWalletForTransaction(t.amount, t.currency, t.type);
    });

    notify('SUCCESS', `${newTxs.length} transactions synced from bank.`);
  };

  const handleManualTransaction = (t: Transaction) => {
    addTransaction(t);
    updateWalletForTransaction(t.amount, t.currency, t.type);
    notify('SUCCESS', 'Transaction recorded and synced to wallet');
  };

  const addAsset = (a: Asset) => {
    setAssets([a, ...assets]);
    notify('SUCCESS', 'Asset added successfully');
  };

  const addLiability = (l: Liability) => {
    setLiabilities([l, ...liabilities]);
    notify('SUCCESS', 'Liability recorded');
  };

  const addBudget = (b: Budget) => {
    setBudgets([...budgets, b]);
    notify('SUCCESS', 'Budget limit set successfully');
  };

  const deleteBudget = (id: string) => {
    setBudgets(budgets.filter(b => b.id !== id));
    notify('INFO', 'Budget removed');
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render logic
  if (!isAuthenticated) {
    return (
      <>
        <Toast toasts={toasts} removeToast={removeToast} />
        <LandingPage onLoginSuccess={() => notify('SUCCESS', `Welcome to Fiscana!`)} />
      </>
    );
  }

  if (userProfile?.role === 'ADMIN') {
    return (
      <>
        <Toast toasts={toasts} removeToast={removeToast} />
        <AdminDashboard
          onLogout={handleLogout}
          adminProfile={userProfile}
          kycRequests={kycRequests}
          onReviewKYC={handleKYCReview}
          exchangeRate={exchangeRate}
          onUpdateExchangeRate={setExchangeRate}
        />
      </>
    );
  }

  // Normal User Dashboard Content
  const renderUserContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard transactions={transactions} invoices={invoices} user={userProfile} exchangeRate={exchangeRate} />;
      case 'INVOICES':
        return <Invoices
          invoices={invoices}
          user={userProfile}
          addInvoice={addInvoice}
          addTransaction={addTransaction}
          recordPayment={recordPayment}
          notify={notify}
        />;
      case 'LEDGER':
        return <Ledger
          transactions={transactions}
          addTransaction={handleManualTransaction}
          addTransactions={addTransactions}
          notify={notify}
        />;
      case 'BUDGETS':
        return <BudgetModule
          transactions={transactions}
          budgets={budgets}
          addBudget={addBudget}
          deleteBudget={deleteBudget}
          exchangeRate={exchangeRate}
        />;
      case 'REPORTS':
        return <Reports transactions={transactions} assets={assets} liabilities={liabilities} companyName={userProfile?.companyName || userProfile?.name} exchangeRate={exchangeRate} />;
      case 'ASSETS':
        return <Assets assets={assets} liabilities={liabilities} addAsset={addAsset} addLiability={addLiability} exchangeRate={exchangeRate} />;
      case 'TAX_AI':
        return <TaxAdvisor transactions={transactions} />;
      case 'KYC':
        return <KYCVerification user={userProfile!} onSubmit={handleKYCSubmit} />;
      default:
        return <Dashboard transactions={transactions} invoices={invoices} user={userProfile} exchangeRate={exchangeRate} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b border-slate-200 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-white">F</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Fiscana</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600">
          <Menu size={24} />
        </button>
      </div>

      <Sidebar
        currentView={currentView}
        setView={(view) => { setView(view); setIsMobileMenuOpen(false); }}
        onLogout={handleLogout}
        user={userProfile!}
        onWithdraw={() => { setIsWithdrawModalOpen(true); setIsMobileMenuOpen(false); }}
        walletBalanceNGN={walletBalanceNGN}
        walletBalanceUSDC={walletBalanceUSDC}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        {renderUserContent()}
      </main>

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onWithdraw={handleWithdraw}
        balanceNGN={walletBalanceNGN}
        balanceUSDC={walletBalanceUSDC}
      />
    </div>
  );
}

export default App;
