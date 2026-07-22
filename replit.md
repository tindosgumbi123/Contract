# Dunwell Youth Priority Clinic — Contract Generator

A professional contract generation and e-signing tool for Dunwell Youth Priority Clinic. Create, fill in, share, sign, and download employment contracts and formal offers of employment.

## Run & Operate

- `pnpm --filter @workspace/contract-tool run dev` — run the frontend (auto-managed by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (auto-managed by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, Wouter routing, TanStack Query
- PDF: jsPDF (client-side, with logo embedding)
- Signatures: signature_pad (canvas-based)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/sessions.ts` — Sessions table schema
- `artifacts/api-server/src/routes/sessions.ts` — Contract session API routes
- `artifacts/contract-tool/src/` — React frontend
- `attached_assets/Logo_Registered_.jpg_1784562296480.jpeg` — Dunwell logo (used in PDFs)

## How It Works

1. **Admin** clicks "New Contract" → selects type (Employment Contract or Formal Offer) → enters employee name → session created with a unique share token
2. **Admin** fills in all contract fields (auto-saved on blur)
3. **Admin** copies the share link and sends it to the employee / other signatories
4. **Anyone with the link** can open the session, view the contract, and draw their signature
5. **Download PDF** generates a professional PDF with the Dunwell logo and all signatures embedded

## Contract Types

- **Employment Contract** — full multi-article contract; needs Employee, Witness, Project Manager, Director signatures
- **Formal Offer of Employment** — shorter offer letter; needs Employee (×2 sections) and Company signatures

## Architecture decisions

- Sessions are identified by `shareToken` (16-char UUID fragment) in all URLs — the primary key `id` is internal only
- All session lookups go through `shareToken`, so shared links are opaque and cannot enumerate sessions
- Signatures are stored as base64 PNG strings in the sessions table (no object storage needed for this use case)
- PDF generation is entirely client-side using jsPDF — no server processing required
- Auto-save on field blur uses PATCH /api/sessions/:token

## User preferences

- Contracts must match the exact text from the original uploaded PDFs
- PDF must include the Dunwell logo
- Signature date must appear alongside each signature

## Gotchas

- After any OpenAPI spec change, run codegen before touching routes or frontend
- The `@assets` Vite alias points to `/attached_assets/` — use this for the logo in frontend code
- The logo for jsPDF is fetched at `/attached_assets/Logo_Registered_.jpg_1784562296480.jpeg`
