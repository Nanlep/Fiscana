-- AlterTable
ALTER TABLE "User" ADD COLUMN     "baniCustomerRef" TEXT,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "subscriptionTier" TEXT NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletBalance" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "available" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "pending" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "companyName" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMEApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "rcNumber" TEXT,
    "registeredWithCAC" BOOLEAN NOT NULL DEFAULT false,
    "businessType" TEXT NOT NULL,
    "industrySector" TEXT,
    "businessAddress" TEXT NOT NULL,
    "state" TEXT,
    "yearEstablished" TEXT,
    "numberOfEmployees" TEXT,
    "contactPersonName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "ownerFullName" TEXT,
    "ownerDOB" TEXT,
    "ownerGender" TEXT,
    "ownerBVN" TEXT,
    "ownerNationalId" TEXT,
    "ownerResidentialAddress" TEXT,
    "ownerPercentageOwnership" TEXT,
    "ownerPhone" TEXT,
    "ownerEmail" TEXT,
    "businessActivities" TEXT,
    "productsServices" TEXT,
    "majorCustomers" TEXT,
    "hasExistingContracts" BOOLEAN NOT NULL DEFAULT false,
    "monthlySalesRevenue" DOUBLE PRECISION,
    "monthlyExpenses" DOUBLE PRECISION,
    "monthlyProfitEstimate" DOUBLE PRECISION,
    "loanAmount" DOUBLE PRECISION NOT NULL,
    "loanPurpose" TEXT NOT NULL,
    "loanTenorMonths" INTEGER,
    "expectedMonthlyRepayment" DOUBLE PRECISION,
    "hasPreviousLoan" BOOLEAN NOT NULL DEFAULT false,
    "previousLoanSource" TEXT,
    "previousLoanStatus" TEXT,
    "repaymentPeriod" INTEGER NOT NULL DEFAULT 12,
    "keepsFinancialRecords" BOOLEAN NOT NULL DEFAULT false,
    "hasBankStatements" BOOLEAN NOT NULL DEFAULT false,
    "hasFinancialStatements" BOOLEAN NOT NULL DEFAULT false,
    "hasTIN" BOOLEAN NOT NULL DEFAULT false,
    "primaryBankName" TEXT,
    "bankAccountNumber" TEXT,
    "hasCollateral" BOOLEAN NOT NULL DEFAULT false,
    "collateralType" TEXT,
    "collateralEstimatedValue" TEXT,
    "willingToProvideGuarantor" BOOLEAN NOT NULL DEFAULT false,
    "collateralDescription" TEXT,
    "guarantorName" TEXT NOT NULL DEFAULT '',
    "guarantorPhone" TEXT NOT NULL DEFAULT '',
    "guarantorEmail" TEXT NOT NULL DEFAULT '',
    "guarantorRelationship" TEXT NOT NULL DEFAULT '',
    "annualRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cacDocumentUrl" TEXT,
    "validIdUrl" TEXT,
    "bankStatementUrl" TEXT,
    "utilityBillUrl" TEXT,
    "passportPhotoUrl" TEXT,
    "tinDocumentUrl" TEXT,
    "collateralDocumentUrl" TEXT,
    "taxClearanceUrl" TEXT,
    "applicantDeclarationName" TEXT,
    "declarationDate" TEXT,
    "preQualScore" INTEGER,
    "revenueStrength" TEXT,
    "repaymentCapacity" TEXT,
    "creditHistory" TEXT,
    "documentationLevel" TEXT,
    "preQualOutcome" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMEApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "WalletBalance_walletId_idx" ON "WalletBalance"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletBalance_walletId_currency_key" ON "WalletBalance"("walletId", "currency");

-- CreateIndex
CREATE INDEX "EmailVerification_email_code_idx" ON "EmailVerification"("email", "code");

-- CreateIndex
CREATE INDEX "SMEApplication_userId_status_idx" ON "SMEApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "SMEApplication_status_idx" ON "SMEApplication"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_status_idx" ON "SupportTicket"("userId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "User_baniCustomerRef_idx" ON "User"("baniCustomerRef");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletBalance" ADD CONSTRAINT "WalletBalance_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMEApplication" ADD CONSTRAINT "SMEApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
