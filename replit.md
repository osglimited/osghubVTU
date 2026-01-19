# OSGHUB VTU Platform

## Overview
OSGHUB is a VTU (Virtual Top-Up) platform with a Next.js frontend, Express.js backend, and a separate admin panel.

## Project Structure
- `web/frontend/` - Next.js user-facing frontend (port 5000)
- `web/admin/` - Vite + Express admin panel
- `backend/` - Express.js API backend
- `mobile/webview_app/` - Flutter mobile app

## Tech Stack
- **Frontend**: Next.js 16 with TypeScript, Tailwind CSS
- **Backend**: Express.js with Firebase Admin SDK
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication

## Running the Project
The main frontend runs via the "Frontend" workflow on port 5000.

## Required Environment Variables
The app requires Firebase credentials. Add these to Secrets:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Recent Changes
- 2026-01-19: Initial import and Replit environment setup
  - Configured Next.js for Replit (port 5000, allowed all dev origins)
  - Added turbopack config for Next.js 16 compatibility
