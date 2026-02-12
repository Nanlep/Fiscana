/*
  Warnings:

  - You are about to drop the column `baniAccountNumber` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `baniBankName` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `baniPaymentRef` on the `Invoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "baniAccountNumber",
DROP COLUMN "baniBankName",
DROP COLUMN "baniPaymentRef",
ADD COLUMN     "paymentAccountName" TEXT,
ADD COLUMN     "paymentAccountNumber" TEXT,
ADD COLUMN     "paymentBankName" TEXT,
ADD COLUMN     "paymentWalletAddress" TEXT,
ADD COLUMN     "paymentWalletNetwork" TEXT;
