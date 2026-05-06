# National Energy War Room

Production-grade intelligence and complaints platform for the Federal Ministry of Power, Nigeria — built for the Minister's office to monitor the power sector value chain and manage citizen complaints at scale.

## Run & Operate

```bash
# Start API server (auto-builds + starts workers)
pnpm --filter @workspace/api-server run dev

# Build only
pnpm --filter @workspace/api-server run build

# Typecheck
pnpm --filter @workspace/api-server run typecheck

# Seed database (idempotent — clears then repopulates)
cd artifacts/api-server && DATABASE_URL="$DATABASE_URL" npx tsx prisma/seed.ts

# Push schema changes to database
cd artifacts/api-server && npx prisma db push

# Generate Prisma client after schema change
cd artifacts/api-server && npx prisma generate
```

### Required Env Vars

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Replit-managed) |
| `JWT_PRIVATE_KEY` | RS256 RSA private key (PEM, base64-encoded) |
| `JWT_PUBLIC_KEY` | RS256 RSA public key (PEM, base64-encoded) |
| `JWT_REFRESH_SECRET` | HMAC secret for refresh tokens |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM NIN encryption |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `WHATSAPP_VERIFY_TOKEN` | Meta Cloud API webhook verification |
| `PORT` | Injected by Replit per artifact |

### Seed Credentials
- **Admin:** `admin@warroom.gov.ng` / `Admin@WarRoom2025!`
- **Minister:** `minister@power.gov.ng` / `Staff@Ministry2025`
- **Staff:** `staff@power.gov.ng` / `Staff@Ministry2025`
- **NERC Viewer:** `analyst@nerc.gov.ng` / `Staff@Ministry2025`
- **Eko DisCo Agent:** `agent@ekedc.com.ng` / `Agent@DisCo2025`

## Stack

- **Runtime:** Node.js 22 (ESM), TypeScript, esbuild bundle
- **Framework:** Express 5
- **ORM:** Prisma 7.8.0 with `@prisma/adapter-pg` (driver-adapter pattern)
- **Database:** PostgreSQL (Replit-managed)
- **Auth:** RS256 JWT (15-min access) + opaque refresh tokens (7-day), bcryptjs
- **Encryption:** AES-256-GCM for citizen NIN storage
- **Validation:** Zod schemas on all routes
- **Logging:** pino + pino-http
- **Security:** helmet, CORS, express-rate-limit
- **Workers:** node-cron (SLA tracker 1min, escalation 5min, stats 5min)
- **Workspace:** pnpm monorepo

## Where Things Live

```
artifacts/api-server/
  prisma/
    schema.prisma          ← 27-model schema (source of truth)
    seed.ts                ← Full seed: 15 plants, 11 DisCos, 250 complaints, value chain
    prisma.config.ts       ← Prisma 7 driver-adapter config (DATABASE_URL + PrismaPg)
  src/
    index.ts               ← Server entry + worker startup
    app.ts                 ← Express app (helmet, CORS, pino, rate-limit)
    lib/
      prisma.ts            ← PrismaClient singleton via PrismaPg adapter
      jwt.ts               ← RS256 sign/verify (access + refresh)
      crypto.ts            ← AES-256-GCM NIN encrypt/decrypt
      logger.ts            ← pino logger instance
    middlewares/
      auth.ts              ← requireAuth, requireRole, requireStaff
      audit.ts             ← writeAuditLog helper
      rateLimiter.ts       ← public / complaint / generic limiters
      validate.ts          ← Zod body/query middleware
    routes/
      health.ts            ← GET /healthz
      v1/
        auth.ts            ← POST /login /register /refresh /logout, GET /me
        complaints.ts      ← Tier 1: file, track, citizen-response, satisfaction, WhatsApp webhook
        sector.ts          ← Tier 2: KPIs, grid, sankey, plants, discos, feeders, gas, projects, value-chain, alerts
        admin/
          index.ts         ← Admin router + audit log + NERC import
          complaints.ts    ← Tier 3: list, stats, patch, assign, escalate, resolve, reopen
          registry.ts      ← Tier 3: generic CRUD for 18 entity types
          users.ts         ← Tier 3: staff user management (ADMIN only)
          alerts.ts        ← Tier 3: alerts CRUD
    workers/
      sla.ts               ← SLA breach detection per CPR 2023 windows
      escalation.ts        ← Auto-escalation via EscalationRule engine
      stats.ts             ← Complaint stats cache refresher
lib/api-spec/openapi.yaml  ← Full OpenAPI 3.1 spec
docs/api-collection.json   ← Insomnia/Postman collection
```

## Architecture Decisions

- **Prisma 7 driver-adapter pattern**: `schema.prisma` has no `url` in datasource; connection URL lives in `prisma.config.ts` (migrate) and is passed as `PrismaPg` adapter to `PrismaClient` constructor. This is Prisma 7's breaking-change approach.
- **RS256 JWT**: Private key signs, public key verifies. Keys stored as base64-encoded PEM env vars. Enables future public key distribution for frontend-only verification.
- **AES-256-GCM NIN encryption**: Citizen NINs are encrypted at rest using a unique IV per record. Decryption only happens server-side when required for identity verification.
- **Role-based access tiers**: CITIZEN (public), staff roles (MINISTER/MINISTRY_STAFF/NERC_VIEWER/DISCO_AGENT), ADMIN. `requireRole()` middleware enforces per-route.
- **esbuild bundle**: All source bundled to `dist/index.mjs` except `@prisma/client`, `@prisma/adapter-pg`, `pg` (externalized for runtime Prisma engine resolution).
- **Ticket format**: `WR-YYYYMMDD-NNNNNN` (6-digit zero-padded sequence with collision retry).

## Product

- **Tier 1 — Public Complaints Portal**: Citizens file complaints by category (metering, billing, supply interruption, electrocution, etc.), receive WR ticket numbers, track status with last-4-phone verification, submit satisfaction scores. WhatsApp webhook integration stubs ready for Meta Cloud API.
- **Tier 2 — Sector Intelligence**: Staff dashboard feeds for live grid metrics (SSE stream), KPIs (generation, losses, PAF), Sankey flow data, plants with unit-level breakdown, 11 DisCos with Q1 2025 NERC actuals, transmission lines, gas pipelines, AKK corridor data, capital projects, mini-grids, settlement invoices.
- **Tier 3 — Admin & War Room**: Complaint lifecycle management (assign, escalate, resolve, reopen), automated SLA tracking per CPR 2023, escalation rule engine, NERC quarterly CSV import, full audit log, staff user management, registry CRUD for all 18 entity types, alert management.
- **Workers**: SLA tracker marks breaches every minute; escalation worker applies rules every 5 minutes; stats refresher caches complaint totals every 5 minutes.

## User Preferences

- WestMetro brand: Arial font only, `#E85426` accent, `#1A1A1A`/`#1C1C1C` dark backgrounds, `#F4F4F4` light surfaces
- Dark theme throughout
- No mocked data — all seeded from real NERC Q1 2025 actuals
- Classification banner: "RESTRICTED — Minister's War Room"
- Ticket format: `WR-YYYYMMDD-NNNNNN`

## Gotchas

- `prisma migrate dev` requires `datasource.url` in `prisma.config.ts` — not the schema file. Schema datasource block must NOT have `url`.
- `pnpm --filter @workspace/api-server` required for all per-package commands; root-level `pnpm` targets all packages.
- `@prisma/client`, `@prisma/adapter-pg`, `pg` must all be in esbuild externals — Prisma engine resolution is runtime-path-based.
- `previewFeatures = ["driverAdapters"]` still in schema but generates deprecation warning in Prisma 7 — harmless, will be removed in next schema update.
- SLA windows (CPR 2023): electrocution=immediate, supply interruption=24h, metering=5 working days (40h), billing=15 working days (120h).
- Seed is destructive — clears all data before repopulating.

## Pointers

- Schema: `artifacts/api-server/prisma/schema.prisma`
- Seed: `artifacts/api-server/prisma/seed.ts`
- OpenAPI spec: `lib/api-spec/openapi.yaml`
- API collection: `docs/api-collection.json`
- Prisma 7 docs: https://pris.ly/d/prisma7-client-config
