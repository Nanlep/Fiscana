# Fiscana - Financial OS for Nigerian Creators

Fiscana is a comprehensive financial management platform designed for freelancers, remote workers, and tech consultants in Nigeria. It features multi-currency invoicing, AI-powered tax advisory (Gemini 3.0), and open banking integration via Mono.

## 🚀 Quick Start

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    REACT_APP_MONO_PUBLIC_KEY=your_mono_public_key_here
    API_KEY=your_google_gemini_api_key
    ```

3.  **Run Development Server**
    ```bash
    npm start
    ```

---

## 🏦 Mono Open Banking Integration Guide

Fiscana uses **Mono Connect** to link user bank accounts securely.

### 1. Prerequisites
- Create an account on the [Mono Dashboard](https://app.mono.co/).
- Create an App to get your `PUBLIC_KEY` and `SECRET_KEY`.

### 2. Frontend Integration (Implemented)
The `components/BankConnect.tsx` file handles the client-side widget initialization.
- It initializes `window.Connect` with your Public Key.
- On success, it receives an `auth_code`.

### 3. Backend Integration (Required for Production)
The current application simulates the backend exchange in `services/bankService.ts`. For a live production server, you must implement a backend endpoint:

**Endpoint:** `POST /api/v1/bank/exchange-token`

**Logic:**
1.  Receive `code` from frontend.
2.  Call Mono API: `POST https://api.withmono.com/account/auth`
    - Headers: `mono-sec-key: YOUR_SECRET_KEY`
    - Body: `{ code: "received_code" }`
3.  Response contains the `id` (Account ID). Store this securely.
4.  Call Mono API: `GET https://api.withmono.com/accounts/{id}/transactions` to fetch data.
5.  Return sanitized transactions to the frontend.

---

## 🛠 Deployment Guide (Production)

### 1. Build for Production
Create an optimized production build:
```bash
npm run build
```

### 2. Deployment Targets

#### Vercel / Netlify (Recommended for Frontend)
1.  Connect your GitHub repository.
2.  Set Environment Variables in the dashboard (`REACT_APP_MONO_PUBLIC_KEY`, `API_KEY`).
3.  Deploy.

#### Docker / Custom Server
Use a multi-stage Dockerfile to serve the static build with Nginx.

```dockerfile
# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve Stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Security Checklist
- **HTTPS is mandatory** for Mono Connect to work correctly in production.
- Ensure `SECRET_KEY` is **never** exposed to the frontend.
- Implement rate limiting on your backend API endpoints.

---

## 🤖 AI & Tax Logic
The `services/geminiService.ts` module uses **Google Gemini 3 Flash** to:
1.  Analyze bank transaction descriptions.
2.  Auto-categorize expenses (Business vs Personal).
3.  Estimate tax liabilities based on Nigerian Finance Act 2026 rules.

Ensure your Google Cloud Project has the Generative Language API enabled.
