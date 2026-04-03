## Sprint 3 Plan

### Phase 1: Database Migration (all tables at once)
- `currency_rates` — exchange rate storage
- `cash_transfers` + `cash_transfer_batches` — M-Pesa cash transfers
- `grant_reminder_logs` — deadline reminder tracking
- `expense_claims` — staff expense claims
- `petty_cash_funds` + `petty_cash_transactions` — petty cash with balance trigger
- Add `base_currency` column to `organizations`
- RLS policies for all new tables
- RBAC permissions for new modules

### Phase 2: Core Utilities & Hooks
- `src/lib/burnRate.ts` — burn rate calculation engine
- `src/lib/mpesa.ts` — phone formatting utility
- `src/hooks/useCurrency.ts` — currency conversion hook

### Phase 3: Edge Functions
- `fetch-exchange-rates` — daily currency rate fetch
- `mpesa-b2c-transfer` — Safaricom B2C payment
- `mpesa-b2c-callback` — Safaricom async result handler
- `grant-deadline-reminders` — daily deadline check + email

### Phase 4: UI Components
- `BurnRateGauge` — progress bar with projections
- `CurrencyAmount` — formatted multi-currency display
- `GrantFinancialReport` — donor-format budget vs actuals
- Petty Cash tab in FinancialSuite
- CashTransfers page
- ExpenseClaims page
- Grant Calendar tab

### Phase 5: Wiring & Backlog Fixes
- Wire components into existing pages
- Fix LogFrameBuilder indicator data
- Fix IndicatorsDashboard target values
- Fix ComplianceDocumentsSettings signed URLs
- Add routes and sidebar items
- Build verification

### Secrets Required (user must add)
- MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_B2C_SHORTCODE, MPESA_B2C_INITIATOR_NAME, MPESA_B2C_SECURITY_CREDENTIAL, MPESA_B2C_RESULT_URL, MPESA_B2C_QUEUE_TIMEOUT_URL, MPESA_ENV
