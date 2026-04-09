# Frontend Instant Update Guide

## Goal

After any create/update/delete action, the page should update immediately without requiring browser refresh.

This project now uses a unified interaction pattern:

- optimistic update (update local UI first)
- rollback or reload when request fails
- action lock to prevent double submit
- optional server re-sync after success

## Core Rules

1. Any write action must have duplicate-submit guard
   - use per-row lock: `isActionLoading(id)` + `withActionLock(id, task)`
   - or page-level lock: `saving` / `actionLoading`

2. Any write action should update local state immediately
   - update row/list in memory first
   - then call API
   - if API fails, rollback to snapshot or re-fetch list

3. After success, keep data eventually consistent
   - use light `loadList()` / `loadDetail()` re-sync as needed
   - keep UX instant, but avoid long-term drift

4. GET requests should avoid stale cache
   - request interceptor appends `_t` by default for GET
   - use `disableCacheBust` only when explicitly needed

## Reusable Building Blocks

- `src/composables/useInstantListActions.js`
  - `withActionLock(id, task)`
  - `isActionLoading(id)`
  - `replaceById(id, updater)`
  - `removeById(id)`

- `src/composables/useCancelableLoader.js`
  - prevent stale response overwrite
  - cancel in-flight list requests

- `src/composables/useListQueryState.js`
  - normalized `page/pageSize/keyword` state

## Page Checklist (for new CRUD pages)

- [ ] write action has loading lock
- [ ] UI updates immediately after click
- [ ] request failure has rollback/reload
- [ ] success path has optional re-sync
- [ ] list request supports cancel/debounce if searchable
- [ ] error message is user-visible

## Current Coverage

- Memo management
- Message management
- Quotation history and editor
- Approval list and approval detail
- Beam quotation list and history
- Notification center (single read / mark all read)

## Regression Command

Run:

`npm run regression:instant-update`

This script checks critical pages/composables for required instant-update patterns and fails CI when conventions are broken.
