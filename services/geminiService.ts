/**
 * Enhanced Gemini Service - Uses Backend AI API
 * Proxies all AI requests through the backend for security
 */

import { Transaction, TaxReport, TransactionType, ExpenseCategoryType } from '../types';
import { aiApi, getAccessToken } from './apiClient';

export interface BankTransactionAnalysis {
  originalDescription: string;
  cleanedPayee: string;
  category: string;
  expenseCategory: ExpenseCategoryType;
  type: TransactionType;
  taxDeductible: boolean;
  tags: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

/**
 * Analyze tax liability using backend AI API
 */
export const analyzeTaxLiability = async (
  transactions: Transaction[],
  annualIncome: number
): Promise<TaxReport> => {
  // Calculate annual income from transactions if not provided
  const calculatedIncome = annualIncome || transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const response = await aiApi.analyzeTax(calculatedIncome);

  if (response.success && response.data) {
    return response.data;
  }

  // Return default report on error
  console.error('Tax analysis failed:', response.error);
  return {
    estimatedIncomeTax: 0,
    estimatedVAT: 0,
    deductibleExpenses: 0,
    taxableIncome: 0,
    complianceScore: 50,
    recommendations: ['Unable to complete analysis. Please try again later.'],
    topPersonalExpenses: [],
    topBusinessExpenses: [],
    keyFinancialDecisions: []
  };
};

/**
 * Chat with Tax Advisor using streaming
 */
export async function* streamChatWithTaxAdvisor(
  message: string,
  history: ChatMessage[]
): AsyncGenerator<string> {
  try {
    for await (const chunk of aiApi.chatStream(message, history)) {
      yield chunk;
    }
  } catch (error) {
    console.error('Stream chat error:', error);
    throw error;
  }
}

/**
 * Chat with Tax Advisor (non-streaming)
 */
export const chatWithTaxAdvisor = async (
  message: string,
  history: ChatMessage[]
): Promise<string> => {
  const response = await aiApi.chat(message, history);

  if (response.success && response.data?.message) {
    return response.data.message;
  }

  console.error('Chat failed:', response.error);
  return 'I apologize, but I encountered an error processing your request. Please try again.';
};

/**
 * Analyze bank transactions for categorization
 */
export const analyzeTransactionsFromBank = async (
  transactions: Array<{
    description: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    currency: 'NGN' | 'USD';
  }>
): Promise<BankTransactionAnalysis[]> => {
  try {
    const descriptions = transactions.map(tx =>
      `${tx.description} (${tx.type}, ${tx.amount} ${tx.currency})`
    );

    const response = await aiApi.categorize(descriptions);

    if (response.success && response.data) {
      return response.data.map((analysis, index) => ({
        originalDescription: transactions[index].description,
        cleanedPayee: analysis.cleanedPayee || transactions[index].description.substring(0, 30),
        category: analysis.category || 'Uncategorized',
        expenseCategory: (analysis.expenseCategory || 'PERSONAL') as ExpenseCategoryType,
        type: analysis.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE,
        taxDeductible: analysis.taxDeductible ?? false,
        tags: analysis.tags || ['#BankSync']
      }));
    }

    // Fallback: return basic analysis
    return transactions.map(tx => ({
      originalDescription: tx.description,
      cleanedPayee: tx.description.substring(0, 30),
      category: 'Uncategorized',
      expenseCategory: 'PERSONAL' as ExpenseCategoryType,
      type: tx.type === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE,
      taxDeductible: false,
      tags: ['#BankSync']
    }));

  } catch (error) {
    console.error('Transaction analysis failed:', error);

    // Return basic fallback
    return transactions.map(tx => ({
      originalDescription: tx.description,
      cleanedPayee: tx.description.substring(0, 30),
      category: 'Uncategorized',
      expenseCategory: 'PERSONAL' as ExpenseCategoryType,
      type: tx.type === 'CREDIT' ? TransactionType.INCOME : TransactionType.EXPENSE,
      taxDeductible: false,
      tags: ['#BankSync', '#NeedsReview']
    }));
  }
};

/**
 * Get financial insights
 */
export const getFinancialInsights = async (): Promise<{
  summary: string;
  insights: string[];
  warnings: string[];
}> => {
  const response = await aiApi.getInsights();

  if (response.success && response.data) {
    return response.data;
  }

  return {
    summary: 'Unable to generate insights at this time.',
    insights: [],
    warnings: []
  };
};
