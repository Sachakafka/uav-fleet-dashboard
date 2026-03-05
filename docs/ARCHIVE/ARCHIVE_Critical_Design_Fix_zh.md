# Critical design fix (archived)

**Date:** 2026-02-04  
**Severity:** Critical (addressed in codebase)

This document is an English summary of the original Chinese “critical design fix” document. For current documentation see **HANDOVER.md** and **docs/00_README_DOCS_INDEX.md**.

---

## Problem

The original design restricted vehicles to a fixed list (`ALLOWED_VEHICLE_NAMES` in `constants.js`). Dashboard only showed vehicles in that list, and a script (`08_vehicles_seven_names.sql`) deleted any vehicle not in the list. That conflicted with the real requirement: **dynamic vehicle management** (any number of vehicles, free naming within department prefix convention).

---

## Correct requirements (summary)

- Support **any number** of vehicles (not limited to 7).
- **Free naming** with format: `[Department prefix]-[identifier]` (e.g. RD-117, Training-933, Marketing-001).
- Dashboard shows **all** vehicles from the database.
- Add, edit, delete vehicles without code changes.

---

## Fixes applied

1. **constants.js:** Replaced `ALLOWED_VEHICLE_NAMES` with `DEPARTMENT_PREFIXES`; added optional `isValidVehicleName()` and `getDepartmentFromName()`.
2. **Dashboard.jsx:** Removed filter by allowed names; sort and display all vehicles from DB.
3. **EditVehicleModal.jsx:** Kept free-text name input; added naming-convention hint and optional soft validation.
4. **DB:** Obsolete script `08_vehicles_seven_names.sql` removed; cleanup script only removes obvious test/invalid data (see ARCHIVE_Codebase_Fixes_Summary_zh.md).

---

## Conclusion

The codebase was updated to support dynamic vehicle management. The fixed list and destructive “seven names” script are no longer used. For current behaviour and docs, see **HANDOVER.md**.
