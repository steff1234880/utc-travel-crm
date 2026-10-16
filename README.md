# UTC Travel

A production-ready Travel Business Website + CRM system.

## Project Overview

UTC Travel is a scalable CRM/ERP-style application built to handle both a public-facing travel website and a robust administrative CRM backend. This project is separated into a frontend and backend directory.

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- TanStack Query

### Backend
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication

## Folder Structure

- `/frontend` - The React application
- `/backend` - The Node.js/Express API

## Local Development Setup

### Database Setup
1. Ensure PostgreSQL is installed and running.
2. Create a local database for the project (e.g., `utc_travel`).

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Copy the `.env.example` file to `.env` and fill in the database URL and JWT secrets.
3. Install dependencies: `npm install`
4. Run Prisma migrations: `npx prisma db push` (for initial dev)
5. Start the development server: `npm run dev`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Copy the `.env.example` file to `.env` and verify the API URL.
3. Install dependencies: `npm install`
4. Start the Vite development server: `npm run dev`
