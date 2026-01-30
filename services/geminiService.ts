import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Transaction, TaxReport, TransactionType, ExpenseCategoryType } from '../types';

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are Fiscana's Chief Financial & Tax Officer. You are an expert in Nigerian financial regulations, tax laws (Finance Act 2026), and personal financial planning.

Your responsibilities:
1. Tax Compliance: Estimate taxes, VAT, and deductibles.
2. Financial Analysis: Analyze spending habits to identify top personal and business expenses based on transaction categories and descriptions.
3. Strategic Insight: Identify key financial decisions or patterns from the transaction history (e.g., heavy investment in assets, high recurring costs, strategic shifts).

Always provide advice that helps the user stay compliant while optimizing their tax liability and financial health.
`;

export const analyzeTaxLiability = async (
  transactions: Transaction[],
  annualIncome: number
): Promise<TaxReport> => {
  const transactionSummary = transactions.map(t => 
    `${t.date}: ${t.type} - ${t.description} (${t.amount} ${t.currency}) [Category: ${t.category}] [Deductible: ${t.taxDeductible}]`
  ).join('\n');

  const prompt = `
    Analyze the following financial summary for a Nigerian freelancer/business in 2026.
    Annual Gross Income: ${annualIncome} NGN.
    
    Transactions:
    ${transactionSummary}

    Tasks:
    1. Estimate Income Tax (CIT or PIT) and VAT (Standard 7.5% or new rates) based on 2026 reforms.
    2. Calculate total deductible expenses.
    3. Calculate Taxable Income.
    4. Give a compliance score (0-100) based on record keeping quality.
    5. Provide 3 specific actionable recommendations.
    6. Identify the Top 5 Personal Expenses (by amount).
    7. Identify the Top 5 Business Expenses (by amount).
    8. Identify the Top 2 Key Financial Decisions/Patterns observed in this period (e.g., "Significant capital expenditure on hardware", "High volume of international crypto income").

    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedIncomeTax: { type: Type.NUMBER },
            estimatedVAT: { type: Type.NUMBER },
            deductibleExpenses: { type: Type.NUMBER },
            taxableIncome: { type: Type.NUMBER },
            complianceScore: { type: Type.NUMBER },
            recommendations: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            topPersonalExpenses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  category: { type: Type.STRING }
                }
              }
            },
            topBusinessExpenses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  category: { type: Type.STRING }
                }
              }
            },
            keyFinancialDecisions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as TaxReport;

  } catch (error) {
    console.error("Gemini Tax Analysis Failed:", error);
    // Fallback Mock Data
    return {
      estimatedIncomeTax: annualIncome * 0.15,
      estimatedVAT: annualIncome * 0.075,
      deductibleExpenses: 500000,
      taxableIncome: annualIncome - 500000,
      complianceScore: 85,
      recommendations: [
          "System is currently offline. Showing estimated values.",
          "Check your API Key configuration.",
          "Keep receipts for all equipment."
      ],
      topPersonalExpenses: [
        { description: "Rent", amount: 150000, category: "Housing" },
        { description: "Groceries", amount: 45000, category: "Food" }
      ],
      topBusinessExpenses: [
        { description: "MacBook Pro", amount: 2400000, category: "Equipment" },
        { description: "Internet", amount: 48000, category: "Utilities" },
        { description: "Co-working", amount: 150000, category: "Rent" }
      ],
      keyFinancialDecisions: [
        "Major capital investment in high-end equipment.",
        "Consistent recurring operational costs."
      ]
    };
  }
};

export const chatWithTaxAdvisorStream = async function* (
    history: {role: 'user' | 'model', text: string}[], 
    message: string
) {
    try {
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: SYSTEM_INSTRUCTION
            },
            history: history.map(h => ({
                role: h.role,
                parts: [{ text: h.text }]
            }))
        });

        const result = await chat.sendMessageStream({ message });
        for await (const chunk of result) {
            const responseChunk = chunk as GenerateContentResponse;
            if (responseChunk.text) {
                yield responseChunk.text;
            }
        }
    } catch (e) {
        console.error(e);
        yield "I'm having trouble connecting to the financial intelligence database right now. Please check your internet connection or API key.";
    }
}

// --- NEW: Auto-Categorization for Bank Statements ---
export interface BankTransactionAnalysis {
  originalDescription: string;
  cleanedPayee: string;
  category: string;
  expenseCategory: ExpenseCategoryType;
  type: TransactionType;
  taxDeductible: boolean;
  tags: string[];
}

export const autoCategorizeTransactions = async (
  rawDescriptions: string[]
): Promise<BankTransactionAnalysis[]> => {
  const prompt = `
    You are an accounting AI. I will provide a list of raw bank transaction descriptions. 
    For each, infer the context and map it to a structured format.
    
    Raw Descriptions:
    ${JSON.stringify(rawDescriptions)}

    Rules:
    1. cleanedPayee: Extract the merchant or sender name nicely (e.g. "TRF/PAYSTACK/NETFLIX" -> "Netflix").
    2. category: Choose from standard accounting categories (Rent, Utilities, Groceries, Salary, Software, Transport, Meals, etc.).
    3. expenseCategory: 'BUSINESS' or 'PERSONAL'. Be smart. Netflix is PERSONAL. AWS is BUSINESS. Uber depends, but default to PERSONAL unless it looks like a logistics delivery.
    4. type: 'INCOME' or 'EXPENSE'.
    5. taxDeductible: true if it's a valid business expense.

    Return a JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    originalDescription: { type: Type.STRING },
                    cleanedPayee: { type: Type.STRING },
                    category: { type: Type.STRING },
                    expenseCategory: { type: Type.STRING, enum: ['BUSINESS', 'PERSONAL'] },
                    type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'] },
                    taxDeductible: { type: Type.BOOLEAN },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as BankTransactionAnalysis[];
  } catch (error) {
    console.error("Categorization failed", error);
    // Fallback: Return mapped based on simple heuristics if AI fails
    return rawDescriptions.map(desc => ({
        originalDescription: desc,
        cleanedPayee: desc.substring(0, 15),
        category: "Uncategorized",
        expenseCategory: "PERSONAL",
        type: TransactionType.EXPENSE,
        taxDeductible: false,
        tags: ["#BankImport"]
    }));
  }
};
