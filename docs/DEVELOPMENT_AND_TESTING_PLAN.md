# Development & Testing Plan

**Goal:** Align with the full Dashboard requirements: establish a repeatable, stable development rhythm and ensure quality and no impact on production via **Unit Tests** and **Regression / E2E Tests**.

**Relation to main plan:** This document covers implementation and verification for the “Dashboard full requirements plan”; batch rollout and environment separation follow the main plan’s “testing and release without impacting production” section.

---

## 1. Existing test assets

| Type | Tool | Location | Coverage |
|------|------|----------|----------|
| Unit | Vitest | `vite.config.js` → `test`, `src/test/setup.js` | `src/lib/database.test.js`, `hardwareConfig.test.js`, `constants.test.js` |
| E2E | Playwright | `playwright.config.js`, `e2e/*.spec.js` | `app.spec.js` (unauthenticated), `dashboard.spec.js` (requires E2E_AUTH_EMAIL/PASSWORD) |
| CI | GitHub Actions | `.github/workflows/test.yml` (if present) | Per current config: unit + e2e |

**Commands:**
- `npm run test` / `npm run test:run` / `npm run test:unit`: Vitest
- `npm run test:e2e`: Playwright (starts app on port 5175)

---

## 2. Development plan (aligned with batch rollout)

Each batch must pass the corresponding **Unit + Regression/E2E** before merge or release.

### Batch 1: UI / copy only (low risk)

**Scope:** Remove search from Header, Fleet section, Decommissioned status; card status and rocket icon; rename Calendar to Schedule; Today button and week/month toggle.

**Implementation focus:** Changes in `Header.jsx`, `Dashboard.jsx`, `EditVehicleModal.jsx`, `VehicleCard.jsx`, `CalendarOverviewModal.jsx` and related CSS. No API or DB schema changes.

**Deliverables:** Code changes + E2E updates (see “Regression list” below). Run full regression after this batch before release.

---

### Batch 2: Queries and filtering (low risk)

**Scope:** Exclude cancelled bookings via `deleted_at`; Reserve calendar week starts Monday; center calendar arrows and month; consistent hardware preview.

**Implementation focus:** Add `.is('deleted_at', null)` in `BookingModal.jsx` and `Dashboard.jsx` (next_booking). Calendar header and offset: Monday as first day; CSS for arrow and month alignment. Ensure vehicle list and edit form hw_config read/write are consistent.

**Deliverables:** Code changes. Optional unit tests for `database.js` (e.g. `getBookingsByUser`, `deleted_at` filtering).

---

### Batch 3: Forms and fields (medium risk)

**Scope:** Department required; Parameter Change field; Pilot optional / Who ordered required; My Bookings date display.

**Implementation focus:** EditVehicleModal: Department dropdown (required), Parameter Change text field; align payload with DB. BookingModal: adjust validateForm; Who ordered required. My Bookings: ensure `formatRange(start_time, end_time)` matches API and display.

**Deliverables:** Code + migrations if needed (e.g. new vehicle columns); verify on staging. Unit: form validation (Department required, Parameter Change in payload); BookingModal validation as pure function.

---

### Batch 4: New features — Filter, Schedule filter, Changelog (medium risk)

**Scope:** Main Filter modal; Schedule vehicle filter; Changelog icon on cards + modal (3 entries + Show More scroll).

**Implementation focus:** Filter: button left of Schedule, modal, Dashboard filter by `selectedVehicleIds`. Schedule: week/month + vehicle filter, front-end filter of results. Changelog: icon on VehicleCard, ChangeHistoryModal (default 3, Show More to scroll); remove Change Log from Profile menu.

**Deliverables:** Code + new components. Unit: Filter grouping by department and selected id list as pure functions. E2E: add/update scenarios (see Regression list).

---

### Batch 5: Iza approval and notifications (high risk)

**Scope:** `bookings.status`, `approval_requests`, `notifications`; Reserve flow split; notification area; Approve / Reject / Edit.

**Implementation focus:** DB migration (reversible, backward compatible) on staging first. BookingModal: for Marketing vehicles and non-approver user → write `pending_approval` + approval_request + notification. Notification area: visible only to approvers (e.g. izabela@deltaquad.com, a.chang@deltaquad.com); Approve/Reject/Edit per main plan.

**Deliverables:** Migration scripts + code. Unit: approver list and status branching (mock DB). E2E: approval flow in separate spec, run on staging with test accounts.

---

## 3. Test strategy overview

- **Unit:** Fast, no network/DB; target single modules; run after relevant changes.
- **E2E / Regression:** Simulate real flows; ensure key paths are intact; run full set after each batch and before release.
- **CI:** At least `npm run test:run`; E2E optional per PR or on main / scheduled staging runs.

---

## 4. Unit test plan

### 4.1 Existing and maintained

- **`src/lib/database.test.js`:** Keep current Supabase mock style; add tests for new methods (e.g. `deleted_at` filtering, getBookingsByUser).
- **`src/lib/hardwareConfig.test.js`:** Keep; no change if parameter_change fields do not affect hardwareConfig.
- **`src/lib/constants.test.js`:** Keep.

### 4.2 Suggested additions

| Module | Focus |
|--------|--------|
| **changeLogger.js** | `getChangeHistory(entityType, entityId, limit)` shape; `formatChangedFields`, `getFieldLabel` as pure functions (mock supabase). |
| **database.js** | If `getBookingsByUser` or `deleted_at` filtering exists: verify call args or return shape; `deleteBooking` mock for `deleted_at` write. |
| **Filter logic** | If “group by department → vehicle id list” is in `src/lib/filterVehicles.js` (or similar): unit test input vehicles, output grouping and selected ids. |
| **BookingModal validation** | Extract `validateForm` as pure (formData, selectedDates, whoOrderedMode, whoOrderedCustom); unit: Pilot optional, Who ordered required when others, Project required. |
| **EditVehicleModal validation** | Department required, Parameter Change optional; unit test payload shape. |

### 4.3 Principles

- Mock all Supabase / Auth in unit tests; no real backend.
- Prioritize **pure functions** and **edge cases** (empty array, null, extreme dates).
- File naming: `*.test.js` or `*.spec.js`, consistent with existing.

---

## 5. Regression / E2E plan (stabilization)

### 5.1 Selector priority

1. Prefer **role + name** (e.g. `getByRole('button', { name: /schedule/i })`).
2. Then **data-testid** (e.g. `data-testid="schedule-trigger"`) for key buttons/forms only.
3. Avoid relying only on class, DOM depth, or long copy to reduce breakage on small UI changes.

### 5.2 E2E and environment

- Local: `npm run test:e2e` against localhost:5175 (playwright webServer).
- CI: same config or E2E only on main/scheduled against staging URL (BASE_URL + test account).
- Auth: use `E2E_AUTH_EMAIL` / `E2E_AUTH_PASSWORD` for login-required cases.

### 5.3 Data and idempotency

- Do not depend on “vehicle R&D-125 must exist”; use “after login, vehicle list or empty state” or “block with data-testid exists”.
- Use identifiable project names/suffixes for created bookings/vehicles; clean up in after or dedicated cleanup.

### 5.4 Waits and retries

- Use explicit waits (e.g. `expect(locator).toBeVisible({ timeout: 5000 })`); avoid fixed `page.waitForTimeout`.
- Keep Playwright retries (e.g. 2 in CI); review flaky cases and fix selectors or flow.

### 5.5 Regression checklist (E2E scenarios)

Run after each batch and before release.

| # | Scenario | Expected | Notes |
|---|----------|----------|-------|
| R1 | Unauthenticated → home | Redirect to login, Sign In visible | app.spec |
| R2 | Login page structure | Google sign-in, UAV Fleet Command, etc. | app.spec |
| R3 | Post-login Dashboard | Schedule button visible, vehicle list or empty state | dashboard.spec |
| R4 | Open Schedule modal | Title Schedule (or Fleet Schedule) | New/update |
| R5 | Vehicle card RESERVE | Click RESERVE opens booking modal, title Reserve/Reserving | dashboard.spec |
| R6 | Booking modal required/optional | Project required, Who ordered required, Pilot optional; validation message on submit | New |
| R7 | Edit vehicle | Edit opens Edit Vehicle; no Decommissioned; Department dropdown | New/update |
| R8 | Main Filter | Click Filter opens modal; select department/vehicles; list shows only selected | New |
| R9 | Changelog | Changelog icon on card; click opens modal, recent entries + Show More | New |
| R10 | Iza approval (staging) | Login as a.chang → book Marketing vehicle → notification appears → Approve/Reject/Edit correct | New; separate spec, approver account only |

### 5.6 E2E file structure

- `e2e/app.spec.js`: Unauthenticated and login page (keep).
- `e2e/dashboard.spec.js`: Dashboard, Schedule, RESERVE modal, Filter, Changelog (extend).
- `e2e/booking.spec.js` (optional): Booking form required fields, date picker, conflict warning, tooltip.
- `e2e/approval.spec.js` (optional): Run only with approver account; Marketing booking → notification → Approve/Reject/Edit.

Use shared `ensureLoggedIn` or fixture for login-required cases; Schedule button name aligned with “Schedule” (not Calendar Overview).

---

## 6. CI and local execution

### 6.1 Local workflow

1. After feature work on a branch: `npm run test:run` → then `npm run test:e2e` (optional but required before batch sign-off).
2. Before commit: run full Regression list (at least R1–R5; R7–R9 if Filter/Changelog done).
3. If pre-push hook exists: run `npm run test:run`.

### 6.2 CI recommendations

- **Every push/PR:** Run `npm run test:run` (unit). Block merge on failure.
- **E2E:** Option A: same workflow starts `npx vite --port 5175`, run `npm run test:e2e` (skip login cases if E2E_AUTH_* not set). Option B: E2E only on merge to main or nightly against staging (including R10).
- If E2E is flaky: require unit pass; run E2E on main or nightly and document “Regression manual checklist + automated E2E subset”.

---

## 7. Per-batch checklist (development + testing)

**Batch 1**
- [ ] Code changes done (Header, Fleet, Decommissioned, cards, Schedule, Today/week-month)
- [ ] `npm run test:run` passes
- [ ] E2E: R1–R5 updated (Schedule button name) and pass
- [ ] No new console errors; quick manual smoke of key paths

**Batch 2**
- [ ] Query and calendar changes done
- [ ] Unit: add tests for database filtering if applicable
- [ ] E2E: R3–R5 still pass; manual check that cancelled booking does not show on calendar

**Batch 3**
- [ ] Forms and fields done; migrations run on staging if any
- [ ] Unit: validation tests (Department, Who ordered, Parameter Change)
- [ ] E2E: R6–R7 added/updated and pass

**Batch 4**
- [ ] Filter, Schedule filter, Changelog done
- [ ] Unit: Filter grouping/filter logic tests
- [ ] E2E: R8–R9 added and pass

**Batch 5**
- [ ] DB migration verified on staging; approval flow and notification area done
- [ ] Unit: approver check and status branching
- [ ] E2E: R10 on staging with a.chang / izabela
- [ ] Rollback and monitoring notes in main plan

---

## 8. Relation to main plan

- **Environment separation, batch release, DB migration, feature flags, rollback:** See main plan “testing and release without impacting production”.
- **This document:** Defines what to build per batch and which Unit + Regression must pass, and how to keep Regression stable (selectors, environment, data, CI).

Develop in batches; run the corresponding Unit + Regression after each batch and only then merge or release.

---

## 9. Step-by-step batch instructions

Each batch can be done in a separate context: complete “Development steps” then “Testing steps”, then proceed to the next batch.

### Batch 1: UI / copy

**Development**
1. Branch: `git checkout -b feature/batch-1-ui-copy`
2. **Header.jsx:** Remove search state (`showSearch`), search input, search icon button.
3. **Dashboard.jsx:** Remove Fleet section and title.
4. **EditVehicleModal.jsx:** Remove Decommissioned from status `<select>`.
5. **VehicleCard.jsx:** Remove Decommissioned from STATUS_Map; show "Available" (not "Ready"); remove rocket from card icon box.
6. **Header.jsx:** Rename “Calendar Overview” to “Schedule”; `data-testid` e.g. `schedule-trigger`.
7. **CalendarOverviewModal.jsx:** Title “Schedule” or “Fleet Schedule”; Today button; week/month toggle; default week view; `.calendar-day-cell.today` styling.
8. **CalendarOverviewModal.jsx:** Implement weekly view (`viewMode: 'weekly' | 'monthly'`, default `'weekly'`).
9. `npm run build` to confirm no errors.

**Testing**
1. `npm run test:run` → all pass.
2. E2E: In `e2e/dashboard.spec.js` use “Schedule” (e.g. `getByRole('button', { name: /schedule/i })`).
3. `npm run test:e2e`; if E2E_AUTH_* set, confirm R1–R5 pass.
4. Manual: no search, no Fleet title, no rocket, statuses Available/Mission/Maintenance, Schedule button and modal, Today and week/month toggle.

### Batch 2: Queries and filtering

**Development**
1. Branch: `git checkout -b feature/batch-2-queries`
2. **BookingModal.jsx:** Add `.is('deleted_at', null)` to Supabase query in `fetchExistingBookings`.
3. **Dashboard.jsx:** Same for next_booking query.
4. **BookingModal.jsx:** Calendar header Mon–Sun (Monday first); day offset `(getDay() + 6) % 7`.
5. **BookingModal.css:** `.calendar-header span` min-height, flex, align center for arrows and month.
6. Confirm EditVehicleModal and VehicleCard hw_config read/write match.
7. `npm run build`.

**Testing**
1. `npm run test:run` → pass.
2. E2E: R3–R5 still pass.
3. Manual: book then cancel; Reserve calendar and next booking do not show cancelled.
4. Manual: Reserve calendar header Mon–Sun, arrows and month centered.

### Batch 3: Forms and fields

**Development**
1. Branch: `git checkout -b feature/batch-3-forms`
2. **EditVehicleModal.jsx:** Department dropdown (required) under Vehicle Name; Parameter Change text field under Software Version; include in formData and payload.
3. **DB:** If `vehicles` lacks `parameter_change_notes`, add migration and run on staging.
4. **BookingModal.jsx:** Remove Pilot required; Who ordered required (custom name when “others”); labels and error messages.
5. **MyBookings.jsx:** Ensure `getBookingsByUser` returns `start_time`, `end_time`; use `formatRange(b.start_time, b.end_time)`; check CSS for truncation.
6. `npm run build`.

**Testing**
1. `npm run test:run` → pass; add unit tests for validation if extracted.
2. E2E: Add R6 (booking required/optional), R7 (Edit vehicle has Department, no Decommissioned).
3. Manual: Department required, Parameter Change optional; Pilot optional, Who ordered required; My Bookings shows full date range.

### Batch 4: Filter, Schedule filter, Changelog

**Development**
1. Branch: `git checkout -b feature/batch-4-filter-changelog`
2. **Filter:** Button left of Schedule in Header; modal with R&D/Training/Marketing, then vehicle multi-select; return selected vehicle ids; Dashboard filter by `selectedVehicleIds` (null = all).
3. **Schedule:** Vehicle filter in CalendarOverviewModal; calendar shows only selected vehicles’ bookings; with week/month and Today.
4. **Changelog:** Icon on VehicleCard; click opens ChangeHistoryModal (default 3, Show More to scroll); remove Change Log from Profile menu.
5. `npm run build`.

**Testing**
1. `npm run test:run` → pass; unit tests for Filter pure functions if added.
2. E2E: R8 (Filter), R9 (Changelog icon and modal).
3. Manual: Filter updates list; Schedule filter updates calendar; changelog icon opens modal and Show More; Profile has no Change Log.

### Batch 5: Iza approval and notifications

**Development**
1. Branch: `git checkout -b feature/batch-5-approval`
2. **DB:** Migration for `bookings.status`, `approval_requests`, `notifications` (reversible, backward compatible); set existing bookings `status = 'confirmed'`; run on staging first.
3. **BookingModal.jsx:** If vehicle is Marketing and user is not approver (e.g. izabela@deltaquad.com, a.chang@deltaquad.com), write `status = 'pending_approval'` and create approval_request and notification.
4. **Notification area:** In Header or Profile; approvers only; list pending (who, project, date, duration); Approve, Reject, Edit per item.
5. **Approve:** Set booking.status = confirmed; mark approval_request and notification read.
6. **Reject:** Set status = rejected; exclude from calendar.
7. **Edit:** Open Reserve form pre-filled; save then set confirmed.
8. `npm run build`.

**Testing**
1. `npm run test:run` → pass; unit test approver check.
2. E2E: R10 on staging with a.chang@deltaquad.com (or izabela); book Marketing vehicle, notification appears, run Approve/Reject/Edit once each.
3. Manual: Non-approver books Marketing; only approvers see notifications; after Approve calendar shows; after Reject does not; Edit allows change and save.

### After each batch

- [ ] `npm run test:run` passes
- [ ] `npm run test:e2e` passes (or that batch’s R items)
- [ ] `npm run build` passes
- [ ] Manual pass through key paths, no console errors
- [ ] Then proceed to next batch or merge/release
