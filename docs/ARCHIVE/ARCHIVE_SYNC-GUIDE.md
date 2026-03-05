# Sync guide — continue working from another machine

**Note:** This archived document was translated from Chinese. For current English docs see **HANDOVER.md** and **docs/00_README_DOCS_INDEX.md**.

---

## What’s already done

**Date:** 2026-02-02

### 1. Code is synced
- Local changes committed to Git
- Original changes backed up on branch `backup-local-changes`
- Repo is in sync with `origin/main`
- Working tree is clean

### 2. Current state
```
Branch: main
Latest commit: (see git log)
Sync with remote: up to date
```

---

## Steps on the other machine

### Step 1: Clone or pull

**First time on this machine:**
```bash
git clone https://github.com/Sachakafka/uav-fleet-dashboard.git
cd uav-fleet-dashboard
npm install
```

**Already have the repo:**
```bash
cd uav-fleet-dashboard
git pull origin main
npm install   # if package.json changed
```

### Step 2: Environment variables

Ensure `.env` exists with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Start dev server

```bash
npm run dev
```

App runs at `http://localhost:5173`.

---

## Important

### Remote already has
- Supabase OAuth config
- Vercel deploy config
- Debug logging
- Test and deploy checklists
- Playwright E2E setup
- DB migration scripts
- Documentation

### Backup branch
Original local changes are on `backup-local-changes` (e.g. booking modal, calendar overview, profile nickname). To use them:

```bash
git checkout backup-local-changes
# or cherry-pick specific commits onto main
```

---

## Troubleshooting

**Dependency issues:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Git conflicts:**
```bash
git status
git reset --hard origin/main   # discard local if not needed
# or: git stash && git pull origin main && git stash pop
```

---

## Related docs

- `README.md` — overview
- `PRD.md` — requirements
- `TODO.md` — tasks
- `TESTING.md` — testing
- `docs/` — full documentation

---

## Cursor AI

Cursor AI chat history does **not** sync across machines. Only settings, extensions, and keybindings sync. Keep important decisions in docs or commit messages.

---

**Next time:** `git pull origin main` → `npm install` → `npm run dev`; check `TODO.md` and `TESTING.md`.
