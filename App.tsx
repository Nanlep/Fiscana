
import React, { useState, useEffect } from 'react';
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
import { ViewState, Transaction, Invoice, TransactionType, InvoiceStatus, PaymentMethod, Asset, Liability, UserProfile, UserRole, UserType, KYCRequest, ExpenseCategoryType, Budget } from './types';
import { Menu } from 'lucide-react';
import { DEFAULT_EXCHANGE_RATE } from './utils/currency';

function App() {
  // --- Auth State with Persistence ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('fiscana_auth') === 'true';
  });
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('fiscana_profile');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure backward compatibility for existing users in localStorage
        return {
            ...parsed,
            kycStatus: parsed.kycStatus || 'UNVERIFIED',
            tier: parsed.tier || 'TIER_1'
        };
    }
    return null;
  });

  // --- Exchange Rate State ---
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem('fiscana_exchange_rate');
    return saved ? parseFloat(saved) : DEFAULT_EXCHANGE_RATE;
  });

  useEffect(() => {
    localStorage.setItem('fiscana_exchange_rate', exchangeRate.toString());
  }, [exchangeRate]);

  // --- Global State for KYC Requests (Simulating Backend) ---
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

  // --- Persistence Effects for Auth & KYC ---
  useEffect(() => {
    localStorage.setItem('fiscana_auth', String(isAuthenticated));
    if (userProfile) {
      localStorage.setItem('fiscana_profile', JSON.stringify(userProfile));
    } else {
      localStorage.removeItem('fiscana_profile');
    }
  }, [isAuthenticated, userProfile]);

  useEffect(() => {
    localStorage.setItem('fiscana_kyc_requests', JSON.stringify(kycRequests));
  }, [kycRequests]);

  // --- Seed Data Constants ---
  const seedTransactions: Transaction[] = [
    {
      id: 'tx_1', date: '2025-05-12', description: 'Website Redesign Phase 1', payee: 'Alpha Tech Solutions', amount: 850000,
      currency: 'NGN', type: TransactionType.INCOME, category: 'Service Revenue', taxDeductible: false,
      tags: ['#ClientWork', '#Q2']
    },
    {
      id: 'tx_2', date: '2025-05-14', description: 'MacBook Pro M4', payee: 'iStore Ikeja', amount: 2400000,
      currency: 'NGN', type: TransactionType.EXPENSE, expenseCategory: 'BUSINESS', category: 'Equipment', taxDeductible: true, receiptUrl: '#',
      tags: ['#Hardware', '#Asset']
    },
    {
      id: 'tx_3', date: '2025-05-15', description: 'Monthly Subscription', payee: 'Starlink Nigeria', amount: 48000,
      currency: 'NGN', type: TransactionType.EXPENSE, expenseCategory: 'BUSINESS', category: 'Utilities', taxDeductible: true,
      tags: ['#Recurring', '#Office']
    },
    {
      id: 'tx_4', date: '2025-05-20', description: 'Smart Contract Audit', payee: 'Global Crypto Inc', amount: 500,
      currency: 'USD', type: TransactionType.INCOME, category: 'Consulting', taxDeductible: false,
      tags: ['#Crypto', '#International']
    },
    {
      id: 'tx_5', date: '2025-06-01', description: 'Co-working Space Fee', payee: 'WorkStation NG', amount: 150000,
      currency: 'NGN', type: TransactionType.EXPENSE, expenseCategory: 'BUSINESS', category: 'Rent', taxDeductible: true,
      tags: ['#Office', '#Recurring']
    },
    {
      id: 'tx_6', date: '2025-06-02', description: 'Groceries & Home Supplies', payee: 'Shoprite', amount: 65000,
      currency: 'NGN', type: TransactionType.EXPENSE, expenseCategory: 'PERSONAL', category: 'Groceries', taxDeductible: false,
      tags: ['#Personal', '#Home']
    }
  ];

  const seedInvoices: Invoice[] = [
    {
      id: 'INV-001', clientName: 'TechNext Ltd', clientEmail: 'accounts@technext.ng',
      issueDate: '2025-06-01', dueDate: '2025-06-15', currency: 'NGN',
      status: InvoiceStatus.PARTIALLY_PAID, paymentMethods: [PaymentMethod.FIAT_NGN, PaymentMethod.CRYPTO_USDC],
      items: [{ id: 'i1', description: 'Frontend Architecture', quantity: 1, unitPrice: 1500000 }],
      subTotal: 1500000,
      vatAmount: 112500,
      whtDeduction: 75000,
      totalAmount: 1537500,
      amountPaid: 500000,
      payments: [
          { id: 'p1', date: '2025-06-05', amount: 500000, note: 'Initial Deposit' }
      ]
    },
    {
      id: 'INV-002', clientName: 'Global Corp', clientEmail: 'billing@global.com',
      issueDate: '2025-05-20', dueDate: '2025-06-05', currency: 'USD',
      status: InvoiceStatus.PAID, paidDate: '2025-05-22', paymentMethods: [PaymentMethod.CRYPTO_USDC, PaymentMethod.CRYPTO_BTC],
      items: [{ id: 'i2', description: 'Smart Contract Audit', quantity: 10, unitPrice: 150 }],
      subTotal: 1500,
      vatAmount: 0,
      whtDeduction: 0,
      totalAmount: 1500,
      amountPaid: 1500,
      payments: [
          { id: 'p2', date: '2025-05-22', amount: 1500, note: 'Full Payment' }
      ]
    }
  ];

  const seedAssets: Asset[] = [
    { id: 'wallet_ngn', name: 'Wallet Balance', value: 2450000, currency: 'NGN', type: 'CASH' },
    { id: 'wallet_usdc', name: 'USDC Balance', value: 1450, currency: 'USD', type: 'CRYPTO' },
    { id: 'a2', name: 'Bitcoin Holdings', value: 4500000, currency: 'NGN', type: 'CRYPTO' },
    { id: 'a3', name: 'Work Station Setup', value: 3200000, currency: 'NGN', type: 'EQUIPMENT' }
  ];

  const seedBudgets: Budget[] = [
      { id: 'b1', category: 'Rent', limit: 200000, currency: 'NGN', type: 'BUSINESS', period: 'MONTHLY' },
      { id: 'b2', category: 'Utilities', limit: 60000, currency: 'NGN', type: 'BUSINESS', period: 'MONTHLY' },
      { id: 'b3', category: 'Groceries', limit: 100000, currency: 'NGN', type: 'PERSONAL', period: 'MONTHLY' }
  ];

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
  const handleLogin = (name: string, role: UserRole, type: UserType, companyName?: string) => {
      // Check for pending KYC to restore status correctly on login
      const pendingReq = kycRequests.find(r => r.userEmail === `${name.toLowerCase().replace(' ', '.')}@example.com` && r.status === 'PENDING');
      
      setUserProfile({
          name,
          email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
          role,
          type,
          companyName,
          kycStatus: pendingReq ? 'PENDING' : 'UNVERIFIED',
          tier: 'TIER_1'
      });
      setIsAuthenticated(true);
      setView('DASHBOARD');
      notify('SUCCESS', `Welcome back, ${name}`);
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setUserProfile(null);
      localStorage.removeItem('fiscana_auth');
      localStorage.removeItem('fiscana_profile');
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
      
      // Update local user state
      setUserProfile({ ...userProfile, kycStatus: 'PENDING' });
      
      notify('SUCCESS', 'KYC Documents submitted for review.');
  };

  const handleKYCReview = (id: string, action: 'APPROVED' | 'REJECTED') => {
      setKycRequests(prev => prev.map(req => 
          req.id === id ? { ...req, status: action } : req
      ));
      
      // If the admin is also the user being reviewed (simulation edge case), update profile immediately
      // In a real app, this update happens on next user login fetch
      const request = kycRequests.find(r => r.id === id);
      if (request && userProfile && request.userEmail === userProfile.email) {
          if (action === 'APPROVED') {
              setUserProfile({ ...userProfile, kycStatus: 'VERIFIED', tier: 'TIER_3' });
          } else {
              setUserProfile({ ...userProfile, kycStatus: 'REJECTED' });
          }
      }
      
      notify(action === 'APPROVED' ? 'SUCCESS' : 'INFO', `Request ${action === 'APPROVED' ? 'Approved' : 'Rejected'}`);
  };

  // Helper to update wallet balance based on transaction
  const updateWalletForTransaction = (amount: number, currency: 'NGN' | 'USD', type: TransactionType) => {
      const targetAssetName = currency === 'NGN' ? 'Wallet Balance' : 'USDC Balance';
      
      setAssets(prevAssets => {
          // Check if wallet exists
          const exists = prevAssets.find(a => a.name === targetAssetName);
          
          if (!exists) {
              // Create if not exists (defensive programming)
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
      // 1. Update Asset
      const targetAssetName = currency === 'NGN' ? 'Wallet Balance' : 'USDC Balance';
      setAssets(assets.map(asset => {
          if (asset.name === targetAssetName) {
              return { ...asset, value: asset.value - amount };
          }
          return asset;
      }));
      
      // 2. Log Transaction
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

  // Logic to record partial or full payments
  const recordPayment = (id: string, amount: number, date: string, note?: string) => {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;

    // 1. Update Invoice Logic
    const newAmountPaid = (invoice.amountPaid || 0) + amount;
    const isFullyPaid = newAmountPaid >= invoice.totalAmount;
    
    // Status Logic: if paid >= total, PAID. if paid > 0, PARTIALLY_PAID. else SENT.
    const newStatus = isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
    
    // Update Invoices State
    setInvoices(invoices.map(inv => 
        inv.id === id ? { 
            ...inv, 
            amountPaid: newAmountPaid,
            payments: [...(inv.payments || []), { id: `pay_${Date.now()}`, date, amount, note }],
            status: newStatus, 
            paidDate: isFullyPaid ? date : undefined 
        } : inv
    ));

    // 2. Update Assets (Wallet) - Only add the *received* amount
    updateWalletForTransaction(amount, invoice.currency, TransactionType.INCOME);

    // 3. Log a Transaction for this specific payment
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

  // Base add transaction (just log)
  const addTransaction = (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
  };

  // Bulk add transactions (from Bank Sync)
  const addTransactions = (newTxs: Transaction[]) => {
      setTransactions(prev => [...newTxs, ...prev]);
      
      newTxs.forEach(t => {
          updateWalletForTransaction(t.amount, t.currency, t.type);
      });

      notify('SUCCESS', `${newTxs.length} transactions synced from bank.`);
  };

  // Manual transaction from Ledger (Log + Update Cash)
  const handleManualTransaction = (t: Transaction) => {
    addTransaction(t);
    // Sync with wallet
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

  // Render logic
  if (!isAuthenticated) {
      return (
        <>
            <Toast toasts={toasts} removeToast={removeToast} />
            <LandingPage onLogin={handleLogin} />
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
            addTransactions={addTransactions} // Pass the bulk handler
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
