# Authentication API Documentation

## Overview

The Fiscana Backend API provides a complete authentication system using Supabase Auth. All authentication endpoints are prefixed with `/api/auth`.

**Base URL**: `http://localhost:4000/api/auth`

---

## Endpoints

### 1. Sign Up

**POST** `/api/auth/signup`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "type": "INDIVIDUAL",          // Optional: INDIVIDUAL (default) or CORPORATE
  "companyName": "Acme Inc"      // Required if type is CORPORATE
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "type": "INDIVIDUAL",
      "role": "USER",
      "kycStatus": "UNVERIFIED",
      "tier": "TIER_1"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

### 2. Login

**POST** `/api/auth/login`

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "type": "INDIVIDUAL",
      "companyName": null,
      "role": "USER",
      "kycStatus": "UNVERIFIED",
      "tier": "TIER_1"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

### 3. Logout

**POST** `/api/auth/logout`

Logout the current user (requires authentication).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 4. Get Current User

**GET** `/api/auth/me`

Get the current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "type": "INDIVIDUAL",
    "companyName": null,
    "role": "USER",
    "kycStatus": "UNVERIFIED",
    "tier": "TIER_1",
    "tin": null,
    "createdAt": "2026-02-06T00:00:00.000Z"
  }
}
```

---

### 5. Update Profile

**PUT** `/api/auth/profile`

Update the current user's profile.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "John Smith",           // Optional
  "type": "CORPORATE",            // Optional
  "companyName": "New Corp",      // Optional (required if type is CORPORATE)
  "tin": "12345678901"            // Optional: Tax Identification Number
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Smith",
    "type": "CORPORATE",
    "companyName": "New Corp",
    "role": "USER",
    "kycStatus": "UNVERIFIED",
    "tier": "TIER_1",
    "tin": "12345678901"
  }
}
```

---

### 6. Refresh Token

**POST** `/api/auth/refresh`

Get a new access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

### 7. Forgot Password

**POST** `/api/auth/forgot-password`

Request a password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

---

### 8. Reset Password

**POST** `/api/auth/reset-password`

Reset password using token from email.

**Headers:**
```
Authorization: Bearer <resetToken>   // Token from reset email link
```

**Request Body:**
```json
{
  "password": "NewSecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### 9. Delete Account

**DELETE** `/api/auth/account`

Permanently delete user account and all associated data.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": [...]   // Validation errors (if applicable)
}
```

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation Error | Invalid input data |
| 401 | Authentication Error | Invalid or expired token |
| 403 | Authorization Error | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Server error |

---

## Authentication Flow

### For Frontend Integration:

1. **Signup/Login** → Store `accessToken` and `refreshToken`
2. **API Requests** → Include `Authorization: Bearer <accessToken>` header
3. **Token Expired** → Call `/api/auth/refresh` with `refreshToken`
4. **Logout** → Call `/api/auth/logout` and clear stored tokens

### Token Storage Recommendations:

- **accessToken**: Memory or sessionStorage (short-lived, ~1 hour)
- **refreshToken**: httpOnly cookie or secure storage (long-lived, ~7 days)

---

## User Roles

| Role | Description |
|------|-------------|
| USER | Standard user (default) |
| ADMIN | Full system access |

---

## User Types

| Type | Description |
|------|-------------|
| INDIVIDUAL | Personal account |
| CORPORATE | Business account (requires companyName) |

---

## KYC Status

| Status | Description |
|--------|-------------|
| UNVERIFIED | Default for new users |
| PENDING | KYC submitted, awaiting review |
| VERIFIED | KYC approved |
| REJECTED | KYC rejected |

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Scope**: All `/api/*` endpoints
- **Response**: 429 Too Many Requests
