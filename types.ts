
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export type ExpenseCategoryType = 'BUSINESS' | 'PERSONAL';

export enum PaymentMethod {
  FIAT_NGN = 'FIAT_NGN',
  CRYPTO_USDC = 'CRYPTO_USDC',
  CRYPTO_USDT = 'CRYPTO_USDT',
  CRYPTO_BTC = 'CRYPTO_BTC'
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
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
  status: InvoiceStatus;
  paidDate?: string; // Date payment was confirmed
  paymentMethods: PaymentMethod[]; 
  baniPaymentLink?: string;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  currency: 'NGN' | 'USD';
  type: 'CASH' | 'CRYPTO' | 'EQUIPMENT' | 'INVESTMENT';
}

export interface Liability {
  id: string;
  name: string;
  amount: number;
  currency: 'NGN' | 'USD';
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
