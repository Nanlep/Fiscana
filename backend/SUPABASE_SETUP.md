# Supabase Setup Guide for Fiscana

This guide will walk you through setting up Supabase as the database and authentication provider for Fiscana.

## Overview

Supabase provides:
- **PostgreSQL Database** - Production-ready Postgres with connection pooling
- **Authentication** - Built-in auth with JWT tokens
- **Storage** - File storage for receipts and documents
- **Real-time subscriptions** - Optional for future features

---

## Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"**
3. Sign up using:
   - GitHub (recommended for developers)
   - Email & Password
   - Google
   - Or other OAuth providers

---

## Step 2: Create a New Project

1. After signing in, click **"New Project"**
2. Select your organization (or create a new one)
3. Fill in project details:

   ```
   Name: Fiscana Production
   Database Password: <generate a strong password>
   Region: Choose closest to your users (e.g., "West EU" for Europe)
   Pricing Plan: Free (for development) or Pro (for production)
   ```

4. Click **"Create new project"**
5. Wait 2-3 minutes for project provisioning

> ⚠️ **Important**: Save your database password! You'll need it later.

---

## Step 3: Get Your Credentials

Once your project is ready, you'll need to collect the following credentials:

### 3.1 Database Connection String

1. In your Supabase dashboard, go to **"Project Settings"** (gear icon in bottom left)
2. Click **"Database"** in the left sidebar
3. Scroll down to **"Connection string"**
4. Select **"URI"** tab
5. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the database password you set earlier

### 3.2 Supabase API Credentials

1. Still in **"Project Settings"**, click **"API"** in the left sidebar
2. You'll see several keys:

   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public** (API Key): `eyJhbG...` (long JWT token)
   - **service_role secret** (API Key): `eyJhbG...` (longer JWT token)

3. Copy all three values

> ⚠️ **Security Note**: 
> - The `anon` key can be used in your frontend
> - The `service_role` key should **ONLY** be used in backend (it bypasses Row Level Security)

---

## Step 4: Configure Backend Environment

1. Open your backend `.env` file:
   ```bash
   cd /Users/softtouchcomputers/Downloads/fiscana/backend
   code .env  # or use your preferred editor
   ```

2. Update the following variables:

   ```env
   # Database - Use Session Mode (Port 5432)
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"
   
   # Database - Use Transaction Mode (Port 6543) for Prisma migrations
   DIRECT_URL="postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:6543/postgres"
   
   # Supabase
   SUPABASE_URL="https://xxxxxxxxxxxxx.supabase.co"
   SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3..."
   SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3..."
   ```

3. Replace:
   - `[PASSWORD]` with your database password
   - `xxxxxxxxxxxxx` with your actual project reference
   - The JWT tokens with your actual keys

### Why Two Database URLs?

- **DATABASE_URL**: Used for Prisma Client queries (Session mode, Port 5432)
- **DIRECT_URL**: Used for Prisma migrations (Transaction mode, Port 6543)

This is a Supabase-specific requirement for connection pooling.

---

## Step 5: Run Database Migrations

Now that your environment is configured, create the database tables:

```bash
cd /Users/softtouchcomputers/Downloads/fiscana/backend

# Generate Prisma Client
npm run prisma:generate

# Create migration and apply to database
npm run prisma:migrate
```

You'll be prompted to name your migration:
```
Enter a name for the new migration: › initial_schema
```

Type `initial_schema` and press Enter.

Expected output:
```
✔ Generated Prisma Client
✔ Migration applied successfully

The following migrations were applied:
  └─ 20260205_initial_schema/
    └─ migration.sql
```

---

## Step 6: Verify Database Setup

### 6.1 Check Tables in Supabase Dashboard

1. Go to your Supabase dashboard
2. Click **"Table Editor"** in the left sidebar
3. You should see all tables:
   - User
   - Transaction
   - Invoice
   - InvoiceItem
   - PaymentRecord
   - Asset
   - Liability
   - Budget
   - KYCRequest

### 6.2 Open Prisma Studio

Prisma Studio is a visual database browser:

```bash
npm run prisma:studio
```

This will open `http://localhost:5555` in your browser where you can:
- View all tables
- Browse data
- Add/edit/delete records manually

### 6.3 Test Backend Connection

Restart your backend server if it's running:

```bash
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

Check the logs for:
```
✓ Configuration validated successfully
✓ Database connected successfully
🚀 Fiscana Backend API running on port 4000
```

---

## Step 7: Enable Authentication (Optional but Recommended)

Supabase Auth is pre-configured, but you may want to customize it:

1. In Supabase dashboard, go to **"Authentication"** → **"Providers"**
2. Enable providers you want to support:
   - **Email** (enabled by default)
   - **Google** (OAuth)
   - **GitHub** (OAuth)
   - **Phone** (SMS)

3. For email auth, configure email templates:
   - Go to **"Authentication"** → **"Email Templates"**
   - Customize signup confirmation, password reset emails

---

## Step 8: (Optional) Enable Storage for Receipts

If you want to store receipt images/PDFs:

1. Go to **"Storage"** in Supabase dashboard
2. Click **"Create a new bucket"**
3. Configure:
   ```
   Name: receipts
   Public bucket: No (receipts are private)
   Allowed MIME types: image/*, application/pdf
   File size limit: 5MB
   ```
4. Click **"Create bucket"**

5. Set up Row Level Security (RLS) policies:
   - Users can only upload their own receipts
   - Users can only view their own receipts

---

## Troubleshooting

### Error: "Can't reach database server"

**Solution**: Double-check your connection strings
- Ensure you replaced `[YOUR-PASSWORD]` with actual password
- Verify the project reference ID is correct
- Check if your IP is allowed (Supabase free tier allows all IPs by default)

### Error: "Migration failed"

**Solution**: 
1. Check if you have the correct `DIRECT_URL` (port 6543)
2. Ensure database password is correct
3. Try running migrations with verbose logging:
   ```bash
   npx prisma migrate dev --name init --schema prisma/schema.prisma
   ```

### Error: "Prisma Client not generated"

**Solution**:
```bash
npm run prisma:generate
```

### Connection Pooling Issues

If you see connection pool errors:
1. Use `DATABASE_URL` with port **5432** for queries
2. Use `DIRECT_URL` with port **6543** for migrations
3. Restart your backend server after changing URLs

---

## Production Deployment Checklist

When deploying to production (Render):

- [ ] Create a separate Supabase project for production
- [ ] Use a stronger database password (20+ characters)
- [ ] Enable database backups (automatic in Pro plan)
- [ ] Set up monitoring and alerts
- [ ] Configure RLS (Row Level Security) policies
- [ ] Restrict API access to your backend domain
- [ ] Use environment-specific credentials
- [ ] Enable database SSL (enabled by default)

---

## Supabase Dashboard Quick Links

After setup, bookmark these:

- **Project Dashboard**: `https://app.supabase.com/project/xxxxxxxxxxxxx`
- **Table Editor**: `https://app.supabase.com/project/xxxxxxxxxxxxx/editor`
- **SQL Editor**: `https://app.supabase.com/project/xxxxxxxxxxxxx/sql`
- **Database**: `https://app.supabase.com/project/xxxxxxxxxxxxx/database/tables`
- **Auth**: `https://app.supabase.com/project/xxxxxxxxxxxxx/auth/users`
- **Storage**: `https://app.supabase.com/project/xxxxxxxxxxxxx/storage/buckets`

---

## Next Steps

After Supabase is set up:

1. ✅ Database is running with all tables
2. ✅ Authentication is configured
3. 🔜 Build authentication API routes (Phase 3)
4. 🔜 Build transaction API routes (Phase 4)
5. 🔜 Migrate AI services to backend (Phase 5)

---

## Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Supabase Discord**: https://discord.supabase.com

---

## Summary

You now have:
- ✅ Supabase account
- ✅ PostgreSQL database
- ✅ Connection configured
- ✅ 8 tables created via Prisma migrations
- ✅ Authentication ready
- ✅ Backend connected

**Your `.env` file should look like**:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:6543/postgres"
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUz..."
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUz..."
```

🎉 **You're ready to proceed with Phase 3: Authentication!**
