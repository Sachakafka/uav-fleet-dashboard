# Testing — DeltaQuad Fleet Manager

All content in this repo is in English.

---

## 0. Test after develop (workflow)

**Before pushing or opening a PR**, run:

1. **Unit tests:** `npm run test:run`
2. **E2E tests:** `npm run test:e2e` (starts app on port 5175)

Fix any failures before pushing. CI runs the same tests on push/PR to `main` (see **CI** below).

---

## 1. Manual verification: bug fixes (test URL)

**If you see "Could not find the 'duration' column of 'bookings'"** — the DB is missing columns the booking form uses. Run the migrations in `db/` in order (in Supabase SQL Editor or your migration runner): `01_schema_fixes.sql`, then `03_bookings_columns.sql`. See **Database migrations** in README.

To verify the two recent bug fixes locally:

1. **Start the app**
   ```bash
   npm run dev
   ```
2. **Open in browser**
   - **Local:** [http://localhost:5173/uav-fleet-dashboard/](http://localhost:5173/uav-fleet-dashboard/)
   - If you use a different port, check the terminal output (e.g. `http://localhost:5175/uav-fleet-dashboard/`).
3. **Log in** with a valid account (e.g. @deltaquad.com).
4. **Open Book Vehicle**
   - From the dashboard, click **Book** on any vehicle.
5. **Check**
   - **Pilot dropdown:** Options are exactly (in order): Devon, Edine, Ezgi, Jaco, Michael, Renzo, Thijm, Tjeerd, Yamac.
   - **Date field label:** Shows **Dates (Including Vehicle Transportation)** (not just "Dates").

If both are correct, the bug fixes are verified.

---

## 2. Unit tests (Vitest)

- **Run (watch):** `npm run test`
- **Run once (CI):** `npm run test:run` or `npm run test:unit`
- **Scope:** `src/lib` — constants, database layer (mocked Supabase), pure helpers. No real DB in unit tests.
- **Files:** `src/lib/constants.test.js`, `src/lib/database.test.js`
- **Config:** `vite.config.js` → `test` block; setup in `src/test/setup.js`.

---

## 3. E2E tests (Playwright)

- **First-time setup:** Install browsers: `npx playwright install`
- **Run:** `npm run test:e2e`
- **Prerequisite:** Playwright starts the app on **port 5175** (so it doesn't conflict with `npm run dev` on 5173).
- **Scope:**
  - **Unauthenticated:** `e2e/app.spec.js` — redirect to login, Sign In page, Google sign-in button, no dashboard content.
  - **Authenticated:** `e2e/dashboard.spec.js` — dashboard, Book modal, Calendar (skipped unless `E2E_AUTH_EMAIL` and `E2E_AUTH_PASSWORD` are set; see `.env.example`). When set, the app shows the email login form so tests can sign in and reach the dashboard; the calendar trigger is a button with accessible name "Calendar Overview".
- **Config:** `playwright.config.js`; base URL `http://localhost:5175/uav-fleet-dashboard/`.
- **E2E all green:** Set `E2E_AUTH_EMAIL` and `E2E_AUTH_PASSWORD` in `.env` (a valid test account), then run `npm run test:e2e`; the 4 authenticated tests will run; otherwise they are skipped.

---

## 4. UAT (per PRD §5)

Manual acceptance on **Staging** before release. Use **`docs/UAT_SIGN_OFF_SUNDAY.md`** as the checklist.

- **Isolation Test:** Marketing user sees only Marketing vehicles.
- **Shared Pool Test:** R&D user sees R&D + Training vehicles and can book.
- **Snapshot Test:** Booking stores vehicle `hw_config` at booking time.
- **Conflict Test:** Overlapping booking shows warning but submit still succeeds.

---

## 5. CI

- **Workflow:** `.github/workflows/test.yml` runs on **push** and **pull_request** to `main`.
- **Jobs:**
  - **unit:** `npm ci` → `npm run test:run` (Vitest).
  - **e2e:** `npm ci` → `npx playwright install --with-deps chromium` → `npm run test:e2e` (Playwright; app started on 5175 by config).
- **Secrets:** E2E job uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the running app (optional for unauthenticated specs).
