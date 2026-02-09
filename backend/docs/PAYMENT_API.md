# Payment API Documentation

## Overview

The Fiscana Backend Payment API integrates with Bani.africa for payment processing. All endpoints are prefixed with `/api/payments`.

**Base URL**: `http://localhost:4000/api/payments`

---

## Endpoints

### 1. List Banks

**GET** `/api/payments/banks`

List available Nigerian banks for transfers.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "code": "044", "name": "Access Bank" },
    { "code": "058", "name": "Guaranty Trust Bank" },
    { "code": "057", "name": "Zenith Bank" },
    ...
  ]
}
```

---

### 2. Resolve Bank Account

**POST** `/api/payments/resolve-account`

Resolve bank account details via NIBSS lookup.

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "accountNumber": "0123456789",
  "bankCode": "058"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accountName": "JOHN DOE",
    "accountNumber": "0123456789",
    "bankCode": "058",
    "bankName": "Guaranty Trust Bank"
  }
}
```

---

### 3. Initiate Payout

**POST** `/api/payments/payout`

Initiate a payout (withdrawal) to bank or crypto wallet.

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body (Bank Transfer):**
```json
{
  "amount": 50000,
  "currency": "NGN",
  "destination": {
    "type": "BANK",
    "bankCode": "058",
    "accountNumber": "0123456789"
  },
  "narration": "Salary payment"
}
```

**Request Body (Crypto Transfer):**
```json
{
  "amount": 100,
  "currency": "USDC",
  "destination": {
    "type": "CRYPTO_WALLET",
    "walletAddress": "0x1234...abcd",
    "network": "ethereum"
  },
  "narration": "Crypto withdrawal"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payout initiated successfully",
  "data": {
    "reference": "payout_1707234567890_abc123",
    "status": "PENDING",
    "message": "Transfer is being processed"
  }
}
```

---

### 4. Create Payment Link

**POST** `/api/payments/payment-link`

Create a payment collection link for invoices.

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 150000,
  "currency": "NGN",
  "customerEmail": "client@example.com",
  "customerName": "Jane Smith",
  "description": "Invoice #INV-2026-001",
  "invoiceId": "clxyz123..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment link created successfully",
  "data": {
    "paymentLink": "https://pay.bani.africa/pay/abc123?amount=150000&currency=NGN",
    "reference": "inv_1707234567890_xyz789",
    "expiresAt": "2026-02-13T01:43:06.000Z"
  }
}
```

---

### 5. Webhook Handler

**POST** `/api/payments/webhook`

Handle Bani webhook events. This endpoint is public but validates signatures.

**Headers:**
```
x-bani-signature: <hmac_sha512_signature>
Content-Type: application/json
```

**Request Body:**
```json
{
  "event": "payment.successful",
  "data": {
    "reference": "inv_1707234567890_xyz789",
    "amount": 150000,
    "currency": "NGN",
    "status": "successful",
    "customer_email": "client@example.com",
    "metadata": {
      "invoice_id": "clxyz123..."
    }
  }
}
```

**Events Handled:**
| Event | Description |
|-------|-------------|
| `payment.successful` | Payment completed - updates invoice status |
| `payment.failed` | Payment failed |
| `payout.successful` | Payout completed |
| `payout.failed` | Payout failed |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook received"
}
```

---

### 6. Check Status

**GET** `/api/payments/status/:reference`

Check payment or payout status by reference.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reference": "payout_1707234567890_abc123",
    "status": "PENDING",
    "message": "Status check not yet implemented - check Bani dashboard"
  }
}
```

---

## Webhook Setup

To receive payment notifications, configure your webhook URL in the Bani dashboard:

1. Log in to [Bani.africa Dashboard](https://dashboard.bani.africa)
2. Go to **Settings** → **Webhooks**
3. Add webhook URL: `https://your-domain.com/api/payments/webhook`
4. Copy the webhook secret and add it to your environment variables

---

## Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation Error | Invalid request body |
| 401 | Authentication Error | Invalid or missing token |
| 502 | External Service Error | Bani API unavailable |

---

## Development Mode

In development (`NODE_ENV=development`), the API returns mock data when Bani API is unavailable:
- Bank lookups return "TEST ACCOUNT HOLDER"
- Payouts return pending status
- Payment links return mock Bani URLs

---

## Environment Variables

```env
# Bani API Credentials
BANI_PUBLIC_KEY=your_bani_public_key
BANI_SECRET_KEY=your_bani_secret_key
```
