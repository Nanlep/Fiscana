import React, { useState, useEffect, useRef } from 'react';
import { analyzeTaxLiability, chatWithTaxAdvisorStream } from '../services/geminiService';
import { Transaction, TaxReport } from '../types';
import { Calculator, ShieldCheck, AlertTriangle, Send, Loader2, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface TaxAdvisorProps {
  transactions: Transaction[];
}

const TaxAdvisor: React.FC<TaxAdvisorProps> = ({ transactions }) => {
  const [report, setReport] = useState<TaxReport | null>(null);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Chat State
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([
      {role: 'model', text: 'Hello! I am your 2026 Tax Reform compliance assistant. Ask me about VAT thresholds, crypto tax, or deductible expenses.'}
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

  const handleSendMessage = async () => {
      if (!inputMessage.trim()) return;
      
      const userMsg = inputMessage;
      setInputMessage('');
      setChatLoading(true);

      // Add user message immediately
      setChatHistory(prev => [...prev, {role: 'user', text: userMsg}]);

      // Add placeholder for model response
      setChatHistory(prev => [...prev, {role: 'model', text: ''}]);

      try {
          const stream = chatWithTaxAdvisorStream(chatHistory, userMsg);
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
              newHistory[newHistory.length - 1] = { role: 'model', text: "Sorry, I encountered an error while processing your request." };
              return newHistory;
          });
          setChatLoading(false);
      }
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tax Advisor AI</h1>
          <p className="text-slate-500">Compliance engine compliant with Nigeria's 2026 Tax Reforms</p>
        </div>
        <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                Live Advisor
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Left Column: Tax Liability Summary */}
        <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-green-600" size={32} />
             </div>
          ) : report ? (
            <>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <ShieldCheck size={100} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Compliance Score</h3>
                <div className="flex items-end space-x-2">
                  <span className={`text-5xl font-bold ${report.complianceScore > 80 ? 'text-green-600' : 'text-amber-500'}`}>
                    {report.complianceScore}
                  </span>
                  <span className="text-xl text-slate-400 mb-2">/ 100</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {report.complianceScore > 80 ? 'You are well positioned for the 2026 fiscal year.' : 'Attention needed for record keeping.'}
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <Calculator className="mr-2 text-blue-600" size={20}/> Estimated Liability
                </h3>
                <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-600">Taxable Income</span>
                        <span className="font-medium">₦{report.taxableIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-600">Income Tax (Est.)</span>
                        <span className="font-medium text-red-500">₦{report.estimatedIncomeTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-600">VAT (Est.)</span>
                        <span className="font-medium text-red-500">₦{report.estimatedVAT.toLocaleString()}</span>
                    </div>
                     <div className="flex justify-between py-2">
                        <span className="text-slate-600">Deductibles Identified</span>
                        <span className="font-medium text-green-600">- ₦{report.deductibleExpenses.toLocaleString()}</span>
                    </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                 <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <AlertTriangle className="mr-2 text-amber-500" size={20}/> Recommendations
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
                        <Bot size={18} className="mr-2 text-green-600"/> Tax Advisor Chat
                    </h3>
                    <p className="text-xs text-slate-500">Powered by Gemini 3 Flash</p>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2 flex-shrink-0 mt-2">
                                <Bot size={16} className="text-green-600" />
                            </div>
                        )}
                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-green-600 text-white rounded-br-none' 
                            : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                        }`}>
                            {msg.role === 'model' && msg.text === '' ? (
                                <div className="flex space-x-1 h-5 items-center">
                                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                </div>
                            ) : (
                                <ReactMarkdown className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert text-white' : 'text-slate-700'}`}>
                                    {msg.text}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-slate-100 bg-white">
                <div className="flex space-x-2">
                    <input 
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask about your tax liability..."
                        disabled={chatLoading}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    />
                    <button 
                        onClick={handleSendMessage}
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