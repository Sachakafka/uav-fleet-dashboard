# DeltaQuad Fleet Manager — TODO List

> **Updated:** Feb 1, 2026  
> **Current Status:** OAuth deployment issues being resolved

---

## Completed

### Development
- All PRD features implemented
- Department-based RLS
- Soft Lock conflict warning
- Hardware Snapshot (JSONB)
- Full Booking Form
- Calendar Overview (ISO weeks)
- SSH key setup (GitHub push)
- Vercel auto-deploy
- GitHub Actions CI/CD (`.github/workflows/test.yml`)

### Deployment
- Vercel project connected
- Vercel env vars set
- GitHub Pages fallback deploy
- Dynamic base path (Vercel + GitHub Pages)

### Documentation
- `README.md` — project overview
- `PRD.md` — product requirements
- `TESTING.md` — testing and automation
- `docs/DEV_Database_Setup.md` — database migrations
- `.cursorrules` — AI/dev guidelines

---

## Urgent (today)

### 1. Fix OAuth redirect loop
**Status:** In progress  
**Priority:** P0 (Blocker)

- [x] Diagnose (401 error)
- [x] Improve AuthContext error handling
- [x] Add hash cleanup logic
- [x] Improve auth state listener
- [ ] **Test Vercel deploy** (waiting)
- [ ] Confirm sign-in flow works

**Test steps:**
```bash
# 1. Wait for Vercel deploy (1–2 min)
# 2. Clear browser cache
# 3. Open in private window: https://uav-fleet-dashboard.vercel.app/
# 4. Test Google OAuth sign-in
# 5. Check Console for errors
```

### 2. Run database migrations
**Status:** Pending  
**Priority:** P0 (Blocker)

- [ ] Get Supabase DB password
- [ ] Add `DATABASE_URL` to `.env`
- [ ] Run `npm run db:migrate:all`
- [ ] Verify migrations

```bash
# Or in Supabase SQL Editor:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'vehicles', 'bookings')
AND column_name IN ('department', 'hw_config', 'risk_level', 'location');
```

---

## This week

### 3. Local testing
**Status:** Pending  
**Priority:** P1  
**Estimate:** 30 min

- [ ] Sign-in (Google OAuth)
- [ ] Vehicle list (RLS filtering)
- [ ] Create booking (Risk Level, Location)
- [ ] Conflict warning (Soft Lock)
- [ ] Edit vehicle (JSONB hw_config)
- [ ] Calendar Overview (ISO weeks, stacking)

```bash
npm run dev
# Open: http://localhost:5173/
```

### 4. Automated tests
**Status:** Partial  
**Priority:** P1  
**Estimate:** 1–2 hours

#### Unit tests
- [x] Vitest setup
- [x] `src/lib/constants.test.js`
- [x] `src/lib/database.test.js`
- [ ] Increase coverage: AuthContext, BookingModal, VehicleCard, calendar utils

```bash
npm run test:run   # run unit tests
npm run test       # watch mode
```

#### E2E tests
- [x] Playwright setup
- [x] `e2e/app.spec.js`
- [x] `e2e/dashboard.spec.js`
- [ ] Add: OAuth flow, booking flow, calendar, department isolation

```bash
npx playwright install   # first time
npm run test:e2e         # run E2E
```

#### CI/CD
- [x] GitHub Actions (`.github/workflows/test.yml`)
- [ ] Set GitHub Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, verify CI

**Setup:**  
https://github.com/Sachakafka/uav-fleet-dashboard/settings/secrets/actions → New repository secret.

### 5. Documentation
**Status:** Pending  
**Priority:** P2  
**Estimate:** 30 min

- [ ] **Update README.md** — Vercel URL, test commands, OAuth steps, troubleshooting
- [ ] **Add CONTRIBUTING.md** — Git workflow, code style, testing, review
- [ ] **Add CHANGELOG.md** — v1.0.0, features, breaking changes, migration

---

## Next week

### 6. Staging deploy
**Status:** Pending  
**Priority:** P1

- [ ] Create Staging Supabase project (or use dev)
- [ ] Run migrations on Staging
- [ ] Configure Vercel Preview env
- [ ] Document Staging URL

### 7. UAT (User Acceptance Testing)
**Status:** Pending  
**Priority:** P0

Run PRD’s 4 acceptance tests:

- **Test 1: Department Isolation** — Marketing user sees only Marketing vehicles
- **Test 2: Shared Pool** — R&D user sees Training vehicles
- **Test 3: Hardware Snapshot** — Booking stores hw_config at create time
- **Test 4: Soft Lock** — Conflict warning shown but submit still allowed

### 8. Demo prep
**Status:** Pending  
**Priority:** P2

- [ ] Prepare 2–3 user flows
- [ ] Create demo accounts per department
- [ ] Prepare demo data (vehicles, bookings)
- [ ] Document known limits
- [ ] Tag: `v1.0.0-demo`

---

## Future

### Performance
- [ ] React Query (TanStack Query)
- [ ] Loading states and skeleton screens
- [ ] Image lazy loading
- [ ] Code splitting

### Features
- [ ] Notifications (booking reminders)
- [ ] Export (CSV, PDF)
- [ ] Search and filters
- [ ] Vehicle maintenance log
- [ ] Dashboard analytics

### DevOps
- [ ] Docker
- [ ] Monitoring (e.g. Sentry, LogRocket)
- [ ] Vercel Analytics
- [ ] Backup strategy

### Security
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] Input sanitization review
- [ ] Security audit

---

## Progress

| Area           | Done   | Status        |
|----------------|--------|---------------|
| Core features  | 100%   | Done          |
| DB migrations  | 0%     | Pending       |
| Local testing  | 0%     | Pending       |
| Automated tests| 40%    | In progress   |
| Deploy (Vercel)| 90%    | OAuth in progress |
| Docs           | 80%    | Needs updates |
| UAT            | 0%     | Pending       |

---

## Today’s goals

1. Fix OAuth redirect loop
2. Run database migrations
3. Complete local testing

---

## Help needed

1. **Supabase DB password** — to run migrations
2. **Test accounts** — R&D, Training, Marketing
3. **Demo data** — sample vehicles and bookings

---

**Last updated:** 2026-02-01
