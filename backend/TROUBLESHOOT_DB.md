# Supabase Connection Troubleshooting

## Current Issue

Unable to connect to Supabase database on both ports 5432 and 6543.

**Error**: `Can't reach database server at db.reujfhsaryenngazhyui.supabase.co:5432`

## Possible Causes

### 1. **Database Not Fully Provisioned**
Supabase projects can take 2-5 minutes to fully provision. Even though the dashboard shows "active", the database might still be starting up.

**Solution**: Wait 5 more minutes and try again.

### 2. **IPv6 vs IPv4 Connectivity**
Supabase sometimes uses IPv6, and your network might only support IPv4.

**Solution**: Try using IPv4 pooler instead:
```env
DATABASE_URL="postgresql://postgres.reujfhsaryenngazhyui:Fiscana!123@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### 3. **Connection Pooling Mode**
Supabase has different pooling modes that might not be compatible with Prisma migrations.

**Current setup**: Using session mode on port 5432

**Alternative**: Try using the "Direct Connection" string from Supabase

### 4. **Password Special Characters**
Your password `Fiscana!123` contains `!` which might need URL encoding.

**Solution**: Try URL-encoding the password:
```env
DATABASE_URL="postgresql://postgres:Fiscana%21123@db.reujfhsaryenngazhyui.supabase.co:5432/postgres"
```

### 5. **Firewall/Network Issue**
Your network might be blocking PostgreSQL port 5432.

**Solution**: Check if port is reachable:
```bash
curl -v telnet://db.reujfhsaryenngazhyui.supabase.co:5432
```

## Recommended Steps

### Step 1: Get the Connection Pooler URL

In your Supabase dashboard:

1. Go to **Project Settings** → **Database**
2. Scroll to **Connection string**
3. Select **URI** tab (NOT "Transaction" mode for Prisma)
4. Look for the **Connection pooling** section
5. Copy the connection string that looks like:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```

This is different from the direct database URL and uses Supabase's connection pooler infrastructure.

### Step 2: Update Your .env

Replace both URLs with the pooler format:

```env
# Use the pooler URL (IPv4)
DATABASE_URL="postgresql://postgres.reujfhsaryenngazhyui:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# For migrations, use the same URL with pgbouncer flag
DIRECT_URL="postgresql://postgres.reujfhsaryenngazhyui:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"
```

**Note**: Replace `[PASSWORD]` with `Fiscana!123` (or URL-encoded: `Fiscana%21123`)

### Step 3: Alternative - Use Direct Connection (Not Recommended for Production)

If pooler doesn't work, try the direct connection (bypasses pooling):

1. In Supabase dashboard → **Project Settings** → **Database**
2. Look for **Direct connection** section
3. Copy the connection string
4. Update `.env`:

```env
DATABASE_URL="<direct-connection-string>"
DIRECT_URL="<direct-connection-string>"
```

**Warning**: Direct connections don't scale well and might hit connection limits.

### Step 4: Verify Supabase Project Status

1. Open your Supabase dashboard
2. Check if the project status shows "ACTIVE_HEALTHY"
3. Look for any warnings or issues in the dashboard
4. Try accessing the SQL Editor:
   - Go to **SQL Editor** in sidebar
   - Run: `SELECT version();`
   - If this works, database is up

### Step 5: URL Encode Special Characters

If your password has special characters (`!`, `@`, `#`, etc.), URL-encode them:

| Character | URL Encoded |
|-----------|-------------|
| `!`       | `%21`       |
| `@`       | `%40`       |
| `#`       | `%23`       |
| `$`       | `%24`       |
| `&`       | `%26`       |

Your password `Fiscana!123` becomes `Fiscana%21123`

## What to Try Next

1. **Wait 5 minutes** - Database might still be starting
2. **Check Supabase dashboard** - Ensure project is fully active
3. **Try connection pooler URL** - Use the pooler.supabase.com URL
4. **URL-encode password** - Change `!` to `%21`
5. **Test with SQL Editor** - Verify database works in dashboard first

## Quick Test Commands

```bash
# Test if Supabase API is reachable
curl https://reujfhsaryenngazhyui.supabase.co

# Test if database port is open (requires netcat)
nc -zv db.reujfhsaryenngazhyui.supabase.co 5432

# Try with psql directly (if installed)
psql "postgresql://postgres:Fiscana!123@db.reujfhsaryenngazhyui.supabase.co:5432/postgres"
```

## Need Help?

If none of these work, please provide:
1. Screenshot of Supabase **Project Settings → Database** page
2. Project status from dashboard (ACTIVE/PROVISIONING/etc.)
3. Any error messages from Supabase dashboard
4. Region where your project is hosted

Let me know which solution worked, or if you need further assistance!
