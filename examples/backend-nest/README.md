# Backend Example (NestJS)

Run from repo root.

Preferred:

```bash
pnpm gen:examples
```

Generate backend only (manual):

```bash
pnpm create:nest-app -- --name example-api --port 3101
```

Run:

```bash
pnpm --filter example-api start:dev
```

Add a generated resource with pagination DTO wiring:

```bash
pnpm update:api -- --app example-api --model User
```

Smoke test:

```bash
curl "http://localhost:3101/users?pageNumber=1&pageSize=10"
```
