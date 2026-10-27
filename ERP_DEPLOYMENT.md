# ERP Integration Deployment

The external ERP integrates directly with the backend API (`https://api.luxygalleria.com/api/v1/erp/*`), signing each request with its own key (HMAC-SHA256; see `docs/ERP-INTEGRATION-API-SPEC.md`). The admin dashboard has no ERP page and no server-side ERP proxy.

The admin Vercel project no longer uses `ERP_KEY_ID`, `ERP_SECRET` or `ERP_API_BASE_URL`; they can be removed from its environment. ERP keys live only in the backend's `ERP_API_KEYS`.

## Hostinger Backend

Run automated tests on the developer/test machine against the dedicated throwaway test database, not on the live Hostinger server. The integration test drops its explicitly named test database before seeding it.

For a reviewed backend release:

1. From the backend development checkout, run `npm run test:erp` and `npm run build`.
2. Transfer/deploy the reviewed backend source and generated `dist` to `/opt/luxygalleria-migration/backend` through the existing release procedure.
3. On Hostinger, run `cd /opt/luxygalleria-migration/backend && npm ci && npm run build` if that is the current deployment's build procedure.
4. Inspect the process name with `pm2 list`, restart only the existing backend process by its listed name, then confirm `https://api.luxygalleria.com/api/v1/health` returns 200.
5. Leave production `.env` and `ERP_API_KEYS` unchanged. Privately check that each ERP key ID in use is accepted, with `npm run diagnose:erp-keys`; never print or paste the secret.

## Verification Boundary

Do not test live stock changes, item writes, webhook updates, or image uploads without an approved production record/change window; use staging or test data for write verification.
