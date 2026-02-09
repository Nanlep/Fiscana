# Fiscana Backend API

Backend API server for the Fiscana Financial OS platform.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: JWT + Supabase Auth
- **AI**: Google Gemini 3.0

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string from Supabase
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `JWT_SECRET`: Secret key for signing JWT tokens
- `GEMINI_API_KEY`: Google Gemini API key

### 3. Database Setup

Run Prisma migrations to set up the database schema:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:4000`

## API Endpoints

### Health Check
- `GET /health` - API health status

### Authentication (Coming Soon)
- `POST /api/auth/signup` -Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Transactions (Coming Soon)
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `POST /api/transactions/bulk` - Bulk import

### Invoices (Coming Soon)
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/:id/payments` - Record payment

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/                # Configuration files
│   │   ├── index.ts           # Environment config
│   │   ├── database.ts        # Prisma client
│   │   ├── supabase.ts        # Supabase client
│   │   └── gemini.ts          # Gemini AI client
│   ├── middleware/            # Express middleware
│   │   ├── auth.ts            # JWT authentication
│   │   ├── errorHandler.ts   # Error handling
│   │   └── validate.ts        # Request validation
│   ├── routes/                # API routes (coming soon)
│   ├── services/              # Business logic (coming soon)
│   ├── utils/                 # Utilities
│   │   ├── errors.ts          # Custom error classes
│   │   └── logger.ts          # Logging utility
│   ├── types/                 # TypeScript types
│   └── index.ts               # Main application
├── package.json
└── tsconfig.json
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Deployment (Render)

This backend is configured for deployment to Render:

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install && npm run build && npm run prisma:generate`
4. Set start command: `npm start`
5. Add environment variables from `.env.example`
6. Deploy!

## Next Steps

- [ ] Implement authentication routes
- [ ] Add transaction management endpoints
- [ ] Add invoice management endpoints
- [ ] Migrate AI services to backend
- [ ] Add banking integration endpoints
- [ ] Add payment integration endpoints
- [ ] Write tests
- [ ] Add API documentation (Swagger/OpenAPI)
