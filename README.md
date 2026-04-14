# Planr — Your Personal School OS

A clean, Notion-inspired web app for managing your school life: lessons (from Zermelo iCal), notes, homework, tasks, tests, habits, and appointments — all in one place.

## Stack

- **React + Vite + TypeScript**
- **Convex** — real-time database + backend
- **Clerk** — OAuth authentication (Google, etc.)
- **TipTap** — rich text note editor
- **Tailwind CSS** — styling
- **Vercel** — frontend hosting

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Clerk

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com) and create a new app
2. Enable Google OAuth (or any provider you want)
3. Copy your **Publishable Key**

### 3. Set up Convex

```bash
npx convex dev
```

This will:
- Ask you to log in / create a Convex account
- Create a new project
- Generate `convex/_generated/` files
- Give you your `VITE_CONVEX_URL`

### 4. Connect Clerk → Convex

In your Convex dashboard:
1. Go to **Settings → Authentication**
2. Add Clerk as a provider
3. Copy your Clerk **JWT template** URL (from Clerk dashboard → JWT Templates → Convex)
4. Update `convex/auth.config.ts` with your Clerk domain

In your Clerk dashboard:
1. Go to **JWT Templates**
2. Create a new template named `convex`
3. Set the issuer to your Clerk domain

### 5. Create `.env` file

```bash
cp .env.example .env
```

Fill in:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CONVEX_URL=https://your-project.convex.cloud
```

### 6. Run

```bash
# Terminal 1 — Convex backend (keep running)
npx convex dev

# Terminal 2 — Vite frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deploy

### Frontend → Vercel

```bash
npm run build
# Deploy /dist to Vercel, or connect your GitHub repo
```

Set environment variables in Vercel dashboard:
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CONVEX_URL`

### Backend → Convex (auto)

Convex hosts itself — your backend is already live once you ran `npx convex dev`. For production, run:

```bash
npx convex deploy
```

---

## Syncing Zermelo

1. Go to **Settings** in the app
2. Paste your Zermelo iCal URL (find it in Zermelo: Settings → Calendar → iCal link)
3. Click **Sync now**

Lessons will appear immediately in your Calendar, Notebook, and Today views.

---

## Features

| Feature | Description |
|---|---|
| **Today** | Dashboard with today's lessons, homework due, tasks, habits, appointments |
| **Calendar** | Weekly view combining lessons, homework deadlines, tests, appointments |
| **Notebook** | Per-subject notes organised by chapter, one note per lesson |
| **Note editor** | Google Docs-style rich text with bold, italic, headings, tables, checklists, code blocks |
| **Homework** | Linked to lessons, with title + description (e.g. "Exercise 1, 2, 3") |
| **Tasks** | Personal to-dos with priority, due date, optional lesson link |
| **Tests** | Manual test entries with subject, topic, date |
| **Habits** | Daily habit tracking with emoji + completion streaks |
| **Appointments** | One-off and weekly recurring (e.g. Tennis every Monday 18:30) |
