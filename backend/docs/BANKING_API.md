# Banking API Documentation

## Overview

The Fiscana Backend Banking API integrates with Mono.co for open banking. It enables secure bank account linking, transaction syncing, and AI-powered categorization.

**Base URL**: `http://localhost:4000/api/banking`

---

## Endpoints

### 1. Connect Bank Account

**POST** `/api/banking/connect`

Exchange Mono auth code for account ID after widget completion.

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "authCode": "code_xxxxxxxxxxxxx"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bank account linked successfully",
  "data": {
    "accountId": "61edd5c76d7c790e5c7f1c22",
    "account": {
      "id": "61edd5c76d7c790e5c7f1c22",
      "institution": {
        "name": "Guaranty Trust Bank",
        "bankCode": "058",
        "type": "PERSONAL_BANKING"
      },
      "name": "John Doe",
      "accountNumber": "0123456789",
      "type": "SAVINGS",
      "currency": "NGN",
      "balance": 1500000,
      "bvn": "22********90"
    }
  }
}
```

---

### 2. Get Linked Accounts

**GET** `/api/banking/accounts`

Get user's linked bank accounts.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "linked_abc123",
      "monoAccountId": "61edd5c76d7c790e5c7f1c22",
      "bankName": "Guaranty Trust Bank",
      "accountNumber": "0123456789",
      "accountName": "John Doe",
      "balance": 1500000,
      "lastSynced": "2026-02-07T00:45:00.000Z"
    }
  ]
}
```

---

### 3. Get Account Details

**GET** `/api/banking/accounts/:accountId`

Get details for a specific linked account.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "61edd5c76d7c790e5c7f1c22",
    "institution": {
      "name": "Guaranty Trust Bank",
      "bankCode": "058",
      "type": "PERSONAL_BANKING"
    },
    "name": "John Doe",
    "accountNumber": "0123456789",
    "type": "SAVINGS",
    "currency": "NGN",
    "balance": 1520000
  }
}
```

---

### 4. Get Transactions

**GET** `/api/banking/accounts/:accountId/transactions`

Get transactions from connected bank account.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `start` | ISO Date | Start date filter |
| `end` | ISO Date | End date filter |
| `limit` | number | Max transactions (1-200) |

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_123",
        "narration": "NIP/SALARY/ACME CORP",
        "amount": 150000000,
        "type": "credit",
        "balance": 152000000,
        "date": "2026-02-01"
      },
      {
        "id": "txn_124",
        "narration": "POS/SHOPRITE LEKKI",
        "amount": 1200000,
        "type": "debit",
        "balance": 150800000,
        "date": "2026-02-02"
      }
    ],
    "paging": {
      "total": 150,
      "next": "cursor_abc123"
    }
  }
}
```

> **Note**: Amounts are in kobo (divide by 100 for Naira)

---

### 5. Sync & Categorize Transactions

**POST** `/api/banking/accounts/:accountId/sync`

Sync transactions from bank + AI categorization.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Synced and categorized 25 transactions",
  "data": {
    "synced": 25,
    "transactions": [
      {
        "date": "2026-02-01",
        "amount": 1500000,
        "description": "NIP/SALARY/ACME CORP",
        "currency": "NGN",
        "direction": "CREDIT",
        "categorization": {
          "originalDescription": "NIP/SALARY/ACME CORP",
          "cleanedPayee": "Acme Corp",
          "category": "Salary",
          "expenseCategory": "BUSINESS",
          "type": "INCOME",
          "taxDeductible": false,
          "tags": ["#MonoImport", "#Salary", "#Recurring"]
        }
      }
    ]
  }
}
```

This endpoint combines:
1. **Mono API** - Fetches raw bank transactions
2. **Gemini AI** - Categorizes each transaction automatically

---

### 6. Unlink Account

**DELETE** `/api/banking/accounts/:accountId`

Unlink a bank account from Fiscana.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bank account unlinked successfully"
}
```

---

### 7. Webhook Handler

**POST** `/api/banking/webhook`

Handle Mono webhook events.

**Headers:**
```
mono-webhook-secret: <hmac_signature>
Content-Type: application/json
```

**Request Body:**
```json
{
  "event": "mono.events.account_updated",
  "data": {
    "account": "61edd5c76d7c790e5c7f1c22"
  }
}
```

**Events Handled:**
| Event | Description |
|-------|-------------|
| `mono.events.account_connected` | New account linked |
| `mono.events.account_updated` | Account balance changed |
| `mono.events.account_reauthorization_required` | User needs to re-auth |

---

## Frontend Integration

### Mono Connect Widget

```html
<!-- Add to index.html -->
<script src="https://connect.mono.co/connect.js"></script>
```

```javascript
// Frontend code
const connectBank = () => {
  const mono = new Connect({
    key: 'your_mono_public_key',
    onSuccess: async ({ code }) => {
      // Send code to backend
      const response = await fetch('/api/banking/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ authCode: code })
      });
      const data = await response.json();
      console.log('Account linked:', data);
    },
    onClose: () => console.log('Widget closed')
  });
  
  mono.setup();
  mono.open();
};
```

---

## Environment Variables

```env
# Mono API Credentials
MONO_PUBLIC_KEY=live_pk_xxxxxxxxxxxxx
MONO_SECRET_KEY=live_sk_xxxxxxxxxxxxx
```

---

## Development Mode

In development (`NODE_ENV=development`), the API returns mock data:
- Account linking returns test account
- Transactions return simulated bank data
- All features are testable without real Mono credentials
