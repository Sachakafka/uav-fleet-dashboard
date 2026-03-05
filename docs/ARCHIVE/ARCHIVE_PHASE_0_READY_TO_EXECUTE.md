# Phase 0 ready to execute (archived)

**Status:** All scripts ready  
**Date:** 2026-02-06  
**Estimate:** ~45 minutes

This document is an English summary of the original Phase 0 “ready to execute” guide. For current documentation see **HANDOVER.md** and **docs/00_README_DOCS_INDEX.md**.

---

## Prep completed

**Migration scripts:**
- `db/09_remove_vehicles_risk_level.sql` (Task 8)
- `db/10_add_soft_delete.sql` (Task 9)
- `db/11_create_change_logs.sql` (Task 10)
- `db/PHASE_0_RUN_ALL.sql` (all-in-one)

**Documentation:** Execution checklist, `db/README_PHASE_0.md`.  
**Git:** Commits pushed to `origin/main`.

---

## How to run

1. Open Supabase SQL Editor.
2. **Option A (recommended):** Copy full contents of `db/PHASE_0_RUN_ALL.sql`, paste into editor, Run. Wait ~45 s and check for success messages.
3. **Option B:** Run the three migration files in order (09 → 10 → 11).
4. Verify: vehicles has no `risk_level`, has `deleted_at`; bookings has `risk_level` and `deleted_at`; `change_logs` table exists; active vehicle count as expected.
5. Test frontend: `npm run dev`, confirm Dashboard shows vehicles, no Risk Level in Edit form, save works.

---

## Notes

- Task 8 is destructive (drops `vehicles.risk_level`); ensure backup before running.
- RLS updated to filter `deleted_at IS NULL` for vehicles and bookings.

---

**Next:** Phase 1 bug fixes; change_logs frontend integration; soft-delete UI.
