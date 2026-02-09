import { gemini } from '../config/gemini.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import type { Transaction } from '@prisma/client';

// Types for AI responses
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

export interface ExpenseItem {
    description: string;
    amount: number;
    category: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface BankTransactionAnalysis {
    originalDescription: string;
    cleanedPayee: string;
    category: string;
    expenseCategory: 'BUSINESS' | 'PERSONAL';
    type: 'INCOME' | 'EXPENSE';
    taxDeductible: boolean;
    tags: string[];
}

const SYSTEM_INSTRUCTION = `
You are Fiscana's Chief Financial & Tax Officer. You are an expert in Nigerian financial regulations, tax laws (Finance Act 2026), and personal financial planning.

Your responsibilities:
1. Tax Compliance: Estimate taxes, VAT, and deductibles.
2. Financial Analysis: Analyze spending habits to identify top personal and business expenses based on transaction categories and descriptions.
3. Strategic Insight: Identify key financial decisions or patterns from the transaction history (e.g., heavy investment in assets, high recurring costs, strategic shifts).

Always provide advice that helps the user stay compliant while optimizing their tax liability and financial health.
`;

/**
 * AI Service - Handles all Gemini AI operations
 */
export class AIService {
    /**
     * Analyze tax liability based on transactions
     */
    async analyzeTaxLiability(userId: string, annualIncome: number): Promise<TaxReport> {
        // Get user's transactions from database
        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: 500 // Limit to last 500 transactions
        });

        const transactionSummary = transactions.map(t =>
            `${t.date.toISOString().split('T')[0]}: ${t.type} - ${t.description} (${t.amount} ${t.currency}) [Category: ${t.category}] [Deductible: ${t.taxDeductible}]`
        ).join('\n');

        const prompt = `
${SYSTEM_INSTRUCTION}

Analyze the following financial summary for a Nigerian freelancer/business in 2026.
Annual Gross Income: ${annualIncome} NGN.

Transactions:
${transactionSummary || 'No transactions recorded yet.'}

Tasks:
1. Estimate Income Tax (CIT or PIT) and VAT (Standard 7.5% or new rates) based on 2026 reforms.
2. Calculate total deductible expenses.
3. Calculate Taxable Income.
4. Give a compliance score (0-100) based on record keeping quality.
5. Provide 3 specific actionable recommendations.
6. Identify the Top 5 Personal Expenses (by amount).
7. Identify the Top 5 Business Expenses (by amount).
8. Identify the Top 2 Key Financial Decisions/Patterns observed in this period.

Return ONLY valid JSON with this exact structure:
{
  "estimatedIncomeTax": number,
  "estimatedVAT": number,
  "deductibleExpenses": number,
  "taxableIncome": number,
  "complianceScore": number,
  "recommendations": ["string1", "string2", "string3"],
  "topPersonalExpenses": [{"description": "string", "amount": number, "category": "string"}],
  "topBusinessExpenses": [{"description": "string", "amount": number, "category": "string"}],
  "keyFinancialDecisions": ["string1", "string2"]
}
`;

        try {
            const result = await gemini.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            if (!text) throw new Error('No response from AI');

            // Parse JSON from response (may be wrapped in markdown code blocks)
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                text.match(/```\s*([\s\S]*?)\s*```/) ||
                [null, text];
            const jsonText = jsonMatch[1] || text;

            logger.info(`Tax analysis completed for user ${userId}`);
            return JSON.parse(jsonText.trim()) as TaxReport;

        } catch (error) {
            logger.error('Gemini Tax Analysis Failed:', error);

            // Fallback with calculated values
            const totalExpenses = transactions
                .filter(t => t.type === 'EXPENSE' && t.taxDeductible)
                .reduce((sum, t) => sum + t.amount, 0);

            return {
                estimatedIncomeTax: annualIncome * 0.15,
                estimatedVAT: annualIncome * 0.075,
                deductibleExpenses: totalExpenses,
                taxableIncome: annualIncome - totalExpenses,
                complianceScore: transactions.length > 10 ? 75 : 50,
                recommendations: [
                    'AI service temporarily unavailable. Showing estimated values.',
                    'Keep receipts for all business expenses.',
                    'Consider consulting a tax professional for accurate filing.'
                ],
                topPersonalExpenses: [],
                topBusinessExpenses: [],
                keyFinancialDecisions: ['Unable to analyze - AI service unavailable.']
            };
        }
    }

    /**
     * Chat with tax advisor - returns streaming response
     */
    async *chatWithTaxAdvisor(
        userId: string,
        history: ChatMessage[],
        message: string
    ): AsyncGenerator<string> {
        try {
            // Get user context for personalized advice
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            const contextMessage = `
${SYSTEM_INSTRUCTION}

User Context:
- Name: ${user?.name || 'User'}
- Type: ${user?.type || 'INDIVIDUAL'}
- Company: ${user?.companyName || 'N/A'}
- KYC Status: ${user?.kycStatus || 'UNVERIFIED'}

Now respond to: ${message}
`;

            // Build conversation history
            const contents = [
                ...history.map(h => ({
                    role: h.role,
                    parts: [{ text: h.text }]
                })),
                { role: 'user' as const, parts: [{ text: contextMessage }] }
            ];

            const result = await gemini.generateContentStream({ contents });

            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    yield text;
                }
            }

            logger.info(`Chat completed for user ${userId}`);

        } catch (error) {
            logger.error('Chat error:', error);
            yield "I'm having trouble connecting to the financial intelligence database right now. Please try again later.";
        }
    }

    /**
     * Non-streaming chat for simpler use cases
     */
    async chatWithTaxAdvisorSync(
        userId: string,
        history: ChatMessage[],
        message: string
    ): Promise<string> {
        let fullResponse = '';
        for await (const chunk of this.chatWithTaxAdvisor(userId, history, message)) {
            fullResponse += chunk;
        }
        return fullResponse;
    }

    /**
     * Auto-categorize bank transaction descriptions
     */
    async autoCategorizeTransactions(descriptions: string[]): Promise<BankTransactionAnalysis[]> {
        if (descriptions.length === 0) {
            return [];
        }

        const prompt = `
You are an accounting AI. I will provide a list of raw bank transaction descriptions. 
For each, infer the context and map it to a structured format.

Raw Descriptions:
${JSON.stringify(descriptions)}

Rules:
1. cleanedPayee: Extract the merchant or sender name nicely (e.g. "TRF/PAYSTACK/NETFLIX" -> "Netflix").
2. category: Choose from standard accounting categories (Rent, Utilities, Groceries, Salary, Software, Transport, Meals, Equipment, Entertainment, etc.).
3. expenseCategory: 'BUSINESS' or 'PERSONAL'. Be smart. Netflix is PERSONAL. AWS is BUSINESS. Uber depends, default to PERSONAL unless it looks like logistics delivery.
4. type: 'INCOME' or 'EXPENSE'. Salary, refunds, payments received are INCOME.
5. taxDeductible: true if it's a valid business expense.
6. tags: Add relevant tags like #BankImport, #Recurring, #OneTime, etc.

Return ONLY valid JSON array with this structure for each transaction:
[
  {
    "originalDescription": "string",
    "cleanedPayee": "string",
    "category": "string",
    "expenseCategory": "BUSINESS" or "PERSONAL",
    "type": "INCOME" or "EXPENSE",
    "taxDeductible": boolean,
    "tags": ["string"]
  }
]
`;

        try {
            const result = await gemini.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            if (!text) throw new Error('No response from AI');

            // Parse JSON from response
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                text.match(/```\s*([\s\S]*?)\s*```/) ||
                [null, text];
            const jsonText = jsonMatch[1] || text;

            logger.info(`Categorized ${descriptions.length} transactions`);
            return JSON.parse(jsonText.trim()) as BankTransactionAnalysis[];

        } catch (error) {
            logger.error('Categorization failed:', error);

            // Fallback: Return basic categorization
            return descriptions.map(desc => ({
                originalDescription: desc,
                cleanedPayee: desc.substring(0, 30).replace(/[^a-zA-Z0-9\s]/g, '').trim(),
                category: 'Uncategorized',
                expenseCategory: 'PERSONAL' as const,
                type: 'EXPENSE' as const,
                taxDeductible: false,
                tags: ['#BankImport', '#NeedsReview']
            }));
        }
    }

    /**
     * Generate financial insights summary
     */
    async generateFinancialInsights(userId: string): Promise<{
        summary: string;
        insights: string[];
        warnings: string[];
    }> {
        const [transactions, invoices, budgets] = await Promise.all([
            prisma.transaction.findMany({
                where: { userId },
                orderBy: { date: 'desc' },
                take: 100
            }),
            prisma.invoice.findMany({
                where: { userId },
                orderBy: { dueDate: 'desc' },
                take: 50
            }),
            prisma.budget.findMany({
                where: { userId }
            })
        ]);

        const totalIncome = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

        const pendingInvoices = invoices.filter(i => i.status !== 'PAID');
        const overdueInvoices = invoices.filter(i =>
            i.status === 'OVERDUE' || (i.status !== 'PAID' && new Date(i.dueDate) < new Date())
        );

        const prompt = `
${SYSTEM_INSTRUCTION}

Generate brief financial insights for this user:

Recent Activity:
- Total Income: ₦${totalIncome.toLocaleString()}
- Total Expenses: ₦${totalExpenses.toLocaleString()}
- Net: ₦${(totalIncome - totalExpenses).toLocaleString()}
- Pending Invoices: ${pendingInvoices.length} (₦${pendingInvoices.reduce((s, i) => s + i.totalAmount - i.amountPaid, 0).toLocaleString()})
- Overdue Invoices: ${overdueInvoices.length}
- Active Budgets: ${budgets.length}

Return ONLY valid JSON:
{
  "summary": "1-2 sentence summary",
  "insights": ["insight1", "insight2", "insight3"],
  "warnings": ["warning1"] or []
}
`;

        try {
            const result = await gemini.generateContent(prompt);
            const text = result.response.text();
            if (!text) throw new Error('No response');

            // Parse JSON from response
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                text.match(/```\s*([\s\S]*?)\s*```/) ||
                [null, text];
            const jsonText = jsonMatch[1] || text;

            return JSON.parse(jsonText.trim());

        } catch (error) {
            logger.error('Insights generation failed:', error);

            return {
                summary: `You have ${transactions.length} recent transactions with net ${totalIncome >= totalExpenses ? 'income' : 'expenses'} of ₦${Math.abs(totalIncome - totalExpenses).toLocaleString()}.`,
                insights: [
                    `Total income: ₦${totalIncome.toLocaleString()}`,
                    `Total expenses: ₦${totalExpenses.toLocaleString()}`,
                    `${pendingInvoices.length} invoices pending payment`
                ],
                warnings: overdueInvoices.length > 0
                    ? [`${overdueInvoices.length} overdue invoice(s) need attention`]
                    : []
            };
        }
    }
}

// Export singleton instance
export const aiService = new AIService();
