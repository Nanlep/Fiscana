import { wrapHTML } from './emailService.js';

// ============================================================
// Email Type Constants
// ============================================================

export const EMAIL_TYPES = {
    // Free/Trial user sequence
    FREE_WELCOME: 'FREE_WELCOME',
    FREE_EDUCATION: 'FREE_EDUCATION',
    FREE_FINANCE_PATH: 'FREE_FINANCE_PATH',
    FREE_ACTIVATION_NUDGE: 'FREE_ACTIVATION_NUDGE',
    FREE_CONVERSION: 'FREE_CONVERSION',
    // Paid user sequence
    PAID_CONFIRM_ANNUAL: 'PAID_CONFIRM_ANNUAL',
    PAID_CONFIRM_MONTHLY: 'PAID_CONFIRM_MONTHLY',
    PAID_ENGAGEMENT: 'PAID_ENGAGEMENT',
    PAID_FINANCE_READY: 'PAID_FINANCE_READY',
    PAID_RETENTION: 'PAID_RETENTION',
    PAID_FOLLOW_UP: 'PAID_FOLLOW_UP',
} as const;

export type EmailType = typeof EMAIL_TYPES[keyof typeof EMAIL_TYPES];

// Schedule offsets in milliseconds from the anchor event (signup or payment)
export const FREE_SEQUENCE_SCHEDULE = [
    { type: EMAIL_TYPES.FREE_WELCOME, delayMs: 24 * 60 * 60 * 1000 },          // +24 hours
    { type: EMAIL_TYPES.FREE_EDUCATION, delayMs: 3 * 24 * 60 * 60 * 1000 },    // +3 days
    { type: EMAIL_TYPES.FREE_FINANCE_PATH, delayMs: 7 * 24 * 60 * 60 * 1000 }, // +7 days
    { type: EMAIL_TYPES.FREE_ACTIVATION_NUDGE, delayMs: 10 * 24 * 60 * 60 * 1000 }, // +10 days
    { type: EMAIL_TYPES.FREE_CONVERSION, delayMs: 14 * 24 * 60 * 60 * 1000 },  // +14 days
];

export const PAID_SEQUENCE_SCHEDULE = [
    { type: EMAIL_TYPES.PAID_ENGAGEMENT, delayMs: 7 * 24 * 60 * 60 * 1000 },    // +7 days
    { type: EMAIL_TYPES.PAID_FINANCE_READY, delayMs: 14 * 24 * 60 * 60 * 1000 }, // +14 days
    { type: EMAIL_TYPES.PAID_RETENTION, delayMs: 30 * 24 * 60 * 60 * 1000 },     // +30 days
    { type: EMAIL_TYPES.PAID_FOLLOW_UP, delayMs: 45 * 24 * 60 * 60 * 1000 },     // +45 days
];

// ============================================================
// Shared Styles
// ============================================================

const styles = {
    h1: 'margin:0 0 8px;font-size:24px;color:#0f172a;',
    intro: 'margin:0 0 20px;color:#64748b;font-size:15px;',
    sectionTitle: 'margin:20px 0 12px;font-size:16px;color:#0f172a;font-weight:700;',
    bullet: 'margin:4px 0;color:#334155;font-size:14px;line-height:1.6;',
    tip: 'background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;',
    tipText: 'margin:0;color:#166534;font-size:14px;',
    cta: 'display:inline-block;background:#16a34a;color:#ffffff;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;margin:24px 0;',
    ctaDark: 'display:inline-block;background:#0f172a;color:#ffffff;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;margin:24px 0;',
    ctaOrange: 'display:inline-block;background:#f97316;color:#ffffff;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;margin:24px 0;',
    divider: 'border:none;border-top:1px solid #e2e8f0;margin:24px 0;',
    featureBox: (bg: string, color: string) => `padding:12px 16px;background:${bg};border-radius:8px;margin-bottom:8px;`,
    featureTitle: (color: string) => `color:${color};font-weight:700;font-size:14px;`,
    featureDesc: 'margin:4px 0 0;color:#64748b;font-size:13px;',
    closingNote: 'margin:24px 0 0;color:#94a3b8;font-size:12px;',
    signoff: 'margin:20px 0 0;color:#334155;font-size:14px;font-weight:600;',
};

// ============================================================
// Helper: bullet list
// ============================================================

function bulletList(items: string[]): string {
    return items.map(item => `<p style="${styles.bullet}">• ${item}</p>`).join('');
}

function numberedList(items: string[]): string {
    return items.map((item, i) => `<p style="${styles.bullet}">${i + 1}. ${item}</p>`).join('');
}

function checkList(items: string[]): string {
    return items.map(item => `<p style="${styles.bullet}">✔ ${item}</p>`).join('');
}

// ============================================================
// FREE USER TEMPLATES
// ============================================================

/**
 * FREE_WELCOME — sent 24 hours after signup
 */
export function freeWelcomeTemplate(name: string): { subject: string; html: string } {
    const subject = "Welcome to Fiscana — Let's Get Your Business Finance-Ready 🚀";
    const html = wrapHTML('Welcome to Fiscana', `
        <h1 style="${styles.h1}">Welcome to Fiscana 🚀</h1>
        <p style="${styles.intro}">Hi ${name},</p>
        <p style="${styles.intro}">Welcome to Fiscana — your all-in-one platform to manage, grow, and fund your business.</p>

        <p style="${styles.intro}">With Fiscana, you can:</p>
        ${bulletList([
            'Generate <strong>professional invoices & receipts</strong>',
            'Track <strong>income & expenses automatically</strong>',
            'Manage <strong>assets & liabilities</strong>',
            'Generate <strong>P&L, cashflow, and financial reports</strong>',
            'Build a <strong>credit profile for SME financing</strong>',
        ])}

        <h3 style="${styles.sectionTitle}">🔑 Your First 3 Steps (Takes 10 mins):</h3>
        ${numberedList([
            'Create your <strong>first invoice</strong>',
            'Record your <strong>last business expense</strong>',
            'Set up your <strong>Smart Ledger</strong>',
        ])}

        <a href="https://fiscana.pro" style="${styles.cta}">Go to Dashboard →</a>

        <div style="${styles.tip}">
            <p style="${styles.tipText}">💡 Every record you add brings you closer to accessing SME funding.</p>
        </div>

        <p style="${styles.signoff}">We're here to help you grow.</p>
        <p style="margin:4px 0 0;color:#64748b;font-size:13px;">— The Fiscana Team</p>
    `);
    return { subject, html };
}

/**
 * FREE_EDUCATION — sent 3 days after signup
 */
export function freeEducationTemplate(name: string): { subject: string; html: string } {
    const subject = "Why Most SMEs & Organisations Get Rejected for Loans (And How You Won't)";
    const html = wrapHTML('Education', `
        <h1 style="${styles.h1}">Why Most SMEs Get Rejected for Loans</h1>
        <p style="${styles.intro}">Hi ${name},</p>
        <p style="${styles.intro}">Here's the truth:</p>
        <p style="${styles.intro}">Most SMEs & Organisations don't get funding — not because they're not profitable… but because they <strong>don't have verifiable financial records.</strong></p>
        <p style="${styles.intro}">Fiscana fixes that.</p>

        <h3 style="${styles.sectionTitle}">💼 What Lenders Look For:</h3>
        ${bulletList([
            'Consistent <strong>cashflow records</strong>',
            'Structured <strong>income & expense tracking</strong>',
            'Reliable <strong>financial statements</strong>',
            'Business activity over time',
        ])}

        <h3 style="${styles.sectionTitle}">✅ What You Should Do Now:</h3>
        ${bulletList([
            'Send invoices through Fiscana',
            'Record every sale & expense',
            'Keep your Smart Ledger active',
        ])}

        <hr style="${styles.divider}" />
        <p style="${styles.intro}">📊 Within <strong>2–6 months</strong>, you'll have:</p>
        ${checkList([
            'Clean books',
            'Financial statements',
            'Credit profile',
            'Loan eligibility',
        ])}

        <a href="https://fiscana.pro" style="${styles.cta}">Start Recording Transactions →</a>

        <p style="${styles.signoff}">Your data = Your access to capital.</p>
    `);
    return { subject, html };
}

/**
 * FREE_FINANCE_PATH — sent 7 days after signup
 */
export function freeFinancePathTemplate(name: string): { subject: string; html: string } {
    const subject = "How to Unlock Finance on Fiscana 💰";
    const html = wrapHTML('Path to Finance', `
        <h1 style="${styles.h1}">How to Unlock Finance on Fiscana 💰</h1>
        <p style="${styles.intro}">Hi ${name},</p>
        <p style="${styles.intro}">Here's exactly how to access financing on Fiscana:</p>

        <h3 style="${styles.sectionTitle}">🧭 PATH 1: Fast-Track (Structured Businesses)</h3>
        <p style="${styles.intro}">You qualify if you:</p>
        ${bulletList([
            'Record at least <strong>2 months of transactions</strong>',
            'Submit a <strong>strong business case</strong>',
            'Maintain consistent activity',
        ])}

        <hr style="${styles.divider}" />

        <h3 style="${styles.sectionTitle}">🧭 PATH 2: Build & Qualify (Most SMEs)</h3>
        <p style="${styles.intro}">Use Fiscana actively for:</p>
        ${bulletList([
            '<strong>2–6 months</strong>',
            'Send invoices regularly',
            'Track income & expenses daily',
            'Maintain your Smart Ledger',
        ])}
        <p style="${styles.intro}">📈 This builds your:</p>
        ${bulletList([
            'Financial history',
            'Credit rating',
            'Loan eligibility',
        ])}

        <hr style="${styles.divider}" />

        <div style="${styles.tip}">
            <p style="${styles.tipText}">🔒 Access to SME Finance and Financial Intelligence requires a <strong>paid annual plan: ₦24,900</strong></p>
        </div>

        <h3 style="${styles.sectionTitle}">💡 Bonus Tip:</h3>
        <p style="${styles.intro}">You can also apply as a <strong>cluster group</strong>:</p>
        ${bulletList([
            'Schools',
            'Trade associations',
            'Business cooperatives',
        ])}

        <a href="https://fiscana.pro/billing" style="${styles.cta}">Upgrade & Start Building Eligibility →</a>

        <p style="${styles.signoff}">Your funding journey starts with your data.</p>
    `);
    return { subject, html };
}

/**
 * FREE_ACTIVATION_NUDGE — sent 10 days after signup
 */
export function freeActivationNudgeTemplate(name: string): { subject: string; html: string } {
    const subject = "You're 1 Step Away From Becoming Finance-Ready";
    const html = wrapHTML('Activation Nudge', `
        <h1 style="${styles.h1}">You're 1 Step Away From Becoming Finance-Ready</h1>
        <p style="${styles.intro}">Hi ${name},</p>
        <p style="${styles.intro}">Right now, your Fiscana account is set up — but not yet working <em>for you.</em></p>
        <p style="${styles.intro}">To unlock real value, you need activity.</p>

        <h3 style="${styles.sectionTitle}">🎯 Do This Today:</h3>
        ${bulletList([
            'Send invoice(s)',
            'Record expense(s)',
            'Update your Smart Ledger',
        ])}

        <p style="${styles.intro}">That's it.</p>
        <p style="${styles.intro}">📊 Small actions → Financial records → Finance access</p>

        <a href="https://fiscana.pro" style="${styles.cta}">Continue Setup →</a>

        <p style="${styles.signoff}">Don't wait until you need funding to start preparing.</p>
    `);
    return { subject, html };
}

/**
 * FREE_CONVERSION — sent 14 days after signup (trial end)
 */
export function freeConversionTemplate(name: string): { subject: string; html: string } {
    const subject = "Final Day: Unlock Funding Access & Your Building Credit Score 🔓";
    const html = wrapHTML('Upgrade to Fiscana Pro', `
        <h1 style="${styles.h1}">Your Free Trial Ends Today 🔓</h1>
        <p style="${styles.intro}">👋🏾 Hi ${name},</p>
        <p style="${styles.intro}">Over the last 14 days, you've started building a digital footprint for your business. Today, your free trial ends — but your growth shouldn't.</p>
        <p style="${styles.intro}">It's time to choose how you want to scale:</p>

        <hr style="${styles.divider}" />

        <div style="${styles.featureBox('#eff6ff', '#2563eb')}">
            <p style="${styles.featureTitle('#2563eb')}">💳 Flexible Monthly (₦2,500/month)</p>
            ${bulletList([
                '<strong>Full Ledger Access:</strong> Keep recording every income and expense.',
                '<strong>Credit Rating:</strong> Watch your score grow in real-time as you log data.',
                '<strong>2026 Tax Compliance:</strong> Stay ready for Nigeria\'s newest tax reforms automatically.',
                '<strong>Professional Reports:</strong> Export verified financial statements whenever you need them.',
            ])}
        </div>

        <div style="${styles.featureBox('#f0fdf4', '#16a34a')}">
            <p style="${styles.featureTitle('#16a34a')}">🔓 Premium Annual (₦24,900/year) — Most Popular</p>
            ${bulletList([
                '<strong>SME Finance Portal:</strong> Immediate access to apply for business funding.',
                '<strong>Funding Range:</strong> ₦1M – ₦50M (based on your Fiscana records & rating).',
                '<strong>Priority Support:</strong> Direct access to our financial experts.',
                '<strong>All Monthly Features:</strong> Plus the peace of mind of a full year of coverage.',
            ])}
        </div>

        <hr style="${styles.divider}" />

        <p style="${styles.intro}">🚀 <strong>Don't Let Your Data Go Dormant:</strong> Your credit building activity pauses today. Secure your history and keep your score climbing by selecting your plan now.</p>

        <a href="https://fiscana.pro/billing" style="${styles.cta}">Upgrade to Fiscana Pro Now →</a>

        <div style="${styles.tip}">
            <p style="${styles.tipText}">💡 <strong>Smart Business Logic:</strong> Serious businesses track their numbers; Smart businesses use those numbers to access the capital they need to win.</p>
            <p style="${styles.tipText}; margin-top:8px;">💡 <strong>Saving 20%:</strong> Choosing the Annual Plan today saves you ₦5,100 a year compared to paying monthly.</p>
        </div>

        <p style="${styles.signoff}">Let's turn your records into your biggest asset.</p>
    `);
    return { subject, html };
}

// ============================================================
// PAID USER TEMPLATES
// ============================================================

/**
 * PAID_CONFIRM_ANNUAL — sent immediately after annual payment
 */
export function paidConfirmAnnualTemplate(name: string): { subject: string; html: string } {
    const subject = "Payment Confirmed — You've Unlocked Full Access 🎉";
    const html = wrapHTML('Payment Confirmed', `
        <h1 style="${styles.h1}">Payment Confirmed 🎉</h1>
        <p style="${styles.intro}">👋🏾 Hi ${name},</p>
        <p style="${styles.intro}">Your Fiscana annual plan is now active ✅</p>
        <p style="${styles.intro}">You've just unlocked:</p>

        ${bulletList([
            'SME Finance access (₦1M – ₦50M)',
            'Professional Invoicing and Receipts Generation',
            'Credit Rating (Build-up)',
            'Advanced Financial Intelligence',
            'Nigeria 2026 Tax Compliance Tools',
            'Top Priority Support Service',
        ])}

        <hr style="${styles.divider}" />

        <h3 style="${styles.sectionTitle}">🚀 What We Recommend You Do In The Next 3 Days:</h3>
        ${numberedList([
            'Send at least <strong>2 invoices</strong>',
            'Start recording your <strong>income & expenses</strong> on your ledger',
            'Upload your business/company logo via Settings',
        ])}

        <a href="https://fiscana.pro" style="${styles.cta}">Go to My Dashboard →</a>

        <div style="${styles.tip}">
            <p style="${styles.tipText}">💡 <strong>Important:</strong> Your funding eligibility starts building <em>from today's activity.</em></p>
            <p style="${styles.tipText}; margin-top:8px;">The more you use Fiscana for your business transactions → the stronger your financial profile becomes.</p>
        </div>

        <p style="${styles.signoff}">Let's get to work.</p>
    `);
    return { subject, html };
}

/**
 * PAID_CONFIRM_MONTHLY — sent immediately after monthly payment
 */
export function paidConfirmMonthlyTemplate(name: string): { subject: string; html: string } {
    const subject = "Payment Confirmed — Your Monthly Access is Now Active 🚀🎉";
    const html = wrapHTML('Payment Confirmed', `
        <h1 style="${styles.h1}">Payment Confirmed 🚀🎉</h1>
        <p style="${styles.intro}">👋🏾 Hi ${name},</p>
        <p style="${styles.intro}">Your Fiscana monthly plan is now active ✅</p>
        <p style="${styles.intro}">You've just unlocked:</p>

        ${bulletList([
            'Advanced Financial Intelligence',
            'Professional Invoicing and Receipts Generation',
            'Reliable Customer Support',
            'Credit Rating (Build-up)',
            'Nigeria 2026 Tax Compliance Tools',
        ])}

        <hr style="${styles.divider}" />

        <h3 style="${styles.sectionTitle}">🚀 What We Recommend You Do In The Next 3 Days:</h3>
        ${numberedList([
            'Send your first professional <strong>invoice</strong>',
            'Start recording your <strong>income & expenses</strong> on your ledger',
            'Upload your business/company logo via Settings',
        ])}

        <a href="https://fiscana.pro" style="${styles.cta}">Go to My Dashboard →</a>

        <div style="${styles.tip}">
            <p style="${styles.tipText}">💡 <strong>Important:</strong> Your credit score starts building from today's activity.</p>
            <p style="${styles.tipText}; margin-top:8px;">The more you use Fiscana for your business transactions → the stronger your financial profile becomes.</p>
            <p style="${styles.tipText}; margin-top:8px;">Want to unlock SME Finance (₦1M – ₦50M)? Upgrade to the Annual Plan anytime!</p>
        </div>

        <p style="${styles.signoff}">Let's get to work.</p>
    `);
    return { subject, html };
}

/**
 * PAID_ENGAGEMENT — sent 7 days after payment
 */
export function paidEngagementTemplate(name: string): { subject: string; html: string } {
    const subject = "7 Days In — How's Your Fiscana Journey Going? 🚀";
    const html = wrapHTML('7 Day Check-in', `
        <h1 style="${styles.h1}">7 Days In — How's It Going? 🚀</h1>
        <p style="${styles.intro}">👋🏾 Hi ${name},</p>
        <p style="${styles.intro}">It's been exactly one week since you joined the Fiscana community! We hope you're already feeling more in control of your business finances.</p>

        <h3 style="${styles.sectionTitle}">Why being regular on Fiscana is a game-changer for you:</h3>
        ${bulletList([
            '<strong>Zero Tax Stress:</strong> By recording transactions as they happen, your 2026 Tax Reports are always ready. No manual calculations at the end of the month.',
            '<strong>Real-Time Insights:</strong> Your AI Financial Advisor gets smarter every time you add data, giving you better advice on how to save and grow.',
            '<strong>Stronger Funding Profile:</strong> Lenders love consistency. Every invoice and expense you log builds the "data-story" that makes you eligible for ₦1M – ₦50M in SME Finance.',
        ])}

        <hr style="${styles.divider}" />

        <h3 style="${styles.sectionTitle}">🚀 What We Recommend You Try This Week:</h3>
        ${bulletList([
            '<strong>Categorize:</strong> Spend 5 minutes today tagging your latest expenses (Business vs. Personal).',
            '<strong>Review:</strong> Head to the AI Tax Intelligence tab to see your current liability and saving tips.',
            '<strong>Budget Check:</strong> Set a limit for your monthly operations to see how much you can save this month.',
        ])}

        <a href="https://fiscana.pro" style="${styles.cta}">Go to My Dashboard →</a>

        <div style="${styles.tip}">
            <p style="${styles.tipText}">💡 <strong>The Power of Small Wins:</strong> You don't need to spend hours. Just 5 minutes of daily "ledger-cleaning" is the difference between a struggling business and a bankable one.</p>
            <p style="${styles.tipText}; margin-top:8px;">💡 <strong>We're Here for You:</strong> Stuck on something? Hit the Support tab in your dashboard, and our team will get you back on track.</p>
        </div>

        <p style="${styles.signoff}">Let's keep building that business!</p>
    `);
    return { subject, html };
}

/**
 * PAID_FINANCE_READY — sent 14 days after payment
 */
export function paidFinanceReadyTemplate(name: string): { subject: string; html: string } {
    const subject = "You're Closer to Funding Than You Think 💰";
    const html = wrapHTML('SME Finance Readiness', `
        <h1 style="${styles.h1}">You're Closer to Funding Than You Think 💰</h1>
        <p style="${styles.intro}">Hi ${name},</p>
        <p style="${styles.intro}">Let's talk about your path to SME financing.</p>

        <h3 style="${styles.sectionTitle}">🧭 You Can Apply When You Have:</h3>
        ${bulletList([
            'Bank statement of at least 6-12 months',
            'Consistent Smart Ledger usage',
            'Clear revenue & expense tracking',
        ])}

        <hr style="${styles.divider}" />

        <h3 style="${styles.sectionTitle}">💼 Funding Range:</h3>
        <p style="font-size:24px;font-weight:800;color:#16a34a;margin:8px 0 4px;">₦1M – ₦50M</p>
        <p style="${styles.intro}">(Based on your financial strength)</p>

        <hr style="${styles.divider}" />

        <h3 style="${styles.sectionTitle}">⚡ Want Faster Approval?</h3>
        <p style="${styles.intro}">You can apply as:</p>
        ${checkList([
            '<strong>Individual SME</strong>',
            '<strong>Cluster Group (Shared Suretyship)</strong>',
        ])}
        <p style="${styles.intro}">Clusters (schools, associations, cooperatives) often:</p>
        ${bulletList([
            'Get <strong>higher approval chances</strong>',
            'Access <strong>larger funding pools</strong>',
        ])}

        <a href="https://fiscana.pro" style="${styles.cta}">Explore SME Finance →</a>

        <p style="${styles.signoff}">You're not starting from zero — you're building momentum.</p>
    `);
    return { subject, html };
}

/**
 * PAID_RETENTION — sent 30 days after payment
 */
export function paidRetentionTemplate(name: string): { subject: string; html: string } {
    const subject = "Don't Waste Your Access — Turn It Into Capital";
    const html = wrapHTML('Stay Active', `
        <h1 style="${styles.h1}">Don't Waste Your Access — Turn It Into Capital</h1>
        <p style="${styles.intro}">Hi ${name},</p>
        <p style="${styles.intro}">You've already done the hard part — you upgraded.</p>
        <p style="${styles.intro}">Now the question is:</p>
        <p style="font-size:16px;font-weight:700;color:#0f172a;margin:16px 0;">👉 Will you use it to unlock funding?</p>

        <hr style="${styles.divider}" />

        <h3 style="${styles.sectionTitle}">📉 What Happens If You Don't Use Fiscana:</h3>
        ${bulletList([
            'No financial records',
            'No credit profile',
            'No funding access',
        ])}

        <hr style="${styles.divider}" />

        <h3 style="${styles.sectionTitle}">📈 What Happens If You Stay Active:</h3>
        ${bulletList([
            'Verified financial statements',
            'Strong credit rating',
            'Access to ₦1M – ₦50M funding',
        ])}

        <hr style="${styles.divider}" />

        <h3 style="${styles.sectionTitle}">🎯 Your Goal:</h3>
        <p style="${styles.intro}">Stay active for the next <strong>30–90 days</strong></p>
        <p style="${styles.intro}">That's your window to:</p>
        ${checkList([
            'Build credibility',
            'Qualify',
            'Apply',
        ])}

        <a href="https://fiscana.pro" style="${styles.cta}">Go to Dashboard →</a>

        <div style="${styles.tip}">
            <p style="${styles.tipText}">💡 This isn't just software. It's your <strong>gateway to capital.</strong></p>
        </div>
    `);
    return { subject, html };
}

/**
 * PAID_FOLLOW_UP — sent 45 days after payment
 */
export function paidFollowUpTemplate(name: string): { subject: string; html: string } {
    const subject = "How SMEs Like You Unlock Millions in Funding";
    const html = wrapHTML('Follow Up', `
        <h1 style="${styles.h1}">How SMEs Like You Unlock Millions in Funding</h1>
        <p style="${styles.intro}">Hi ${name},</p>
        <p style="${styles.intro}">Businesses like yours are already using Fiscana to:</p>

        ${bulletList([
            'Organize their finances',
            'Build credit profiles',
            'Access SME funding',
        ])}

        <hr style="${styles.divider}" />

        <h3 style="${styles.sectionTitle}">🧠 What They Do Differently:</h3>
        ${bulletList([
            'They don\'t skip daily records',
            'They use invoices consistently',
            'They treat data like an asset',
        ])}

        <hr style="${styles.divider}" />

        <h3 style="${styles.sectionTitle}">🚀 The Result:</h3>
        <p style="${styles.intro}">Within months, they become:</p>
        ${checkList([
            'Finance-ready',
            'Lender-trusted',
            'Growth-positioned',
        ])}

        <a href="https://fiscana.pro" style="${styles.cta}">Keep Building Your Records →</a>

        <p style="${styles.signoff}">You're on the same path — just stay consistent.</p>
    `);
    return { subject, html };
}

// ============================================================
// Template Resolver — maps emailType string to template function
// ============================================================

export function getEmailTemplate(emailType: string, name: string): { subject: string; html: string } | null {
    switch (emailType) {
        case EMAIL_TYPES.FREE_WELCOME: return freeWelcomeTemplate(name);
        case EMAIL_TYPES.FREE_EDUCATION: return freeEducationTemplate(name);
        case EMAIL_TYPES.FREE_FINANCE_PATH: return freeFinancePathTemplate(name);
        case EMAIL_TYPES.FREE_ACTIVATION_NUDGE: return freeActivationNudgeTemplate(name);
        case EMAIL_TYPES.FREE_CONVERSION: return freeConversionTemplate(name);
        case EMAIL_TYPES.PAID_CONFIRM_ANNUAL: return paidConfirmAnnualTemplate(name);
        case EMAIL_TYPES.PAID_CONFIRM_MONTHLY: return paidConfirmMonthlyTemplate(name);
        case EMAIL_TYPES.PAID_ENGAGEMENT: return paidEngagementTemplate(name);
        case EMAIL_TYPES.PAID_FINANCE_READY: return paidFinanceReadyTemplate(name);
        case EMAIL_TYPES.PAID_RETENTION: return paidRetentionTemplate(name);
        case EMAIL_TYPES.PAID_FOLLOW_UP: return paidFollowUpTemplate(name);
        default: return null;
    }
}
