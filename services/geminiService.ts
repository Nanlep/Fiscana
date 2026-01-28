import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Transaction, TaxReport } from '../types';

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const TAX_SYSTEM_INSTRUCTION = `
You are Fiscana's Chief Tax Officer, an expert in Nigerian financial regulations. 
Your specialty is the Nigerian Finance Act and the projected 2026 Tax Reforms which focus on:
1. Simplifying tax compliance for digital workers and freelancers.
2. Changes in VAT thresholds and rates.
3. Tax treatment of cryptocurrency assets and income.
4. Allowable deductions for remote workers (internet, home office, equipment).

Always provide advice that helps the user stay compliant while optimizing their tax liability legally.
When analyzing data, be precise. When giving advice, be clear and actionable.
`;

export const analyzeTaxLiability = async (
  transactions: Transaction[],
  annualIncome: number
): Promise<TaxReport> => {
  const transactionSummary = transactions.map(t => 
    `${t.date}: ${t.type} - ${t.description} (${t.amount} ${t.currency}) [Category: ${t.category}]`
  ).join('\n');

  const prompt = `
    Analyze the following financial summary for a Nigerian freelancer in 2026.
    Annual Gross Income: ${annualIncome} NGN.
    
    Transactions:
    ${transactionSummary}

    Based on the 2026 Nigerian Tax Reform expectations:
    1. Estimate Income Tax (CIT or PIT).
    2. Estimate VAT liability (Standard 7.5% or new proposed rates).
    3. Identify deductible expenses from the transaction list.
    4. Calculate Taxable Income.
    5. Give a compliance score (0-100) based on record keeping quality inferred.
    6. Provide 3 specific actionable recommendations.

    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: TAX_SYSTEM_INSTRUCTION,
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
                systemInstruction: TAX_SYSTEM_INSTRUCTION
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
        yield "I'm having trouble connecting to the tax database right now. Please check your internet connection or API key.";
    }
}