
import React, { useState, useEffect, useRef } from 'react';
import { analyzeTaxLiability, streamChatWithTaxAdvisor } from '../services/geminiService';
import { Transaction, TaxReport } from '../types';
import { Calculator, ShieldCheck, AlertTriangle, Send, Loader2, Bot, TrendingUp, Briefcase, User, Lightbulb, Trash2, Clock, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatCurrency } from '../utils/currency';

interface TaxAdvisorProps {
    transactions: Transaction[];
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

const SUGGESTED_PROMPTS = [
    "How can I reduce my tax liability?",
    "Analyze my top business expenses.",
    "Am I spending too much on utilities?",
    "Explain VAT requirements for 2026."
];

const TaxAdvisor: React.FC<TaxAdvisorProps> = ({ transactions }) => {
    const [report, setReport] = useState<TaxReport | null>(null);
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        {
            role: 'model',
            text: 'Hello! I am your 2026 Financial & Tax Intelligence assistant. I have analyzed your ledger. Ask me about your spending patterns, tax liabilities, or strategic financial moves.',
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
            const data = await analyzeTaxLiability(transactions, totalIncome);
            setReport(data);
            setLoading(false);
        };
        fetchReport();
    }, [transactions]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, chatLoading]);

    const handleSendMessage = async (msgText: string = inputMessage) => {
        if (!msgText.trim()) return;

        const userMsg = msgText;
        setInputMessage('');
        setChatLoading(true);

        // Add user message immediately
        const newHistoryItem: ChatMessage = { role: 'user', text: userMsg, timestamp: new Date() };
        setChatHistory(prev => [...prev, newHistoryItem]);

        // Add placeholder for model response
        setChatHistory(prev => [...prev, { role: 'model', text: '', timestamp: new Date() }]);

        try {
            // Prepare history for API (strip timestamps)
            const apiHistory = chatHistory.map(h => ({ role: h.role, text: h.text }));

            const stream = streamChatWithTaxAdvisor(userMsg, apiHistory);
            let fullText = '';

            for await (const chunk of stream) {
                fullText += chunk;
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    const lastIdx = newHistory.length - 1;
                    // Ensure we are updating the last message which should be the model's
                    if (newHistory[lastIdx].role === 'model') {
                        newHistory[lastIdx] = { ...newHistory[lastIdx], text: fullText };
                    }
                    return newHistory;
                });
                setChatLoading(false); // Stop loading indicator once first chunk arrives
            }
        } catch (err) {
            console.error("Chat Error", err);
            setChatHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = { role: 'model', text: "Sorry, I encountered an error while processing your request.", timestamp: new Date() };
                return newHistory;
            });
            setChatLoading(false);
        }
    };

    const handleClearChat = () => {
        setChatHistory([{
            role: 'model',
            text: 'Conversation cleared. How can I help you with your finances today?',
            timestamp: new Date()
        }]);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="p-8 h-full flex flex-col space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">AI Financial Advisor</h1>
                    <p className="text-slate-500">Deep insights into your financial behavior & tax compliance</p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                        Live Analysis
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
                {/* Left Column: Tax Liability & Financial Insights */}
                <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center h-64">
                            <Loader2 className="animate-spin text-green-600" size={32} />
                        </div>
                    ) : report ? (
                        <>
                            {/* Score Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <ShieldCheck size={100} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Financial Health Score</h3>
                                <div className="flex items-end space-x-2">
                                    <span className={`text-5xl font-bold ${report.complianceScore > 80 ? 'text-green-600' : 'text-amber-500'}`}>
                                        {report.complianceScore}
                                    </span>
                                    <span className="text-xl text-slate-400 mb-2">/ 100</span>
                                </div>
                                <p className="text-sm text-slate-500 mt-2">
                                    {report.complianceScore > 80 ? 'Excellent financial record keeping and compliance.' : 'Attention needed for record keeping optimization.'}
                                </p>
                            </div>

                            {/* Key Financial Decisions */}
                            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                                <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center uppercase tracking-wide">
                                    <Lightbulb className="mr-2 text-indigo-600" size={18} /> Strategic Observations
                                </h3>
                                <ul className="space-y-3">
                                    {report.keyFinancialDecisions.map((decision, i) => (
                                        <li key={i} className="text-sm text-indigo-800 flex items-start">
                                            <div className="mr-2 mt-0.5 min-w-[6px] min-h-[6px] w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                            <span className="leading-snug">{decision}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Top Business Expenses */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center uppercase tracking-wide">
                                    <Briefcase className="mr-2 text-blue-600" size={18} /> Top Business Spend
                                </h3>
                                <div className="space-y-3">
                                    {report.topBusinessExpenses.length > 0 ? report.topBusinessExpenses.map((exp, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium text-slate-700">{exp.description}</p>
                                                <p className="text-xs text-slate-400">{exp.category}</p>
                                            </div>
                                            <span className="font-mono font-bold text-slate-900">{formatCurrency(exp.amount, 'NGN')}</span>
                                        </div>
                                    )) : <p className="text-xs text-slate-400 italic">No significant business expenses found.</p>}
                                </div>
                            </div>

                            {/* Top Personal Expenses */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center uppercase tracking-wide">
                                    <User className="mr-2 text-purple-600" size={18} /> Top Personal Spend
                                </h3>
                                <div className="space-y-3">
                                    {report.topPersonalExpenses.length > 0 ? report.topPersonalExpenses.map((exp, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium text-slate-700">{exp.description}</p>
                                                <p className="text-xs text-slate-400">{exp.category}</p>
                                            </div>
                                            <span className="font-mono font-bold text-slate-900">{formatCurrency(exp.amount, 'NGN')}</span>
                                        </div>
                                    )) : <p className="text-xs text-slate-400 italic">No significant personal expenses found.</p>}
                                </div>
                            </div>

                            {/* Tax Liability */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center uppercase tracking-wide">
                                    <Calculator className="mr-2 text-green-600" size={18} /> Estimated Tax Liability
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-slate-50">
                                        <span className="text-slate-600 text-sm">Taxable Income</span>
                                        <span className="font-medium text-sm">₦{report.taxableIncome.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-50">
                                        <span className="text-slate-600 text-sm">Income Tax (Est.)</span>
                                        <span className="font-medium text-red-500 text-sm">₦{report.estimatedIncomeTax.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-50">
                                        <span className="text-slate-600 text-sm">VAT (Est.)</span>
                                        <span className="font-medium text-red-500 text-sm">₦{report.estimatedVAT.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-slate-600 text-sm">Deductibles Identified</span>
                                        <span className="font-medium text-green-600 text-sm">- ₦{report.deductibleExpenses.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center uppercase tracking-wide">
                                    <AlertTriangle className="mr-2 text-amber-500" size={18} /> Recommendations
                                </h3>
                                <ul className="space-y-3">
                                    {report.recommendations.map((rec, i) => (
                                        <li key={i} className="text-sm text-slate-600 flex items-start">
                                            <span className="mr-2 mt-1 block w-1.5 h-1.5 bg-slate-400 rounded-full flex-shrink-0"></span>
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Right Column: Chat Interface */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-700 flex items-center">
                                <Bot size={18} className="mr-2 text-green-600" /> Financial Intelligence Chat
                            </h3>
                            <p className="text-xs text-slate-500">Powered by Gemini 3 Flash</p>
                        </div>
                        <button
                            onClick={handleClearChat}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Clear Conversation"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'model' && (
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2 flex-shrink-0 mt-2">
                                        <Bot size={16} className="text-green-600" />
                                    </div>
                                )}
                                <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                                            ? 'bg-green-600 text-white rounded-br-none'
                                            : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                                        }`}>
                                        {msg.role === 'model' && msg.text === '' ? (
                                            <div className="flex space-x-1 h-5 items-center">
                                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        ) : (
                                            <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert text-white' : 'text-slate-700'}`}>
                                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center">
                                        {formatTime(msg.timestamp)}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Suggested Prompts */}
                    {chatHistory.length < 3 && (
                        <div className="px-4 pt-2 flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                            {SUGGESTED_PROMPTS.map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSendMessage(prompt)}
                                    className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-green-50 text-slate-600 hover:text-green-700 text-xs rounded-full border border-slate-200 transition-colors flex items-center"
                                >
                                    <Sparkles size={12} className="mr-1" />
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="p-4 border-t border-slate-100 bg-white">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Ask about expenses, tax strategy, or savings..."
                                disabled={chatLoading}
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={chatLoading || !inputMessage.trim()}
                                className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/20"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaxAdvisor;
