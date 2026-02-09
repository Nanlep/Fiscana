
# Fiscana - Financial OS for Nigerian Creators

Fiscana is a comprehensive, AI-powered financial management platform designed specifically for freelancers, remote workers, and tech consultants in Nigeria. It bridges the gap between personal finance and professional accounting, ensuring compliance with the Nigerian Finance Act 2026.

![Status](https://img.shields.io/badge/Status-Beta-blue) ![Stack](https://img.shields.io/badge/Tech-React_19_|_TypeScript_|_Gemini_AI-green)

## 🌟 Key Features

### 1. Smart Invoicing & Collections
- **Multi-Currency Support**: Invoice in NGN or USD.
- **Part Payments**: Track partial deposits and outstanding balances automatically.
- **Bani.africa Integration**: Generate secure payment links for instant settlement.
- **Tax Compliance**: Auto-calculates VAT (7.5%) and WHT deductions based on client type.
- **Receipts**: Generate downloadable PDF receipts for payments received.

### 2. General Ledger & Banking
- **Open Banking (Mono)**: Sync transactions directly from Nigerian banks (GTBank, Zenith, Kuda, etc.).
- **AI Categorization**: Uses **Gemini 3.0 Flash** to auto-tag transactions as Personal or Business.
- **Tax Tagging**: Transactions are automatically tagged (`ALLOWABLE_EXPENSE`, `CAPITAL_EXPENSE`, `TAXABLE_INCOME`) for tax filing.
- **Evidence**: Attach receipts to expenses for audit trails.

### 3. Budgeting & Variance Analysis
- **Accounting Best Practice**: Tracks "Budgeted vs. Actuals" with variance calculations.
- **Visualizations**: Progress bars and pie charts for spend tracking.
- **Reporting**: Export budget performance to **PDF** (Management Report) or **CSV** (Excel analysis).

### 4. Financial Reporting (IFRS S1/S2 Aligned)
- **Profit & Loss**: Real-time view of Net Profit.
- **Balance Sheet**: Tracks Assets (Cash, Crypto, Equipment) vs. Liabilities (Loans).
- **Cash Flow**: Monitors operating, investing, and financing cash flows.

### 5. AI Tax Advisor
- **Gemini Powered**: Chat with a context-aware financial assistant.
- **Compliance Score**: Analyzes ledger data to score financial health.
- **Strategy**: Provides actionable advice on reducing tax liability legally.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory. You will need keys for Google Gemini (AI) and Mono (Banking).

```env
# Required for AI Features
API_KEY=your_google_gemini_api_key

# Required for Bank Sync (Frontend Widget)
REACT_APP_MONO_PUBLIC_KEY=your_mono_public_key
```

### 3. Run Development Server
```bash
npm start
```

---

## 🏗 System Architecture & Integrations

### Data Persistence
*   **Current State**: Uses `localStorage` for a zero-setup demo experience.
*   **Production**: Requires a persistent database (PostgreSQL/Supabase) to store User Profiles, Transactions, and Invoices.

### Payment Rails (Bani.africa)
*   **Service**: `services/baniService.ts`
*   **Function**: Simulates Payouts (Withdrawals to Banks/Crypto) and Collections (Payment Links).
*   **Production Note**: Interactions should move to a secure backend to protect API Secrets.

### Open Banking (Mono)
*   **Service**: `components/BankConnect.tsx`
*   **Function**: Handles the Mono Connect Widget to authorize bank accounts.
*   **Production Note**: Requires a backend endpoint to exchange the `auth_code` for an `account_id` securely.

---

## 🛡️ Production Readiness Checklist

To move this application from **Demo/MVP** to a **Live Production Server**, the following steps are required:

1.  **Backend Implementation**:
    *   Spin up a Node.js/Express or Python/Django backend.
    *   Move `services/bankService.ts` and `services/baniService.ts` logic to the server.
    *   **Crucial**: Never expose Bani/Mono Secret Keys in the React frontend.

2.  **Authentication**:
    *   Replace the mock Login/KYC system with a real Auth provider (e.g., Supabase Auth, Firebase, or Clerk).
    *   Implement Role-Based Access Control (RBAC) on the backend APIs.

3.  **Database**:
    *   Migrate `localStorage` data models (`types.ts`) to a relational database schema (Prisma/Postgres recommended).

4.  **AI Security**:
    *   Proxy requests to Google Gemini through your backend to protect the `API_KEY` and enforce rate limiting.

5.  **Deployment**:
    *   **Frontend**: Vercel, Netlify, or AWS Amplify.
    *   **Backend**: Railway, Render, or AWS ECS.

---

## 📜 License

Proprietary - Built for Fiscana Financial Services.
