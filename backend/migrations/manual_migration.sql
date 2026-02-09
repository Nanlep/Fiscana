-- Fiscana Database Schema Migration
-- Run this SQL in Supabase SQL Editor to create all tables
-- Generated from prisma/schema.prisma

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "companyName" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "tier" TEXT NOT NULL DEFAULT 'TIER_1',
    "tin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create Transaction table
CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "payee" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "grossAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL,
    "exchangeRateSnapshot" DOUBLE PRECISION,
    "type" TEXT NOT NULL,
    "expenseCategory" TEXT,
    "category" TEXT NOT NULL,
    "taxTag" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "receiptUrl" TEXT,
    "taxDeductible" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'CLEARED',
    "vatAmount" DOUBLE PRECISION,
    "whtAmount" DOUBLE PRECISION,
    "isRemitted" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "modifiedAt" TIMESTAMP(3),
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Invoice table
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "subTotal" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "whtDeduction" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "paidDate" TIMESTAMP(3),
    "paymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "baniPaymentLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create InvoiceItem table
CREATE TABLE IF NOT EXISTS "InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create PaymentRecord table
CREATE TABLE IF NOT EXISTS "PaymentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Asset table
CREATE TABLE IF NOT EXISTS "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Liability table
CREATE TABLE IF NOT EXISTS "Liability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "type" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Liability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Budget table
CREATE TABLE IF NOT EXISTS "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "limit" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create KYCRequest table
CREATE TABLE IF NOT EXISTS "KYCRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "bvn" TEXT NOT NULL,
    "nin" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    CONSTRAINT "KYCRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Indexes for better query performance
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
CREATE INDEX IF NOT EXISTS "Transaction_userId_type_idx" ON "Transaction"("userId", "type");
CREATE INDEX IF NOT EXISTS "Invoice_userId_status_idx" ON "Invoice"("userId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_userId_dueDate_idx" ON "Invoice"("userId", "dueDate");
CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX IF NOT EXISTS "PaymentRecord_invoiceId_idx" ON "PaymentRecord"("invoiceId");
CREATE INDEX IF NOT EXISTS "Asset_userId_type_idx" ON "Asset"("userId", "type");
CREATE INDEX IF NOT EXISTS "Liability_userId_type_idx" ON "Liability"("userId", "type");
CREATE INDEX IF NOT EXISTS "Budget_userId_period_idx" ON "Budget"("userId", "period");
CREATE INDEX IF NOT EXISTS "KYCRequest_userId_status_idx" ON "KYCRequest"("userId", "status");

-- Create Unique Constraint for Budget
CREATE UNIQUE INDEX IF NOT EXISTS "Budget_userId_category_period_key" ON "Budget"("userId", "category", "period");

-- Success message
SELECT 'Database schema created successfully! You now have 8 tables and 12 indexes.' AS message;
