# Codebase Fixes Summary (archived)

**Date:** 2026-02-04  
**Reason:** Support dynamic vehicle management (unlimited count, no fixed name list).

This document is the English summary of the original Chinese codebase-fixes report. For current guidance see **HANDOVER.md** and **docs/00_README_DOCS_INDEX.md**.

---

## Goals

- Support **any number** of vehicles (not limited to 7).
- **Free naming** (within department prefix convention).
- Dashboard **dynamically shows all vehicles**.
- Add, edit, and delete vehicles at any time.

**Naming convention:** `[Department prefix]-[id or description]`  
Examples: `RD-117`, `Training-933`, `Marketing-001`.

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/constants.js` | Replaced `ALLOWED_VEHICLE_NAMES` with `DEPARTMENT_PREFIXES`; added `isValidVehicleName()`, `getDepartmentFromName()`. |
| `src/pages/Dashboard.jsx` | Removed filter by allowed names; sort and show all vehicles from DB. |
| `src/components/EditVehicleModal.jsx` | Added naming-convention hint, updated placeholder, optional soft validation. |
| `db/08_cleanup_test_vehicles.sql` | New script: only delete obvious test data; do not restrict to a fixed list. |
| `db/08_vehicles_seven_names.sql.OLD` | Renamed/obsolete (later removed). |

---

## Before vs after

| Item | Before | After |
|------|--------|--------|
| Vehicle count | Fixed 7 | Any number |
| Naming | Must be in list | Free (within format) |
| Adding vehicles | Required code change | Add directly in UI |
| Dashboard | Only listed vehicles | All vehicles |
| Extending departments | Hard | Easy (add prefix) |

---

## Testing (summary)

- Add vehicle with valid name (e.g. `RD-999`) → saved, shown on dashboard.
- Add vehicle with invalid name → optional warning; user can still save.
- Edit vehicle name → saved and reflected.
- Delete vehicle (when implemented) → count decreases, grid updates.

---

**Status:** All fixes applied. Dynamic vehicle management supported. For current docs and handover, see **HANDOVER.md**.
