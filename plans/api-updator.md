### SLICE 1 (done)

- Added `automations/generators/api-updator.js` + manifest to scaffold CRUD Nest resources from Prisma contracts:
  - runs `pnpm --filter database db:generate`
  - shells `nest g resource` (or falls back) and rewrites DTOs/entities/controllers/services/modules with Swagger annotations + PrismaService wiring
  - DTOs are derived from contracts while honoring Prisma create/update input types; respects `/*_ no-auto-update _*/` when present

### SLICE 2 (done on February 23, 2026)

Implemented pagination helpers in `packages/nest-helpers` and wired the generator to use them:

- `paginate(query)` for GET/search pagination parsing
- `createPaginatedResponse(items, count, pagination)` response shape with:
  - `metadata.pageSize`
  - `metadata.count`
  - `metadata.pageCount`
  - `metadata.pageNumber`
  - `data.items`

Implemented default `POST /search` generation in `api-updator`:

- model-specific search DTO generation with class-validator decorators
- controller route generation (`@Post("search")`)
- service `search` method with Prisma `where` + `orderBy` + pagination integration
- flags for model targeting and `--search false`
- no-auto-update safeguards remain enforced

Coverage added/updated:

- `automations/tests/test/e2e/create-block.smoke.test.js`
- `automations/tests/test/unit/pagination.unit.test.js`
- `automations/tests/test/contracts/generator-contracts.snapshot.test.js`
