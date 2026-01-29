
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

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  type: UserType;
  companyName?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  payee: string; // Vendor or Client Name (Crucial for Audits)
  amount: number;
  currency: 'NGN' | 'USD';
  type: TransactionType;
  expenseCategory?: ExpenseCategoryType; // New Field: BUSINESS or PERSONAL
  category: string;
  tags?: string[]; // For Project or Cost Center tracking
  receiptUrl?: string;
  taxDeductible: boolean;
  status?: 'CLEARED' | 'PENDING';
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
  status: InvoiceStatus;
  paymentMethods: PaymentMethod[]; // Supported methods for this invoice via Bani
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
  complianceScore: number; // 0-100
  recommendations: string[];
  // Deep Financial Insights
  topPersonalExpenses: ExpenseInsight[];
  topBusinessExpenses: ExpenseInsight[];
  keyFinancialDecisions: string[];
}

export type ViewState = 'DASHBOARD' | 'INVOICES' | 'LEDGER' | 'REPORTS' | 'ASSETS' | 'TAX_AI';
