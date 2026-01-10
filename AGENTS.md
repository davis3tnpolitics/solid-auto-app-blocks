# solid-auto-app-blocks

A PNPM monorepo template for generating **SOLID**, repeatable app “blocks” (Next.js, NestJS, Cube) with a strong bias toward:

- **automation-first scaffolding** (so AI agents can build consistently)
- **testable patterns** (unit/integration/e2e)
- **shared packages** (UI, database, contracts)
- **analytics-ready UI** (charts + maps)

> Goal: become a template repo you can use alongside Codex / Claude Code to spin up production-shaped MVPs quickly.

---

## Infrastructure

- **Neon** for rapid Postgres development
- **GitHub** for code management
- **Vercel** for hosting Next.js frontends
- **Render (free tier)** for spinning up NestJS or CubeJS Docker images
- **Codex / Claude Code** for development assistance

---

## Automation

Automation of structure is a **key** piece of this repo.

We want a “semantic layer” on top of the codebase where creating a new _block_ (app/module/feature) is a single command/function call that:

- generates code in the right place
- applies house rules (SOLID boundaries, linting, tests)
- wires up contracts and docs
- optionally produces a small usage demo

This enables AI-assisted development that is stable and scalable.

---

## Code Structure

This repo is a **PNPM workspace** so packages can be shared across apps.

Top-level directories:

- `/packages` — shared libraries (database, UI, contracts, tooling)
- `/apps` — deployable apps (Next, Nest, Cube, etc.)
- `/automations` — generators + codegen scripts (the “semantic layer”)

### Suggested baseline layout

```txt
.
├─ apps/
│  ├─ web/                 # Next.js frontend (app router)
│  ├─ api/                 # NestJS backend
│  └─ cube/                # CubeJS analytics API (optional)
├─ packages/
│  ├─ database/            # Prisma + migrations + ERD docs + validators
│  ├─ ui/                  # Shared component library (shadcn + analytics UI)
│  ├─ dev-ops/              # scripts, seeds, migration helpers
│  └─ config/              # eslint/prettier/tsconfig shared configs (recommended)
└─ automations/
   ├─ generators/          # plop/hygen/etc. templates (recommended)
   ├─ scripts/             # codegen (ERD, validators, OpenAPI, etc.)
   └─ manifests/           # “single function call” definitions (recommended)
```

---

## Packages

### `/packages/database`

Centered around Prisma.

Recommended subdirectories:

- `/docs` — auto-generated ERD (e.g., via `prisma-markdown`)
- `/prisma` — schema, models, generators, migrations
- `/contracts` — generated DTOs / validators (e.g., `prisma-class-validator-generator`)

**House rules (recommended):**

- Prisma schema lives in one place (`packages/database/prisma/schema.prisma`).
- Apps **import the Prisma client from the package**, not via local generation.
- Contracts are generated and published from the same schema to avoid drift.

### `/packages/dev-ops`

General scripts:

- seed data uploaders
- migration helpers
- “reset dev env” tasks
- analytics data loaders

### `/packages/ui`

Shared component library focused on:

- foundational UI primitives (shadcn/ui)
- form controls (React Hook Form wrappers)
- analytics components (charts, tables, filters)
- map + geo components (Leaflet / React-Leaflet)

### `/packages/auth`

A shared authentication package that lets **Next.js (Auth.js)** and **NestJS** share a single source of truth for identity, sessions, and authorization.

**What lives here (recommended):**

- **Prisma auth models + types**

  - Keep Auth.js/NextAuth models in Prisma (e.g., `User`, `Account`, `Session`, `VerificationToken`) and export the generated types.
  - Add your app-specific authz models here too (e.g., `Role`, `Permission`, `OrgMembership`, `ApiKey`).

- **Auth.js helpers (web side)**

  - Provider presets (GitHub/Google/etc.), shared callbacks, and session shape.
  - A small helper to generate a server-side “API access token” (if you choose to mint one).

- **NestJS auth helpers (api side)**

  - A reusable `AuthGuard` that validates requests.
  - A `RolesGuard` / `PermissionsGuard` and a `@CurrentUser()` decorator.
  - Token/session verification utilities so API modules don’t re-implement auth logic.

- **Shared contracts**

  - `AuthUser`, `SessionClaims`, `Role`/`Permission` enums/types (and optional validators).
  - A single “session user” shape used by both apps.

- **Test utilities**

  - Seed helpers to create users/sessions.
  - Token factories for e2e tests.

**Recommended request flow:**

- **Login + session management:** handled by **Next.js/Auth.js**.
- **API authorization:** handled by **NestJS guards**.

  - Option A (common): browser calls API with a **Bearer access token** minted server-side by Next (short-lived), verified by Nest.
  - Option B: API validates the **Auth.js session** (cookie/session id) by looking up the session in Prisma.

**House rules (recommended):**

- Web owns all interactive auth routes (sign-in/sign-out/callbacks).
- API never redirects to OAuth providers; it only **accepts and verifies** tokens/sessions.
- Roles/permissions are enforced in guards and kept out of controllers.

### `/packages/communications`

A shared communications package for **sending messages** (email, SMS) from both the **frontend** and **backend**, while keeping providers (Twilio/SendGrid/etc.) swappable.

**What lives here (recommended):**

- **Message contracts**

  - Common types like `EmailMessage`, `SmsMessage`, `Recipient`, `TemplateId`, `ProviderResult`.
  - Domain-specific “intents” (e.g., `InviteUserEmail`, `PasswordResetSms`) that map to templates.

- **Template + rendering layer**

  - Typed templates (variables enforced by TypeScript).
  - Rendering helpers (subject/body builders) usable in Node environments.
  - Optional: shared React email components (if you choose a React-email style approach).

- **Provider adapters (ports & adapters)**

  - Interfaces like `EmailProvider`, `SmsProvider`.
  - Implementations like `SendGridEmailProvider`, `TwilioSmsProvider` (or stubs for local dev).
  - A single `CommsService` that orchestrates sending, retries, and basic validation.

- **Preferences + compliance hooks**

  - Helpers for opt-out / unsubscribe tokens, “do not contact” checks, and quiet hours.
  - Standard metadata fields (campaign name, tags) for analytics.

- **Observability + audit utilities**

  - Consistent logging payload shape, correlation ids, and redaction helpers.
  - Optional event emitter hooks (e.g., `message.sent`, `message.failed`) for queues/workers.

**House rules (recommended):**

- Don’t call Twilio/SendGrid directly from feature code—features call `CommsService`.
- Keep secrets/config at the app level (env vars), inject providers via DI.
- Treat templates as versioned assets (changes should be reviewable and testable).

---

## Code Quality Standards

### TypeScript

All apps and packages are TypeScript-first.

- prefer strict mode
- avoid `any`
- treat types as part of the “contract” between apps and packages

### Prettier

A single Prettier config shared across the workspace.

### ESLint

- Next.js: Next + React rules
- NestJS: TypeScript + Node rules
- shared rules should live in a shared config package (`/packages/config`)

### Testing

Recommended default stack:

- **unit/integration**: Vitest (web + packages) / Jest (Nest, if desired)
- **API e2e**: SuperTest
- **web e2e** (optional): Playwright

### CI (recommended)

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

---

## Apps

All apps live under `/apps/*` and should have clear names.

Examples:

- `apps/web` — customer-facing Next.js UI
- `apps/admin` — internal admin UI
- `apps/api` — NestJS API
- `apps/cube` — CubeJS analytics API

---

## Backend Development

Backend development should be focused around **NestJS** or **CubeJS** architecture.

### NestJS house patterns (recommended)

- **Modules represent bounded contexts** (avoid a “giant app.module”).
- **Controllers are thin**, delegate to services/use-cases.
- **Validation at the edge** via DTOs + pipes.
- **Persistence behind repositories** (or at least a data-access layer) so business logic stays testable.

### Auth (recommended)

A common split for Next + Nest:

- Next.js handles login via Auth.js (OAuth / email / etc.)
- NestJS validates requests via JWT (or session) guard + roles/permissions

_(Put the shared contracts + guard utilities in **`/packages/auth`** so web + api share types and enforcement.)_

---

## Frontend Development

### Foundational frameworks

- Next.js
- Tailwind

### Forms

- React Hook Form
- Standardized Control Components (wrappers) in `/packages/ui`
- Validation should share rules/types with the backend where possible

### Data fetching

- TanStack React Query for app API fetches
- CubeJS React library for analytics fetches (if using Cube)

### Analytics components

- CubeJS React library (queries + state)
- Tremor (or Recharts) for charts
- Map stack (below)

### Map components

- **Leaflet + React-Leaflet** for map rendering
- **GeoJSON utilities** for boundaries / shapes
- **Turf.js** for geographic analysis (buffer, intersect, centroid, etc.)
- Optional:

  - Map tiles via OpenStreetMap (dev) and a provider of choice (prod)
  - Clustering for large point sets

---

## /automations (the “semantic layer”)

The purpose of `/automations` is to make “generate X” a repeatable operation.

Recommended contents:

- `generators/`

  - templates for new apps, modules, controllers, React pages, UI components

- `scripts/`

  - codegen tasks (ERD, DTOs, OpenAPI, changelog scaffolds)

- `manifests/`

  - declarative definitions for blocks, so agents can call `createBlock({ ... })`

### Examples of automations (recommended)

- `create:nest-module` — module + controller + service + test
- `create:next-page` — page + layout + API client + route tests
- `gen:contracts` — Prisma schema → class-validator DTOs
- `gen:erd` — Prisma schema → ERD docs
- `gen:openapi` — Nest swagger → OpenAPI JSON

---

## Local Dev Quickstart

### Prerequisites

- Node.js (LTS)
- PNPM
- A Neon Postgres database (or local Postgres)

### Install

```bash
pnpm install
```

### Environment variables

Create `.env` files per app, or a root `.env` (and load it from scripts).

Common env vars:

```bash
# Database
DATABASE_URL=postgresql://...

# Next.js
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Auth.js (example)
AUTH_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...

# NestJS
JWT_SECRET=...
```

### Run dev

```bash
pnpm dev
```

_(Recommended: use Turborepo to run `dev` across apps.)_

---

## Deployment Notes

### Vercel (Next.js)

- Deploy `apps/web` (and `apps/admin` if you have one)
- Configure env vars in Vercel project settings

### Dockerizing backend apps (NestJS / CubeJS)

All backend apps should be dockerized so local/prod environments behave similarly and deployments are consistent.

**Recommended approach:**

- Put a `Dockerfile` in each backend app:

  - `apps/api/Dockerfile` (NestJS)
  - `apps/cube/Dockerfile` (CubeJS)

- Use **multi-stage builds**:

  - **deps** stage: install workspace deps once
  - **build** stage: build only the target app (`pnpm -F <app> build`)
  - **run** stage: copy the built output + minimal runtime deps

- Keep runtime images small:

  - copy only `dist/`, `node_modules` (pruned if possible), and required config

- Standardize container conventions across all backend apps:

  - `PORT` env var
  - health endpoint (e.g., `GET /health` for Nest)
  - consistent `CMD` (e.g., `node dist/main.js`)

**Monorepo note:** for PNPM workspaces, prefer installing from the repo root in the Docker build context, then filtering builds to the app.

**Where this helps most:**

- Render deployments (Docker) become copy/paste consistent across API + Cube.
- Local dev parity: you can run `docker compose` and get the same behavior as prod.

### Render (NestJS / CubeJS)

- Use Docker images for `apps/api` and/or `apps/cube`
- Keep secrets in Render environment settings

**Recommended:** store deployment templates in `/deploy/`:

```txt
/deploy
  render.yaml
  vercel.md
  neon.md
```

---

## Scripts (recommended)

Add standard scripts in root `package.json`:

```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "gen:contracts": "node automations/scripts/gen-contracts.mjs",
    "gen:erd": "node automations/scripts/gen-erd.mjs"
  }
}
```

---

## Contributing

- Keep changes small and generator-friendly.
- Prefer adding a generator/template over hand-rolling one-off patterns.
- If you add a new “block type”, also add:

  - a manifest entry
  - at least one test
  - a short docs snippet

---

## License

Copyright © Trenton Davis 2026
