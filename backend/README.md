# OSGHUB VTU Backend

This is the backend for the OSGHUB VTU Platform, built with Node.js, Express, and Firebase.

## Architecture

The project follows a clean architecture pattern:
- **src/app.js**: App entry point and middleware configuration.
- **src/server.js**: Server startup.
- **src/config**: Configuration files (Firebase, etc.).
- **src/controllers**: Handles request/response logic.
- **src/routes**: API route definitions.
- **src/services**: Business logic and database interactions.
- **src/middleware**: Custom middleware (Auth, etc.).
- **src/utils**: Utility functions.

## Database Schema (Firestore)

### Collection: `users`
Managed by Frontend/Auth, but referenced here.
- `uid`: User ID
- `email`: User Email
- `referredBy`: UID of referrer (optional)
- `fcmToken`: Firebase Cloud Messaging token for notifications

### Collection: `wallets`
Stores user wallet balances.
- Document ID: `userId`
- `mainBalance`: Number (Main wallet balance)
- `cashbackBalance`: Number (Cashback wallet balance)
- `referralBalance`: Number (Referral wallet balance)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### Collection: `transactions`
Stores all VTU transactions (Airtime, Data, Bills).
- `id`: Transaction ID
- `userId`: User ID
- `type`: 'airtime' | 'data' | 'bill'
- `amount`: Number
- `status`: 'pending' | 'success' | 'failed'
- `providerReference`: String (from VTU provider)
- `details`: Map (phone, network, planId, etc.)
- `createdAt`: Timestamp

### Collection: `wallet_transactions`
Ledger for all wallet movements (Credit/Debit).
- `userId`: User ID
- `type`: 'credit' | 'debit'
- `walletType`: 'main' | 'cashback' | 'referral'
- `amount`: Number
- `description`: String
- `balanceBefore`: Number
- `balanceAfter`: Number
- `createdAt`: Timestamp

### Collection: `settings`
- Document: `global`
  - `dailyReferralBudget`: Number
  - `cashbackEnabled`: Boolean
  - `pricing`: Map (Centralized pricing logic)

## API Endpoints

### Authentication
All endpoints require `Authorization: Bearer <Firebase ID Token>` header.

### Wallet
- **GET /api/wallet/**
  - Returns current wallet balances.
- **POST /api/wallet/transfer**
  - Body: `{ "amount": 100, "fromWallet": "cashback" }` (or "referral")
  - Transfers funds from bonus wallets to main wallet.
- **GET /api/wallet/history**
  - Returns wallet transaction ledger.

### Transactions
- **POST /api/transactions/purchase**
  - Body: 
    ```json
    {
      "type": "airtime",
      "amount": 100,
      "details": { "phone": "08012345678", "network": "MTN" },
      "requestId": "unique-uuid" 
    }
    ```
  - Initiates a transaction. Handles idempotency if `requestId` is provided.
- **GET /api/transactions/**
  - Returns transaction history.

### Admin
Requires `admin` privileges (checked via token/claims).
- **POST /api/admin/settings**
  - Update global settings (pricing, budget, etc.).
- **GET /api/admin/settings**
  - View current settings.
- **GET /api/admin/transactions**
  - View all platform transactions.

## Environment Variables
Create a `.env` file with:
```
PORT=5000
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

## Setup & Run
1. `npm install`
2. Configure `.env`
3. `npm start`
