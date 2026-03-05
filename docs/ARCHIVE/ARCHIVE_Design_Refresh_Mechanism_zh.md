# Design analysis: Dashboard data refresh mechanism (archived)

**Date:** 2026-02-04  
**Status:** Legacy; design has since evolved (e.g. dynamic vehicle list, no ALLOWED_VEHICLE_NAMES).

This document is an English summary of the original Chinese design analysis. For current documentation see **HANDOVER.md** and **docs/00_README_DOCS_INDEX.md**.

---

## Questions addressed

1. **After add/delete Vehicle, does Dashboard update automatically?**  
   Yes: EditVehicleModal calls `onSave()` → Dashboard runs `fetchVehicles()` → list and count update. (At the time, only vehicles in `ALLOWED_VEHICLE_NAMES` were shown; that filter was later removed.)

2. **After editing Vehicle, do Dashboard and DB stay in sync?**  
   Yes: `supabase.upsert()` updates DB; `onSave()` triggers `fetchVehicles()` so the UI refreshes.

---

## Findings (historical)

- **Data flow:** EditVehicleModal → upsert → `onSave={fetchVehicles}` → Dashboard refetch. Design was correct.
- **Issue identified:** Dashboard filtered by `ALLOWED_VEHICLE_NAMES`; adding a vehicle with a name not in the list caused it to be saved but not shown. Plan was to switch to department-based naming and show all vehicles (later implemented in codebase fixes).

---

## Conclusion

Refresh and sync design was sound. The naming/filter issue was addressed by removing the fixed vehicle list and using department prefixes and dynamic vehicle management (see ARCHIVE_Codebase_Fixes_Summary_zh.md summary).
