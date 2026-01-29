import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Invoices from './components/Invoices';
import Ledger from './components/Ledger';
import Reports from './components/Reports';
import Assets from './components/Assets';
import TaxAdvisor from './components/TaxAdvisor';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import WithdrawModal from './components/WithdrawModal';
import Toast, { ToastMessage, ToastType } from './components/Toast';
import { ViewState, Transaction, Invoice, TransactionType, InvoiceStatus, PaymentMethod, Asset, Liability, UserProfile, UserRole, UserType } from './types';
import { Menu } from 'lucide-react';

function App() {
  // --- Auth State with Persistence ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('fiscana_auth') === 'true';
  });
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('fiscana_profile');
    return saved ? JSON.parse(saved) : null;
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

  // --- Persistence Effects for Auth ---
  useEffect(() => {
    localStorage.setItem('fiscana_auth', String(isAuthenticated));
    if (userProfile) {
      localStorage.setItem('fiscana_profile', JSON.stringify(userProfile));
    } else {
      localStorage.removeItem('fiscana_profile');
    }
  }, [isAuthenticated, userProfile]);

  // --- Seed Data Constants (UPDATED FOR WORLD CLASS STANDARDS) ---
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
      status: InvoiceStatus.SENT, paymentMethods: [PaymentMethod.FIAT_NGN, PaymentMethod.CRYPTO_USDC],
      items: [{ id: 'i1', description: 'Frontend Architecture', quantity: 1, unitPrice: 1500000 }]
    },
    {
      id: 'INV-002', clientName: 'Global Corp', clientEmail: 'billing@global.com',
      issueDate: '2025-05-20', dueDate: '2025-06-05', currency: 'USD',
      status: InvoiceStatus.PAID, paymentMethods: [PaymentMethod.CRYPTO_USDC, PaymentMethod.CRYPTO_BTC],
      items: [{ id: 'i2', description: 'Smart Contract Audit', quantity: 10, unitPrice: 150 }]
    }
  ];

  const seedAssets: Asset[] = [
    { id: 'wallet_ngn', name: 'Wallet Balance', value: 2450000, currency: 'NGN', type: 'CASH' },
    { id: 'wallet_usdc', name: 'USDC Balance', value: 1450, currency: 'USD', type: 'CRYPTO' },
    { id: 'a2', name: 'Bitcoin Holdings', value: 4500000, currency: 'NGN', type: 'CRYPTO' },
    { id: 'a3', name: 'Work Station Setup', value: 3200000, currency: 'NGN', type: 'EQUIPMENT' }
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

  // --- Data Persistence Effects ---
  useEffect(() => { localStorage.setItem('fiscana_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('fiscana_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('fiscana_assets', JSON.stringify(assets)); }, [assets]);
  useEffect(() => { localStorage.setItem('fiscana_liabilities', JSON.stringify(liabilities)); }, [liabilities]);


  // Derived Values
  const walletBalanceNGN = assets.find(a => a.id === 'wallet_ngn' || a.name === 'Wallet Balance')?.value || 0;
  const walletBalanceUSDC = assets.find(a => a.id === 'wallet_usdc' || a.name === 'USDC Balance')?.value || 0;

  // Handlers
  const handleLogin = (name: string, role: UserRole, type: UserType, companyName?: string) => {
      setUserProfile({
          name,
          email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
          role,
          type,
          companyName
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

  const handleWithdraw = (amount: number, currency: 'NGN' | 'USDC', narration: string) => {
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
          expenseCategory: 'PERSONAL', // Default withdrawals to Personal unless specified otherwise
          taxDeductible: false,
          tags: ['#Withdrawal']
      };
      setTransactions([newTx, ...transactions]);
      notify('SUCCESS', `Withdrawal of ${currency === 'NGN' ? '₦' : '$'}${amount} successful`);
  };

  const addInvoice = (inv: Invoice) => {
    setInvoices([inv, ...invoices]);
  };

  // Logic to mark invoice as paid and update Wallet Assets
  const markInvoiceAsPaid = (id: string) => {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice || invoice.status === InvoiceStatus.PAID) return;

    // 1. Update Invoice Status
    setInvoices(invoices.map(inv => 
        inv.id === id ? { ...inv, status: InvoiceStatus.PAID } : inv
    ));

    // 2. Update Assets (Wallet)
    const totalAmount = invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    // Invoices are Accrual, but Payment is Cash Event.
    updateWalletForTransaction(totalAmount, invoice.currency, TransactionType.INCOME);
    notify('SUCCESS', 'Invoice marked as paid and wallet updated');
  };

  // Base add transaction (just log)
  const addTransaction = (t: Transaction) => {
    setTransactions([t, ...transactions]);
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
            <AdminDashboard onLogout={handleLogout} adminProfile={userProfile} />
        </>
      );
  }

  // Normal User Dashboard Content
  const renderUserContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard transactions={transactions} invoices={invoices} user={userProfile} />;
      case 'INVOICES':
        return <Invoices 
            invoices={invoices} 
            addInvoice={addInvoice} 
            addTransaction={addTransaction} 
            markAsPaid={markInvoiceAsPaid}
            notify={notify}
        />;
      case 'LEDGER':
        return <Ledger transactions={transactions} addTransaction={handleManualTransaction} />; 
      case 'REPORTS':
        return <Reports transactions={transactions} assets={assets} liabilities={liabilities} companyName={userProfile?.companyName || userProfile?.name} />;
      case 'ASSETS':
        return <Assets assets={assets} liabilities={liabilities} addAsset={addAsset} addLiability={addLiability} />;
      case 'TAX_AI':
        return <TaxAdvisor transactions={transactions} />;
      default:
        return <Dashboard transactions={transactions} invoices={invoices} user={userProfile} />;
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