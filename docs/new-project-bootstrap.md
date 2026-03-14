# New Project Bootstrap

Use this guide after creating a new repo from this template.

## 1. Install dependencies

```bash
pnpm install
```

## 2. Configure environment

Create `.env` from `.env.example` and set at least:

```bash
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
AUTH_SECRET=replace-me
AUTH_GITHUB_ID=replace-me
AUTH_GITHUB_SECRET=replace-me
JWT_SECRET=replace-me
CUBE_API_URL=http://localhost:4000
CUBE_API_TOKEN=replace-me
```

## 3. Generate database artifacts

```bash
pnpm --filter database db:generate
```

## 4. Create base apps

```bash
pnpm create:block -- --block next-app --name web --port 3000 --skip-install
pnpm create:block -- --block nest-app --name api --port 3001 --skip-install
pnpm install
```

## 5. Scaffold API + web model flows

```bash
pnpm create:block -- --block api-updator --app api --model User --skip-db-generate
pnpm create:block -- --block cube-service-updator --app api --model User --skip-db-generate
pnpm create:block -- --block next-crud-pages --app web --model User
pnpm create:block -- --block next-analytics-pages --app web --analytics-app api --model User
```

## 6. Optional: generate a customizable dashboard page

```bash
pnpm create:block -- --block next-compose-page --app web --preset dashboard-basic --model User --route dashboard --analytics-app api
```

## 7. Seed fake data

```bash
pnpm seed:fake -- --count 25 --truncate true
```

## 8. Validate quality gates

```bash
pnpm verify
pnpm smoke:template
```

## 9. Run locally

```bash
pnpm --filter api start:dev
pnpm --filter web dev -- --port 3000
```
