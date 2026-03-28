import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQPageProps {
    onBack: () => void;
}

const FAQPage: React.FC<FAQPageProps> = ({ onBack }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const faqs = [
        {
            category: 'General',
            items: [
                {
                    question: 'What is Fiscana?',
                    answer: 'Fiscana is a digital financial management and SME financing platform that helps businesses track income & expenses, generate financial statements, build credit profiles, and access financing.'
                },
                {
                    question: 'Who can use Fiscana?',
                    answer: 'SMEs, Startups, Schools, Traders & service providers, and MSME clusters & cooperatives.'
                },
                {
                    question: 'What can I do on Fiscana?',
                    answer: 'Create invoices & receipts, track income & expenses, manage assets & liabilities, generate Profit & Loss and Cashflow statements, get AI-based financial insights, and apply for SME financing.'
                },
                {
                    question: 'What is Smart Ledger?',
                    answer: 'Smart Ledger automatically organizes your income, expenses, and transactions into structured financial records lenders can trust.'
                }
            ]
        },
        {
            category: 'SME Finance',
            items: [
                {
                    question: 'How do I qualify for SME finance?',
                    answer: 'You must submit an application with your business case and financial records (at least 6 months preferred). You also need to maintain consistent activity on Fiscana for a minimum of 2 months.'
                },
                {
                    question: 'Can I qualify without past records?',
                    answer: 'Yes. Use Fiscana actively for 2–6 months to record transactions daily and send invoices. This builds your eligibility.'
                },
                {
                    question: 'How much can I access?',
                    answer: 'Typically ₦1 million to ₦50 million, depending on your financial records, credit rating, and business performance.'
                },
                {
                    question: 'What is AI Credit Rating?',
                    answer: 'Fiscana analyzes your cashflow, revenue consistency, and expense patterns to generate a data-driven credit score used by lenders.'
                },
                {
                    question: 'Do I need to pay to access financing?',
                    answer: 'Yes. Access to SME Finance and Financial Intelligence requires the ₦24,900 annual plan.'
                }
            ]
        },
        {
            category: 'Cluster Financing & Usage',
            items: [
                {
                    question: 'What is cluster financing?',
                    answer: 'A group of SMEs can apply together using shared credibility and collective financial strength. This is ideal for private school groups, trade associations, and cooperatives.'
                },
                {
                    question: 'What is shared suretyship?',
                    answer: 'Members in a cluster support each other’s loan credibility to reduce individual risk and increase approval chances.'
                },
                {
                    question: 'How long do I need to use Fiscana before applying?',
                    answer: 'A minimum of 2 months of active usage is required, but 3–6 months is ideal for stronger approval.'
                },
                {
                    question: 'What counts as "active usage"?',
                    answer: 'Sending invoices regularly, recording income & expenses, and maintaining your Smart Ledger.'
                }
            ]
        },
        {
            category: 'Security & Payments',
            items: [
                {
                    question: 'Is my financial data safe?',
                    answer: 'Yes. Fiscana uses secure systems to protect your business data, financial records, and user identity.'
                },
                {
                    question: 'Will my data be shared?',
                    answer: 'Only for credit assessment and financing applications, and only with your explicit consent.'
                },
                {
                    question: 'What does the ₦24,900 plan include?',
                    answer: 'It includes SME finance access, AI credit rating, advanced reporting, and financial intelligence tools.'
                },
                {
                    question: 'Is there a free version?',
                    answer: 'Yes — but with limited features. Full financing access requires the paid plan.'
                }
            ]
        },
        {
            category: 'Why Fiscana?',
            items: [
                {
                    question: 'Why should I use Fiscana instead of manual records?',
                    answer: 'Manual records are often disorganized and hard for lenders to verify. Fiscana provides structured, verifiable, and finance-ready records.'
                },
                {
                    question: 'What is the biggest benefit of using Fiscana?',
                    answer: 'Turning your daily financial records into a collateral asset that proves your creditworthiness and gives you access to capital.'
                }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Navigation */}
            <nav className="flex items-center justify-between px-8 py-6 border-b border-slate-200 sticky top-0 bg-white/80 backdrop-blur-md z-50 shadow-sm">
                <div className="flex items-center space-x-2 cursor-pointer" onClick={onBack}>
                    <img src="/Fiscana.svg" alt="Fiscana Logo" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold tracking-tight">Fiscana</span>
                </div>
                <button
                    onClick={onBack}
                    className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-green-600 transition-colors bg-slate-100 hover:bg-green-50 px-4 py-2 rounded-full"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Home</span>
                </button>
            </nav>

            <div className="max-w-4xl mx-auto px-8 pt-16">
                <div className="text-center mb-16 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                        <span className="text-3xl">📚</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">
                        Frequently Asked <span className="text-green-600">Questions</span>
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        Everything you need to know about Fiscana, SME financing, and Smart Ledger management in one place.
                    </p>
                </div>

                <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                    {faqs.map((section, secIdx) => (
                        <div key={secIdx}>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">
                                {section.category}
                            </h2>
                            <div className="space-y-4">
                                {section.items.map((faq, idx) => {
                                    // Hack to keep consistent open index with number
                                    const currentIndex = secIdx * 100 + idx;
                                    const isOpen = openIndex === currentIndex;
                                    
                                    return (
                                        <div 
                                            key={currentIndex} 
                                            className={`bg-white rounded-2xl border transition-all duration-200 ${isOpen ? 'border-green-300 shadow-md ring-1 ring-green-100' : 'border-slate-200 shadow-sm hover:border-green-200'}`}
                                        >
                                            <button
                                                className="w-full text-left px-6 py-5 flex items-center justify-between focus:outline-none"
                                                onClick={() => toggleFAQ(currentIndex)}
                                            >
                                                <span className={`font-semibold text-lg pr-4 ${isOpen ? 'text-green-700' : 'text-slate-800'}`}>
                                                    {faq.question}
                                                </span>
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </div>
                                            </button>
                                            
                                            <div 
                                                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                                            >
                                                <div className="px-6 pb-6 pt-0 text-slate-600 leading-relaxed border-t border-slate-100 mt-2 pt-4">
                                                    {faq.answer.split('\n').map((line, i) => (
                                                        <React.Fragment key={i}>
                                                            {line}
                                                            <br />
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-20 text-center bg-green-50 rounded-3xl p-8 border border-green-100 animate-in slide-in-from-bottom-4 duration-500 delay-300">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Still have questions?</h3>
                    <p className="text-slate-600 mb-6">We're here to help you navigate your SME financing journey.</p>
                    <a href="mailto:support@fiscana.pro" className="inline-flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg">
                        <span>Contact Support</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default FAQPage;
