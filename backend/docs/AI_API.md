# AI API Documentation

## Overview

The Fiscana Backend AI API provides Gemini-powered financial intelligence. All endpoints are prefixed with `/api/ai` and require authentication.

**Base URL**: `http://localhost:4000/api/ai`

---

## Endpoints

### 1. Tax Analysis

**POST** `/api/ai/tax-analysis`

Analyze tax liability based on user's transactions.

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "annualIncome": 5000000
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "estimatedIncomeTax": 750000,
    "estimatedVAT": 375000,
    "deductibleExpenses": 1200000,
    "taxableIncome": 3800000,
    "complianceScore": 85,
    "recommendations": [
      "Keep receipts for all equipment purchases",
      "Consider registering for VAT if turnover exceeds ₦25M",
      "File your annual returns before the deadline"
    ],
    "topPersonalExpenses": [
      {"description": "Rent", "amount": 1200000, "category": "Housing"},
      {"description": "Groceries", "amount": 360000, "category": "Food"}
    ],
    "topBusinessExpenses": [
      {"description": "MacBook Pro", "amount": 2400000, "category": "Equipment"},
      {"description": "AWS Hosting", "amount": 480000, "category": "Software"}
    ],
    "keyFinancialDecisions": [
      "Major capital investment in technology equipment",
      "Consistent recurring SaaS subscriptions"
    ]
  }
}
```

---

### 2. Chat with Tax Advisor (Sync)

**POST** `/api/ai/chat`

Chat with the AI tax advisor (full response).

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What expenses can I deduct as a freelance developer in Nigeria?",
  "history": [
    {"role": "user", "text": "Hello"},
    {"role": "model", "text": "Hello! How can I help you with your finances today?"}
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "As a freelance developer in Nigeria, you can deduct several business expenses..."
  }
}
```

---

### 3. Chat with Tax Advisor (Streaming)

**POST** `/api/ai/chat/stream`

Chat with streaming response (Server-Sent Events).

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Explain VAT in Nigeria",
  "history": []
}
```

**Response (200 OK - SSE):**
```
data: {"chunk":"VAT (Value Added Tax) in Nigeria is "}
data: {"chunk":"a consumption tax of 7.5% "}
data: {"chunk":"charged on the supply of goods and services..."}
data: {"done":true}
```

**Frontend Usage:**
```javascript
const response = await fetch('/api/ai/chat/stream', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ message, history })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  const lines = text.split('\n').filter(line => line.startsWith('data: '));
  
  for (const line of lines) {
    const data = JSON.parse(line.slice(6));
    if (data.done) break;
    console.log(data.chunk); // Stream to UI
  }
}
```

---

### 4. Auto-Categorize Transactions

**POST** `/api/ai/categorize`

Automatically categorize bank transaction descriptions.

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "descriptions": [
    "TRF/PAYSTACK/NETFLIX SUBSCRIPTION",
    "NIP/SALARY/ACME CORP",
    "POS/SHOPRITE LEKKI",
    "TRF/AWS EU WEST/AMAZON"
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "originalDescription": "TRF/PAYSTACK/NETFLIX SUBSCRIPTION",
      "cleanedPayee": "Netflix",
      "category": "Entertainment",
      "expenseCategory": "PERSONAL",
      "type": "EXPENSE",
      "taxDeductible": false,
      "tags": ["#BankImport", "#Recurring"]
    },
    {
      "originalDescription": "NIP/SALARY/ACME CORP",
      "cleanedPayee": "Acme Corp",
      "category": "Salary",
      "expenseCategory": "BUSINESS",
      "type": "INCOME",
      "taxDeductible": false,
      "tags": ["#BankImport", "#Salary"]
    },
    {
      "originalDescription": "POS/SHOPRITE LEKKI",
      "cleanedPayee": "Shoprite",
      "category": "Groceries",
      "expenseCategory": "PERSONAL",
      "type": "EXPENSE",
      "taxDeductible": false,
      "tags": ["#BankImport"]
    },
    {
      "originalDescription": "TRF/AWS EU WEST/AMAZON",
      "cleanedPayee": "AWS",
      "category": "Software",
      "expenseCategory": "BUSINESS",
      "type": "EXPENSE",
      "taxDeductible": true,
      "tags": ["#BankImport", "#Recurring", "#Cloud"]
    }
  ]
}
```

---

### 5. Financial Insights

**GET** `/api/ai/insights`

Get AI-generated financial insights.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": "Your finances are healthy with a net income of ₦2.5M this quarter. Consider setting aside funds for Q1 tax payments.",
    "insights": [
      "Total income: ₦5,000,000",
      "Total expenses: ₦2,500,000",
      "3 invoices pending payment worth ₦450,000"
    ],
    "warnings": [
      "2 overdue invoices need immediate attention"
    ]
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation Error | Invalid request body |
| 401 | Authentication Error | Invalid or missing token |
| 500 | Internal Error | AI service unavailable (fallback values returned) |

---

## Rate Limiting

All AI endpoints are subject to the standard API rate limit: 100 requests per 15 minutes per IP.

---

## Notes

- All responses include fallback values if AI service is unavailable
- Tax calculations are estimates and should be verified by a tax professional
- Categorization is AI-powered and may require manual review
- Chat history is not persisted - frontend must manage conversation state
