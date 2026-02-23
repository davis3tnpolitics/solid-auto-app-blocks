# UI Library

`@workspace/ui` is the shared Shadcn-style primitives bundle for this repo. It is intentionally driven by the Next.js app at `apps/web` so the CLI can emit components into `packages/ui/components`.

### Anatomy

- `components.json`: used by the Shadcn CLI to target this package during monorepo installs.
- `styles/globals.css`: pulls in Tailwind and exports `@source` so the UI package can share classes with apps.
- `components/ui`: shared primitives.
- `components/forms`: React Hook Form-ready controls (TextField, TextareaField, SelectField, CheckboxField, etc.).
- `components/charts`: chart wrappers with consistent loading/empty/card behavior.
- `lib/utils.ts`: `cn` helper shared by the generated components.
- `lib/cubejs-adapters.ts`: typed CubeJS response adapters for chart-ready data.

### CubeJS adapter entrypoints

Import from either:

- `@workspace/ui` (re-exported)
- `@workspace/ui/lib/cubejs-adapters`

Primary adapters:

- `adaptCubeSingleSeriesCategorical`
- `adaptCubeMultiSeriesCategorical`
- `adaptCubeTimeSeries`
- `adaptCubeStackedSegments`
- `adaptCubeTableList`

Helpers:

- `extractDimensionValue`
- `parseMeasureValue`
- `normalizeTimeBucket`
- `toNameValuePairs`
- `toCategoryBarValues`

Example:

```ts
import {
  adaptCubeMultiSeriesCategorical,
  BarChartCard,
} from "@workspace/ui"

const adapted = adaptCubeMultiSeriesCategorical(
  {
    rows: cubeRows,
    meta: cubeMeta,
  },
  {
    categoryKey: "Orders.region",
    seriesKey: "Orders.status",
    measureKey: "Orders.count",
  }
)

// <BarChartCard data={adapted.data} index={adapted.indexKey} categories={adapted.categories} />
```

### Development

```bash
pnpm --filter @workspace/ui build
pnpm --filter @workspace/ui test
pnpm --filter @workspace/ui test:coverage
pnpm --filter apps/web dlx shadcn@latest add <components>  # runs in apps/web
```

When adding components with `shadcn`, run the CLI inside `apps/web` so the Next.js framework is detected. Components land under `packages/ui/src/components`.
