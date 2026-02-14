import React, { useState, useEffect, useCallback } from 'react';
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
import AddFundsModal from './components/AddFundsModal';
import KYCVerification from './components/KYCVerification';
import Toast, { ToastMessage, ToastType } from './components/Toast';
import { ViewState, Transaction, Invoice, TransactionType, InvoiceStatus, PaymentMethod, Asset, Liability, UserProfile, KYCRequest, ExpenseCategoryType, Budget, WalletBalance } from './types';
import { Menu, Loader2 } from 'lucide-react';
import { DEFAULT_EXCHANGE_RATE } from './utils/currency';
import { transactionsApi, invoicesApi, assetsApi, liabilitiesApi, budgetsApi, kycApi, paymentsApi } from './services/apiClient';

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

  // --- Exchange Rate State (still localStorage — not user-specific data) ---
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem('fiscana_exchange_rate');
    return saved ? parseFloat(saved) : DEFAULT_EXCHANGE_RATE;
  });

  useEffect(() => {
    localStorage.setItem('fiscana_exchange_rate', exchangeRate.toString());
  }, [exchangeRate]);

  // --- State (loaded from API on mount) ---
  const [kycRequests, setKycRequests] = useState<KYCRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // App View State
  const [currentView, setView] = useState<ViewState>('DASHBOARD');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const notify = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Load all data from API on mount ---
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    setDataLoading(true);
    try {
      const [txRes, invRes, assetRes, liabRes, budgetRes, kycRes] = await Promise.all([
        transactionsApi.list({ limit: 100 }),
        invoicesApi.list({ limit: 100 }),
        assetsApi.list(),
        liabilitiesApi.list(),
        budgetsApi.list(),
        kycApi.list()
      ]);

      if (txRes.success && txRes.data) {
        const txData = (txRes.data as any).transactions || txRes.data;
        setTransactions(Array.isArray(txData) ? txData.map((t: any) => ({
          id: t.id,
          date: t.date?.split('T')[0] || t.date,
          description: t.description,
          payee: t.payee,
          amount: t.amount,
          grossAmount: t.grossAmount,
          currency: t.currency,
          type: t.type as TransactionType,
          category: t.category,
          expenseCategory: t.expenseCategory,
          taxDeductible: t.taxDeductible,
          tags: t.tags || [],
          vatAmount: t.vatAmount,
          whtAmount: t.whtAmount,
        })) : []);
      }

      if (invRes.success && invRes.data) {
        const invData = (invRes.data as any).invoices || invRes.data;
        setInvoices(Array.isArray(invData) ? invData.map((inv: any) => ({
          id: inv.id,
          clientName: inv.clientName,
          clientEmail: inv.clientEmail,
          issueDate: inv.issueDate?.split('T')[0] || inv.issueDate,
          dueDate: inv.dueDate?.split('T')[0] || inv.dueDate,
          currency: inv.currency,
          items: (inv.items || []).map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          })),
          subTotal: inv.subTotal,
          vatAmount: inv.vatAmount,
          whtDeduction: inv.whtDeduction,
          totalAmount: inv.totalAmount,
          amountPaid: inv.amountPaid || 0,
          status: inv.status,
          paidDate: inv.paidDate,
          paymentMethods: inv.paymentMethods || [],
          payments: (inv.payments || []).map((p: any) => ({
            id: p.id,
            date: p.date?.split('T')[0] || p.date,
            amount: p.amount,
            note: p.note
          })),
          paymentDetails: {
            ...(inv.paymentBankName ? {
              bankName: inv.paymentBankName,
              accountNumber: inv.paymentAccountNumber,
              accountName: inv.paymentAccountName
            } : {}),
            ...(inv.paymentWalletAddress ? {
              walletAddress: inv.paymentWalletAddress,
              walletNetwork: inv.paymentWalletNetwork
            } : {})
          }
        })) : []);
      }

      if (assetRes.success && assetRes.data) {
        setAssets(Array.isArray(assetRes.data) ? assetRes.data.map((a: any) => ({
          id: a.id, name: a.name, value: a.value, currency: a.currency, type: a.type
        })) : []);
      }

      if (liabRes.success && liabRes.data) {
        setLiabilities(Array.isArray(liabRes.data) ? liabRes.data.map((l: any) => ({
          id: l.id, name: l.name, amount: l.amount, currency: l.currency, type: l.type, dueDate: l.dueDate
        })) : []);
      }

      if (budgetRes.success && budgetRes.data) {
        setBudgets(Array.isArray(budgetRes.data) ? budgetRes.data.map((b: any) => ({
          id: b.id, category: b.category, limit: b.limit, currency: b.currency, type: b.type, period: b.period
        })) : []);
      }

      if (kycRes.success && kycRes.data) {
        setKycRequests(Array.isArray(kycRes.data) ? kycRes.data.map((k: any) => ({
          id: k.id, userId: k.userId, userName: k.userName, userEmail: k.userEmail,
          bvn: k.bvn, nin: k.nin, status: k.status, date: k.date
        })) : []);
      }
    } catch (err) {
      console.error('Failed to load data from API:', err);
    } finally {
      setDataLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);


  // Derived Values
  // Wallet balances — fetch from API
  const loadWalletBalances = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await paymentsApi.getWallet();
      if (res.success && res.data?.balances) {
        setWalletBalances(res.data.balances);
      }
    } catch {
      // Wallet not yet created — show empty
    }
  }, [isAuthenticated]);

  useEffect(() => { loadWalletBalances(); }, [loadWalletBalances]);

  // Derive NGN/USDC for backward compatibility with WithdrawModal
  const walletBalanceNGN = walletBalances.find(b => b.currency === 'NGN')?.available || 0;
  const walletBalanceUSDC = walletBalances.find(b => b.currency === 'USDT')?.available || walletBalances.find(b => b.currency === 'USD')?.available || 0;

  // Handlers
  const handleLogout = async () => {
    await logout();
    notify('INFO', 'Logged out successfully');
  };

  // --- KYC Logic ---
  const handleKYCSubmit = async (bvn: string, nin: string) => {
    if (!userProfile) return;
    try {
      const res = await kycApi.submit({ bvn, nin });
      if (res.success && res.data) {
        const k = res.data;
        setKycRequests(prev => [{
          id: k.id, userId: k.userId, userName: k.userName, userEmail: k.userEmail,
          bvn: k.bvn, nin: k.nin, status: k.status, date: k.date
        }, ...prev]);
        notify('SUCCESS', 'KYC Documents submitted for review.');
      } else {
        notify('ERROR', res.error || 'Failed to submit KYC');
      }
    } catch {
      notify('ERROR', 'Failed to submit KYC request');
    }
  };

  const handleKYCReview = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await kycApi.review(id, action);
      if (res.success) {
        setKycRequests(prev => prev.map(req =>
          req.id === id ? { ...req, status: action } : req
        ));
        notify(action === 'APPROVED' ? 'SUCCESS' : 'INFO', `Request ${action === 'APPROVED' ? 'Approved' : 'Rejected'}`);
      }
    } catch {
      notify('ERROR', 'Failed to review KYC request');
    }
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
    loadWalletBalances(); // Refresh wallet balances from server
    notify('SUCCESS', `Withdrawal of ${currency === 'NGN' ? '₦' : '$'}${amount} successful`);
  };

  const addInvoice = async (inv: Invoice) => {
    try {
      const res = await invoicesApi.create({
        clientName: inv.clientName,
        clientEmail: inv.clientEmail,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        currency: inv.currency,
        items: inv.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        vatRate: inv.vatAmount && inv.subTotal ? (inv.vatAmount / inv.subTotal) * 100 : 0,
        whtRate: inv.whtDeduction && inv.subTotal ? (inv.whtDeduction / inv.subTotal) * 100 : 0,
        paymentMethods: inv.paymentMethods,
        paymentBankName: inv.paymentDetails?.bankName,
        paymentAccountNumber: inv.paymentDetails?.accountNumber,
        paymentAccountName: inv.paymentDetails?.accountName,
        paymentWalletAddress: inv.paymentDetails?.walletAddress,
        paymentWalletNetwork: inv.paymentDetails?.walletNetwork
      });
      if (res.success && res.data) {
        // Use the server-returned invoice (has real ID)
        const saved = res.data;
        const mappedInv: Invoice = {
          ...inv,
          id: saved.id,
        };
        setInvoices(prev => [mappedInv, ...prev]);
      } else {
        // Fallback: add locally even if API fails
        setInvoices(prev => [inv, ...prev]);
      }
    } catch {
      // Fallback: add locally
      setInvoices(prev => [inv, ...prev]);
    }
  };

  const recordPayment = async (id: string, amount: number, date: string, note?: string) => {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;

    try {
      const res = await invoicesApi.recordPayment(id, { amount, date, note });
      if (res.success && res.data) {
        const newAmountPaid = res.data.amountPaid ?? ((invoice.amountPaid || 0) + amount);
        const newStatus = res.data.status ?? (newAmountPaid >= invoice.totalAmount ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID);
        const isFullyPaid = newStatus === InvoiceStatus.PAID || newStatus === 'PAID';

        setInvoices(prev => prev.map(inv =>
          inv.id === id ? {
            ...inv,
            amountPaid: newAmountPaid,
            payments: [...(inv.payments || []), { id: `pay_${Date.now()}`, date, amount, note }],
            status: newStatus,
            paidDate: isFullyPaid ? date : undefined
          } : inv
        ));

        updateWalletForTransaction(amount, invoice.currency, TransactionType.INCOME);

        // Create a corresponding income transaction in the DB
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
      }
    } catch {
      notify('ERROR', 'Failed to record payment');
    }
  };

  const addTransaction = async (t: Transaction) => {
    try {
      const res = await transactionsApi.create({
        date: new Date(t.date).toISOString(),
        description: t.description,
        payee: t.payee,
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        category: t.category,
        expenseCategory: t.expenseCategory,
        taxDeductible: t.taxDeductible,
        tags: t.tags,
        grossAmount: t.grossAmount,
        vatAmount: t.taxDetails?.vatAmount,
        whtAmount: t.taxDetails?.whtAmount,
        source: 'MANUAL'
      });
      if (res.success && res.data) {
        setTransactions(prev => [{ ...t, id: res.data.id }, ...prev]);
      } else {
        setTransactions(prev => [t, ...prev]);
      }
    } catch {
      setTransactions(prev => [t, ...prev]);
    }
  };

  const addTransactions = async (newTxs: Transaction[]) => {
    // Batch create — save each to DB
    const savedTxs: Transaction[] = [];
    for (const t of newTxs) {
      try {
        const res = await transactionsApi.create({
          date: new Date(t.date).toISOString(),
          description: t.description,
          payee: t.payee,
          amount: t.amount,
          currency: t.currency,
          type: t.type,
          category: t.category,
          expenseCategory: t.expenseCategory,
          taxDeductible: t.taxDeductible,
          tags: t.tags,
          source: 'BANK_IMPORT'
        });
        savedTxs.push(res.success && res.data ? { ...t, id: res.data.id } : t);
      } catch {
        savedTxs.push(t);
      }
    }

    setTransactions(prev => [...savedTxs, ...prev]);
    savedTxs.forEach(t => {
      updateWalletForTransaction(t.amount, t.currency, t.type);
    });
    notify('SUCCESS', `${savedTxs.length} transactions synced from bank.`);
  };

  const handleManualTransaction = async (t: Transaction) => {
    await addTransaction(t);
    updateWalletForTransaction(t.amount, t.currency, t.type);
    notify('SUCCESS', 'Transaction recorded and synced to wallet');
  };

  const addAsset = async (a: Asset) => {
    try {
      const res = await assetsApi.create({
        name: a.name, value: a.value, currency: a.currency, type: a.type
      });
      if (res.success && res.data) {
        setAssets(prev => [{ ...a, id: res.data.id }, ...prev]);
      } else {
        setAssets(prev => [a, ...prev]);
      }
    } catch {
      setAssets(prev => [a, ...prev]);
    }
    notify('SUCCESS', 'Asset added successfully');
  };

  const addLiability = async (l: Liability) => {
    try {
      const res = await liabilitiesApi.create({
        name: l.name, amount: l.amount, currency: l.currency, type: l.type, dueDate: l.dueDate
      });
      if (res.success && res.data) {
        setLiabilities(prev => [{ ...l, id: res.data.id }, ...prev]);
      } else {
        setLiabilities(prev => [l, ...prev]);
      }
    } catch {
      setLiabilities(prev => [l, ...prev]);
    }
    notify('SUCCESS', 'Liability recorded');
  };

  const addBudget = async (b: Budget) => {
    try {
      const res = await budgetsApi.create({
        category: b.category, limit: b.limit, currency: b.currency, type: b.type, period: b.period
      });
      if (res.success && res.data) {
        setBudgets(prev => [...prev, { ...b, id: res.data.id }]);
      } else {
        setBudgets(prev => [...prev, b]);
      }
    } catch {
      setBudgets(prev => [...prev, b]);
    }
    notify('SUCCESS', 'Budget limit set successfully');
  };

  const deleteBudget = async (id: string) => {
    try {
      await budgetsApi.delete(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
      notify('INFO', 'Budget removed');
    } catch {
      notify('ERROR', 'Failed to delete budget');
    }
  };

  // Loading state
  if (authLoading || (isAuthenticated && dataLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">{authLoading ? 'Loading...' : 'Loading your data...'}</p>
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
          userProfile={userProfile}
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
        onAddFunds={() => { setIsAddFundsModalOpen(true); setIsMobileMenuOpen(false); }}
        walletBalances={walletBalances}
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

      <AddFundsModal
        isOpen={isAddFundsModalOpen}
        onClose={() => setIsAddFundsModalOpen(false)}
        onFundsAdded={() => { loadWalletBalances(); setIsAddFundsModalOpen(false); }}
        userId={user.id}
        userEmail={user.email}
        userName={user.name}
      />
    </div>
  );
}

export default App;
