# Release, Rollback & Daily Task Flow

No code here — only workflow and checklist.

---

## 1. Next step (what to do now)

**Order:** Deploy to Staging → Staging UAT sign-off → tag and deploy production from tag; Rollback = redeploy the previous tag.  
**Detailed steps:** See **`docs/DEPLOY_Staging_Steps.md`** (Vercel/Netlify setup, PRD §5 UAT, tagging, rollback).

1. **Deploy to Staging**  
   In Vercel or Netlify, connect this repo, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, deploy and get the Staging URL.

2. **Staging UAT (PRD §5)**  
   On the Staging URL run the four checks: Isolation, Shared Pool, Snapshot, Conflict. Proceed only when all four pass. Sign-off checklist: `docs/UAT_SIGN_OFF_SUNDAY.md` (if present).

3. **Production release**  
   After UAT passes: create tag (e.g. `v1.0.0`), push tag, deploy production from that tag (do not deploy production directly from a branch).

4. **Rollback**  
   Redeploy the previous tag (e.g. v0.9.0). See `docs/DEPLOY_Staging_Steps.md` §3.3.

---

## 2. Development workflow (day-to-day)

All git commits and code are in English.

### Migrations (if not done yet)

1. Add `DATABASE_URL` to `.env` (from Supabase Dashboard > Project Settings > Database > Connection string URI).
2. Run: `npm run db:migrate:all`.

### Local test

1. Run: `npm run dev`.
2. Open: `http://localhost:5173/uav-fleet-dashboard/`.
3. Manually verify: login, vehicle list, booking (Risk/Location), overlap warning, edit vehicle JSON, calendar.

### Before release / after each change (e.g. Saturday)

1. Run: `npm run test:run` (unit tests).
2. Run: `npm run test:e2e` (E2E).
3. Deploy to staging; fix any bugs; re-run tests as needed.

---

## 3. Versioning & rollback (clean releases)

- **Tag every release**  
  e.g. `git tag v1.0.0` and push tags. One tag = one known good state.

- **Deploy from tags**  
  CI/CD should build and deploy from the tag (or the commit the tag points to), not from a moving branch. That way “what’s in prod” is always a specific version.

- **Rollback = redeploy previous tag.**  
  To roll back: redeploy the previous tag (e.g. after `v1.0.0`, rollback = redeploy `v0.9.0`). No ad‑hoc code changes for rollback; same pipeline, older version. *(See README for one-line summary.)*

- **DB migrations**  
  Prefer backward‑compatible migrations (add columns, avoid dropping until old code is gone). If you must run a breaking migration, do it in a coordinated window and have a rollback script (e.g. a down migration) documented and tested on staging first.

---

## 4. Staging deploy (Vercel / Netlify)

Deploy the app to a staging URL and point it at your Supabase project (or a separate staging Supabase project).

### Env vars (required)

Set these in your hosting dashboard (Vercel: Project Settings → Environment Variables; Netlify: Site settings → Build & deploy → Environment):

| Variable | Where to get it |
|----------|-----------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → **API Settings** → Project URL (e.g. `https://YOUR_REF.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → **API Settings** → Publishable key (anon) — safe for browser; never use the secret key on the client. |

Build command: `npm run build`. Publish directory: `dist`.  
For client-side routing, use the included `vercel.json` or `netlify.toml` (SPA redirect to `index.html`).

### Staging before production

- **Always deploy to staging first**  
  Staging URL + staging DB (or separate Supabase project). No direct “dev → production”.

- **Staging = UAT**  
  Run PRD §5 acceptance (Isolation, Shared Pool, Snapshot, Conflict). Only then approve production release.

- **Production**  
  Deploy the same artifact/tag that passed staging. Same code, different env (prod URL + prod DB).

---

## 5. Tests before release (unit + automation)


- **Before merge / before release**  
  - Unit: `npm run test:run` — must pass.  
  - E2E: `npm run test:e2e` (against staging or local) — must pass.

- **Rule of thumb**  
  New feature or fix → add or adjust unit/E2E as needed → tests green → then merge/release. No “we’ll add tests later” for release path.

- **Result**  
  Only tested, versioned builds go to staging, then to production. Rollback = redeploy previous tag.

---

## 6. Today’s task flow (simple)

| Order | Task | Done |
|-------|------|------|
| 1 | Add `DATABASE_URL` to `.env`; run `npm run db:migrate:all`. Confirm booking works locally. | ☐ |
| 2 | Set up staging (deploy app + point to staging Supabase). | ☐ |
| 3 | Run unit tests (`npm run test:run`). Fix if red. | ☐ |
| 4 | Run E2E (`npm run test:e2e`). Fix if red. | ☐ |
| 5 | Staging UAT (PRD §5: Isolation, Shared Pool, Snapshot, Conflict). | ☐ |
| 6 | Tag version (e.g. `v1.0.0`), deploy to production from tag. | ☐ |
| 7 | Document rollback: “Revert = redeploy tag X.” | ☐ |

Keep: **DB done → staging → tests green → UAT on staging → tag → prod → rollback = previous tag.** No coding in this doc; follow the checklist and your repo stays clean and reversible.

---

## 7. Supabase & UI/Flow review (before / after migrations)

### In Supabase (things you do in the Dashboard)

| Action | Where | Why |
|--------|--------|-----|
| **Get connection string** | Project Settings → Database → Connection string (URI) | Required for `DATABASE_URL` in `.env` so `npm run db:migrate:all` works. |
| **Run migrations** | Either: (1) set `DATABASE_URL` and run `npm run db:migrate:all`, or (2) SQL Editor — paste and run `db/01_schema_fixes.sql`, then `03`, `04`, `05`, `06` in order | Schema + RLS + snapshot trigger must be applied once per project. See `docs/DEV_Database_Setup.md`. |
| **Confirm RLS** | Table Editor or SQL: `vehicles`, `bookings`, `profiles` have RLS enabled; policies in `06_department_rls.sql` | Ensures department-based visibility (Marketing vs R&D/Training). |
| **Test users (UAT)** | Authentication → Users, or create via app sign-in | You need at least: one user with department **Marketing**, one with **R&D** (or **Training**) to run PRD §5: Isolation + Shared Pool. |
| **Optional: reset DB password** | Project Settings → Database → Reset database password | Only if you don’t have the password for the connection string. |

No other Supabase config is required for the current flow; Auth is already used for login.

### UI/Flow review (manual checklist — §2 local test, then staging)

Run `npm run dev`, open `http://localhost:5173/uav-fleet-dashboard/`, then:

| Flow | What to check |
|------|----------------|
| **Login** | Google sign-in works; after login you land on dashboard (or vehicle list). |
| **Vehicle list** | List loads; department filter applies (Marketing sees only Marketing vehicles; R&D sees R&D + Training). |
| **Booking** | Create booking: **Project Name**, **Risk Level** (Low/Medium/High), **Location** required; date/time and vehicle selected; submit succeeds. |
| **Overlap warning** | Book same vehicle + overlapping time → warning toast appears (“already booked by [Project Name]…”); you can still confirm. |
| **Edit vehicle JSON** | Open a vehicle → edit `hw_config` (JSON/Key-Value); save; data persists. |
| **Calendar** | Calendar view shows bookings; overlapping slots visible (e.g. stacked); week numbers (ISO) if implemented. |

After staging is up, run **PRD §5 UAT** on staging: Isolation, Shared Pool, Snapshot, Conflict (see PRD.md). That is the sign-off before tagging and production.
