# Admin and Finance Touch-ups

This file tracks the connected admin and finance work across the website and staff app.

## 2026-08-10

### Completed in this pass

- Replace VoyageTech company details in the staff account screen with Zimbabwe Shipping details.
- Move staff-app company contact details into a shared configuration module.
- Make admin revenue totals currency-aware on the website and staff app.
- Count only completed payments as collected revenue.
- Use the same resilient customer-name extraction rules on both dashboards.
- Refresh admin and finance overview data automatically when shared records change.
- Add a database migration so only received payments enter the reconciliation queue and finance anomaly monitor.

### Verification

- [x] Website production build passes (`npm run build`).
- [x] Staff app TypeScript check passes (`tsc --noEmit -p staff-app/tsconfig.json`).
- [x] Website dashboard uses currency-aware collected totals (live data currently has no completed payments).
- [x] Staff admin dashboard shows collected payments only.
- [x] Recent shipment customer names match between previews.
- [x] Staff Account source contains no VoyageTech company details.
- [x] Staff Account live preview shows Zimbabwe Shipping company details.
- [x] Live Supabase subscriptions cover dashboard-critical admin and finance tables.
- [x] Finance RPC migration uses the same completed-payment rules as both dashboards.

### Deployment note

- `20260810173000_finance_reconciliation_semantics.sql` is ready but has not been applied remotely.
- The linked project's migration history is not aligned with the repository, so a blanket `supabase db push` would try to apply unrelated historical migrations. Apply this single migration through a controlled SQL deployment instead.

### Later phases

- Establish one authoritative invoice/payment/reconciliation data contract.
- Add real-time admin and finance dashboard refresh.
- Add ageing, overdue balances, expense approvals and audit history.
- Verify end-to-end customer invoice and proof-of-payment workflows.
