# ERP Workbench Deployment

## URLs

- Admin ERP workbench: `https://luxygalleria-admin.vercel.app/dashboard/erp` (confirm the assigned domain in the Vercel project)
- Local admin ERP workbench: `http://localhost:3001/dashboard/erp`
- Backend API base: `https://api.luxygalleria.com/api/v1`

The browser talks to the admin app's same-origin `/api/erp/*` Route Handler. That handler validates the admin session with the backend profile endpoint, requires the `admin` or `superadmin` role, and signs allow-listed ERP calls on the server. Never prefix ERP signing variables with `NEXT_PUBLIC_` or place them in frontend code.

## Hostinger Backend

Run automated tests on the developer/test machine against the dedicated throwaway test database, not on the live Hostinger server. The integration test drops its explicitly named test database before seeding it.

For a reviewed backend release:

1. From the backend development checkout, run `npm run test:erp` and `npm run build`.
2. Transfer/deploy the reviewed backend source and generated `dist` to `/opt/luxygalleria-migration/backend` through the existing release procedure.
3. On Hostinger, run `cd /opt/luxygalleria-migration/backend && npm ci && npm run build` if that is the current deployment's build procedure.
4. Inspect the process name with `pm2 list`, restart only the existing backend process by its listed name, then confirm `https://api.luxygalleria.com/api/v1/health` returns 200.
5. Leave production `.env` and `ERP_API_KEYS` unchanged. Privately check that the ERP key ID used by the admin deployment matches an accepted ID from `npm run diagnose:erp-keys`; never print or paste the secret.

## Admin Vercel

In the existing Luxy Galleria admin Vercel project, configure these server-side environment variables for the intended environments:

- `ERP_KEY_ID`: an ID already configured in backend `ERP_API_KEYS`
- `ERP_SECRET`: that key's corresponding secret (minimum 32 characters)
- `ERP_API_BASE_URL`: `https://api.luxygalleria.com/api/v1`

Do not use `NEXT_PUBLIC_` names for these values. Redeploy the admin project after changing its environment. No frontend secret is needed in the browser bundle.

## Verification Boundary

Local verification is covered by `npm run test:erp`, the backend TypeScript build, the admin production build, targeted ERP lint, and a browser layout check at desktop and mobile widths. Production order reads can be checked with an authorized admin session. Do not test live stock changes, item writes, webhook updates, or image uploads without an approved production record/change window; use staging or test data for write verification.