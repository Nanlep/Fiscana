# Manual Database Migration Guide

Since we're experiencing network connectivity issues with Prisma, we'll create the database tables manually through the Supabase SQL Editor.

## Step-by-Step Instructions

### 1. Open Supabase SQL Editor

1. Go to your Supabase dashboard: https://app.supabase.com/project/reujfhsaryenngazhyui
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"** button

### 2. Copy and Run the SQL Script

1. Open the file: `backend/migrations/manual_migration.sql`
2. Copy **ALL** the SQL content (Cmd+A, Cmd+C)
3. Paste it into the Supabase SQL Editor
4. Click **"Run"** button (or press Cmd+Enter)

### 3. Verify Tables Were Created

After running the script, you should see a success message:
```
Database schema created successfully! You now have 8 tables and 12 indexes.
```

Then verify by:
1. Click **"Table Editor"** in the left sidebar
2. You should see 8 tables:
   - User
   - Transaction
   - Invoice
   - InvoiceItem
   - PaymentRecord
   - Asset
   - Liability
   - Budget
   - KYCRequest

### 4. Generate Prisma Client

Back in your terminal, run:

```bash
cd /Users/softtouchcomputers/Downloads/fiscana/backend
npm run prisma:generate
```

This generates the Prisma client code that matches your database schema (even though we created it manually).

### 5. Test the Backend Connection

Restart your backend server to test the connection:

```bash
# Stop the current dev server (Ctrl+C if running)
npm run dev
```

Check the logs for:
```
✓ Database connected successfully
```

### 6. Optional: Verify with Prisma Studio

You can open Prisma Studio to browse your database:

```bash
npm run prisma:studio
```

This will open http://localhost:5555 where you can see all tables and data.

---

## What This Creates

### 8 Database Tables:

1. **User** - User profiles and authentication
2. **Transaction** - Financial transactions with tax tracking
3. **Invoice** - Invoices with multi-currency support
4. **InvoiceItem** - Line items for invoices
5. **PaymentRecord** - Payment history for invoices
6. **Asset** - User assets (cash, crypto, stocks, etc.)
7. **Liability** - User liabilities (loans, debts, etc.)
8. **Budget** - Monthly budget tracking
9. **KYCRequest** - KYC verification requests

### 12 Performance Indexes:

- User email lookup
- Transaction queries by user, date, and type
- Invoice queries by status and due date
- Foreign key relationships
- Unique constraints for data integrity

---

## Troubleshooting

### Error: "relation already exists"
This means tables were already created. You can either:
- Skip this error (tables already exist)
- Drop all tables first (DANGEROUS - deletes all data):
  ```sql
  DROP TABLE IF EXISTS "KYCRequest" CASCADE;
  DROP TABLE IF EXISTS "Budget" CASCADE;
  DROP TABLE IF EXISTS "Liability" CASCADE;
  DROP TABLE IF EXISTS "Asset" CASCADE;
  DROP TABLE IF EXISTS "PaymentRecord" CASCADE;
  DROP TABLE IF EXISTS "InvoiceItem" CASCADE;
  DROP TABLE IF EXISTS "Invoice" CASCADE;
  DROP TABLE IF EXISTS "Transaction" CASCADE;
  DROP TABLE IF EXISTS "User" CASCADE;
  ```
  Then run the migration script again.

### Error: "permission denied"
Make sure you're logged into Supabase and have owner/admin access to the project.

### Prisma Generate Fails
If `npm run prisma:generate` fails:
1. Make sure the SQL script ran successfully
2. Check that tables exist in Table Editor
3. Try: `npx prisma generate --schema=prisma/schema.prisma`

---

## Next Steps

Once the database is set up:

1. ✅ Tables created manually in Supabase
2. ✅ Prisma Client generated locally
3. 🔜 Build authentication API routes (Phase 3)
4. 🔜 Build transaction management endpoints (Phase 4)
5. 🔜 Migrate AI services to backend (Phase 5)

---

**Note**: In production deployment on Render, Prisma migrations will work fine because Render's servers don't have the same network restrictions. This manual approach is just a workaround for your local development environment.
