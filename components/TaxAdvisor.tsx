
import React, { useState, useEffect, useRef } from 'react';
import { analyzeTaxLiability, streamChatWithTaxAdvisor } from '../services/geminiService';
import { Transaction, TaxReport, UserProfile, Invoice, Asset, Liability, Budget, WalletBalance, CreditScore } from '../types';
import { Calculator, ShieldCheck, AlertTriangle, Send, Loader2, Bot, TrendingUp, Briefcase, User, Lightbulb, Trash2, Sparkles, Lock, Star, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatCurrency } from '../utils/currency';
import { aiApi } from '../services/apiClient';

interface TaxAdvisorProps {
    transactions: Transaction[];
    userProfile: UserProfile | null;
    invoices: Invoice[];
    assets: Asset[];
    liabilities: Liability[];
    budgets: Budget[];
    walletBalances: WalletBalance[];
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

const SUGGESTED_PROMPTS = [
    "How can I reduce my tax liability?",
    "Analyze my top business expenses.",
    "What is my financial health outlook?",
    "Explain VAT requirements for 2026."
];

const getCreditRating = (score: number): CreditScore['rating'] => {
    if (score >= 750) return 'Excellent';
    if (score >= 700) return 'Very Good';
    if (score >= 650) return 'Good';
    if (score >= 550) return 'Fair';
    return 'Poor';
};

const getCreditColor = (rating: CreditScore['rating']): string => {
    switch (rating) {
        case 'Excellent': return 'text-green-600';
        case 'Very Good': return 'text-emerald-600';
        case 'Good': return 'text-blue-600';
        case 'Fair': return 'text-amber-600';
        case 'Poor': return 'text-red-600';
    }
};

const getCreditBgColor = (rating: CreditScore['rating']): string => {
    switch (rating) {
        case 'Excellent': return 'bg-green-50 border-green-100';
        case 'Very Good': return 'bg-emerald-50 border-emerald-100';
        case 'Good': return 'bg-blue-50 border-blue-100';
        case 'Fair': return 'bg-amber-50 border-amber-100';
        case 'Poor': return 'bg-red-50 border-red-100';
    }
};

const TaxAdvisor: React.FC<TaxAdvisorProps> = ({ transactions, userProfile, invoices, assets, liabilities, budgets, walletBalances }) => {
    const [report, setReport] = useState<TaxReport | null>(null);
    const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
    const [loading, setLoading] = useState(false);
    const [creditLoading, setCreditLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const isKYCVerified = userProfile?.kycStatus === 'VERIFIED';

    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        {
            role: 'model',
            text: 'Hello! I am your Financial Advisor AI. I can analyze your financial data, assess your creditworthiness, and provide personalized tax and spending advice. Ask me anything!',
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        if (!isKYCVerified) return;
        const fetchReport = async () => {
            setLoading(true);
            const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
            const data = await analyzeTaxLiability(transactions, totalIncome);
            setReport(data);
            setLoading(false);
        };
        fetchReport();
    }, [transactions, isKYCVerified]);

    // Fetch credit score
    useEffect(() => {
        if (!isKYCVerified) return;
        const fetchCreditScore = async () => {
            setCreditLoading(true);
            try {
                const res = await aiApi.getCreditScore();
                if (res.success && res.data) {
                    setCreditScore({
                        ...res.data,
                        rating: res.data.rating as CreditScore['rating']
                    });
                }
            } catch (err) {
                console.error('Credit score fetch failed:', err);
            }
            setCreditLoading(false);
        };
        fetchCreditScore();
    }, [isKYCVerified]);

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

    // KYC Gate: Show locked state if not verified
    if (!isKYCVerified) {
        return (
            <div className="p-4 md:p-8 h-full flex flex-col items-center justify-center space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 text-center max-w-lg mx-auto">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={40} className="text-amber-500" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Advisor AI Locked</h1>
                    <p className="text-slate-500 mb-6 leading-relaxed">
                        To access personalized financial insights, credit scoring, and AI-powered tax advice based on your real financial data, you need to <strong>complete your KYC verification</strong> first.
                    </p>
                    <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-3">
                        <div className="flex items-start space-x-3">
                            <BarChart3 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-slate-700">Financial Health Score</p>
                                <p className="text-xs text-slate-500">AI-computed score based on your real transaction data</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Star size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-slate-700">Credit Rating</p>
                                <p className="text-xs text-slate-500">Bank-grade credit score computed from your financials</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Bot size={18} className="text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-slate-700">Personalized AI Chat</p>
                                <p className="text-xs text-slate-500">Context-aware advice using your ledger, invoices, and assets</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-sm text-slate-400">
                        <ShieldCheck size={16} />
                        <span>
                            KYC Status: <strong className={
                                userProfile?.kycStatus === 'PENDING' ? 'text-amber-600' :
                                userProfile?.kycStatus === 'REJECTED' ? 'text-red-600' :
                                'text-slate-600'
                            }>
                                {userProfile?.kycStatus || 'UNVERIFIED'}
                            </strong>
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Advisor AI</h1>
                    <p className="text-slate-500">Deep insights into your financial behavior & tax compliance</p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                        Live Analysis
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[calc(100vh-12rem)]">
                {/* Left Column: Financial Insights + Credit Score */}
                <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-0 lg:pr-2 custom-scrollbar max-h-[50vh] lg:max-h-none">
                    {loading ? (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center h-64">
                            <Loader2 className="animate-spin text-green-600" size={32} />
                        </div>
                    ) : report ? (
                        <>
                            {/* Financial Health Score Card */}
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

                            {/* Credit Score Card */}
                            <div className={`p-6 rounded-2xl shadow-sm border relative overflow-hidden group hover:shadow-md transition-all ${
                                creditScore ? getCreditBgColor(creditScore.rating) : 'bg-white border-slate-100'
                            }`}>
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Star size={100} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                                    <Star size={20} className="mr-2 text-blue-600" /> Credit Rating
                                </h3>
                                {creditLoading ? (
                                    <div className="flex items-center justify-center h-20">
                                        <Loader2 className="animate-spin text-blue-600" size={24} />
                                    </div>
                                ) : creditScore ? (
                                    <>
                                        <div className="flex items-end space-x-2">
                                            <span className={`text-5xl font-bold ${getCreditColor(creditScore.rating)}`}>
                                                {creditScore.score}
                                            </span>
                                            <span className="text-xl text-slate-400 mb-2">/ 850</span>
                                        </div>
                                        <div className="mt-2 flex items-center space-x-2">
                                            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${getCreditColor(creditScore.rating)} bg-white/60`}>
                                                {creditScore.rating}
                                            </span>
                                        </div>
                                        {creditScore.factors.length > 0 && (
                                            <div className="mt-4 space-y-1.5">
                                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Key Factors</p>
                                                {creditScore.factors.slice(0, 3).map((f, i) => (
                                                    <p key={i} className="text-xs text-slate-600 flex items-start">
                                                        <span className="mr-1.5 mt-0.5 w-1.5 h-1.5 bg-slate-400 rounded-full flex-shrink-0 block"></span>
                                                        {f}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-500">Unable to compute credit score. Try again later.</p>
                                )}
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
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden h-[60vh] lg:h-auto">
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
                                <div className={`flex flex-col max-w-[95%] md:max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
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
                        <div className="px-4 pt-2 flex flex-wrap md:flex-nowrap gap-2 md:space-x-2 overflow-x-auto pb-2 scrollbar-hide">
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
