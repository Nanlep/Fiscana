// Backend-specific types
// Note: These types are defined separately from frontend to avoid import issues

export type UserRole = 'USER' | 'ADMIN';
export type UserType = 'INDIVIDUAL' | 'CORPORATE';
export type KYCStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type AccountTier = 'TIER_1' | 'TIER_2' | 'TIER_3';
export type TransactionType = 'INCOME' | 'EXPENSE';
export type ExpenseCategoryType = 'BUSINESS' | 'PERSONAL';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';

// API Response types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface TransactionFilters extends PaginationParams {
    startDate?: string;
    endDate?: string;
    type?: string;
    category?: string;
    minAmount?: number;
    maxAmount?: number;
}

export interface InvoiceFilters extends PaginationParams {
    status?: InvoiceStatus;
    startDate?: string;
    endDate?: string;
    clientName?: string;
}

// Tax report types (for AI service)
export interface ExpenseItem {
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
    topPersonalExpenses: ExpenseItem[];
    topBusinessExpenses: ExpenseItem[];
    keyFinancialDecisions: string[];
}
