# Ecommerce Admin Dashboard - Tech Stack

## Backend
- **Runtime**: Node.js v24.16.0
- **Framework**: NestJS 11
- **Language**: TypeScript 5.7
- **ORM**: Prisma 7.9
- **Database**: PostgreSQL (Supabase)
- **Validation**: Zod
- **Auth**: JWT (access + refresh tokens)
- **Password Hashing**: bcrypt/argon2 (TBD)

## Frontend
- **Framework**: Next.js 16
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **HTTP Client**: Axios
- **Auth**: Supabase SSR

## Infrastructure
- **Database Host**: Supabase (AWS ap-southeast-1)
- **Connection Pooler**: Supabase Pooler (port 6543 transaction, 5432 session)
