# Demo Quickstart

## 1) Backend env
- Copy backend/.env.example to backend/.env
- Check these values:
  - MONGODB_URI
  - JWT_ACCESS_SECRET
  - JWT_REFRESH_SECRET

## 2) Seed data
Run inside backend folder:
- npm run seed:reset

This creates:
- 1 admin user
- sample songs
- Demo Favorites playlist

Default admin credentials:
- email: admin@music.local
- password: admin123

## 3) Start backend
Run inside backend folder:
- npm run dev

If startup fails, check backend/.env first.

## 4) Frontend env
- Copy frontend/.env.example to frontend/.env
- Ensure VITE_API_BASE_URL points to backend

## 5) Start frontend
Run inside frontend folder:
- npm run dev

## 6) Demo flow
- Open frontend app in browser
- Login with admin account
- Confirm Song list loads from API
- Create, edit, delete songs in Admin Songs panel
- Create playlists and add/remove songs

## 7) Common issue
- Wrong command: use npm run dev, not nom run dev
