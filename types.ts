
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export type ExpenseCategoryType = 'BUSINESS' | 'PERSONAL';

export type TaxTag = 
  | 'TAXABLE_INCOME' 
  | 'VAT_EXEMPT' 
  | 'ALLOWABLE_EXPENSE' 
  | 'CAPITAL_EXPENSE' 
  | 'NON_DEDUCTIBLE';

export enum PaymentMethod {
  FIAT_NGN = 'FIAT_NGN',
  CRYPTO_USDC = 'CRYPTO_USDC',
  CRYPTO_USDT = 'CRYPTO_USDT',
  CRYPTO_BTC = 'CRYPTO_BTC'
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

export type UserRole = 'USER' | 'ADMIN';
export type UserType = 'INDIVIDUAL' | 'CORPORATE';
export type KYCStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'; 
export type AccountTier = 'TIER_1' | 'TIER_2' | 'TIER_3';

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  type: UserType;
  companyName?: string;
  kycStatus: KYCStatus;
  tier: AccountTier;
  tin?: string; // Tax Identification Number
}

export interface KYCRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  bvn: string;
  nin: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: string;
}

// Global Standard: Detailed Tax Breakdown
export interface TaxDetails {
  vatAmount: number; // 7.5% Standard
  whtAmount: number; // 5% or 10% Withholding
  isRemitted: boolean;
}

// Global Standard: Audit Trail
export interface AuditLog {
  createdAt: string;
  createdBy: string;
  modifiedAt?: string;
  source: 'MANUAL' | 'BANK_IMPORT' | 'INVOICE_GENERATED' | 'SYSTEM';
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  payee: string; 
  amount: number; // Net Amount (Cash impact)
  grossAmount?: number; // Amount before WHT deduction (for Revenue recognition)
  currency: 'NGN' | 'USD';
  exchangeRateSnapshot?: number; // IAS 21: The rate at the date of transaction
  type: TransactionType;
  expenseCategory?: ExpenseCategoryType; 
  category: string;
  taxTag?: TaxTag; // New: Specific Tax Classification
  tags?: string[];
  receiptUrl?: string;
  taxDeductible: boolean;
  taxDetails?: TaxDetails; // Compliance Data
  auditLog?: AuditLog; // Accountability
  status?: 'CLEARED' | 'PENDING' | 'VOID';
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PaymentRecord {
    id: string;
    date: string;
    amount: number;
    note?: string;
}

export interface Invoice {
  id: string;
  clientName: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  currency: 'NGN' | 'USD';
  subTotal: number;
  vatAmount: number;
  whtDeduction: number; // Estimated deduction by client
  totalAmount: number; // Receivable Amount
  
  // Payment Tracking
  amountPaid: number;
  payments: PaymentRecord[];
  
  status: InvoiceStatus;
  paidDate?: string; // Date fully paid
  paymentMethods: PaymentMethod[]; 
  baniPaymentLink?: string;
}

// --- UPDATED ASSET & LIABILITY DEFINITIONS ---

export type AssetType = 
  | 'CASH' | 'BANK_ACCOUNT' | 'MONEY_MARKET' // Liquid
  | 'CRYPTO' | 'NFT' | 'DIGITAL_WALLET' // Digital
  | 'STOCKS' | 'BONDS' | 'MUTUAL_FUNDS' | 'ETF' | 'REIT' | 'INVESTMENT' // Investments
  | 'REAL_ESTATE' | 'VEHICLE' | 'EQUIPMENT' | 'ELECTRONICS' | 'FURNITURE' // Fixed
  | 'INVENTORY' | 'RECEIVABLE' | 'INTELLECTUAL_PROPERTY' // Business
  | 'OTHER';

export type LiabilityType = 
  | 'CREDIT_CARD' | 'OVERDRAFT' | 'LOAN_SHORT_TERM' // Short Term
  | 'LOAN' | 'MORTGAGE' | 'LOAN_STUDENT' | 'LOAN_VEHICLE' // Long Term
  | 'TAX_LIABILITY' | 'PAYABLE' | 'OTHER';

export interface Asset {
  id: string;
  name: string;
  description?: string; // Detailed description
  value: number;
  currency: 'NGN' | 'USD';
  type: AssetType;
}

export interface Liability {
  id: string;
  name: string;
  description?: string; // Detailed description
  amount: number;
  currency: 'NGN' | 'USD';
  type?: LiabilityType;
  dueDate?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  currency: 'NGN' | 'USD';
  type: ExpenseCategoryType;
  period: 'MONTHLY';
}

export interface ExpenseInsight {
  description: string;
  amount: number;
  category: string;
}

export interface TaxReport {
  estimatedIncomeTax: number;
  estimatedVAT: number;
  deductibleExpenses: number;
  taxableIncome: number;
  complianceScore: number; 
  recommendations: string[];
  topPersonalExpenses: ExpenseInsight[];
  topBusinessExpenses: ExpenseInsight[];
  keyFinancialDecisions: string[];
}

export type ViewState = 'DASHBOARD' | 'INVOICES' | 'LEDGER' | 'REPORTS' | 'ASSETS' | 'BUDGETS' | 'TAX_AI' | 'KYC';
