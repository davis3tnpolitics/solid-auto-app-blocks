# UI Library

`@workspace/ui` is the shared Shadcn-style primitives bundle for this repo. It is intentionally driven by the Next.js app at `apps/web` so the CLI can emit components into `packages/ui/components`.

### Anatomy

- `components.json`: used by the Shadcn CLI to target this package during monorepo installs.
- `styles/globals.css`: pulls in Tailwind and exports `@source` so the UI package can share classes with apps.
- `components/ui`: shared primitives.
- `components/forms`: React Hook Form-ready controls (TextField, TextareaField, SelectField, CheckboxField, etc.).
- `lib/utils.ts`: `cn` helper shared by the generated components.

### Development

```bash
pnpm --filter @workspace/ui build
pnpm --filter @workspace/ui test
pnpm --filter apps/web dlx shadcn@latest add <components>  # runs in apps/web
```

When adding components with `shadcn`, run the CLI inside `apps/web` so the Next.js framework is detected. Components land under `packages/ui/src/components`.
