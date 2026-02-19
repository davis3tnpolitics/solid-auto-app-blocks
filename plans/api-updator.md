### SLICE 1 (done)

- Added `automations/generators/api-updator.js` + manifest to scaffold CRUD Nest resources from Prisma contracts:
  - runs `pnpm --filter database db:generate`
  - shells `nest g resource` (or falls back) and rewrites DTOs/entities/controllers/services/modules with Swagger annotations + PrismaService wiring
  - DTOs are derived from contracts while honoring Prisma create/update input types; respects `/*_ no-auto-update _*/` when present

### SLICE 2

1. add a helper component in the nest-helpers package that creates standardized pagination. There should be two things you take care of with this:

- a paginate function that works with GET endpoints to paginate based on the submitted params
- pagination api responses should have a metadata object and then a data object
  - metadata should have pageSize, count, pageCount, and pageNumber
- Plan a POST `/search` generator for all data types:
  - build a shared search DTO generator (per model) that inspects Prisma metadata and emits filter/sort/pagination DTOs with class-validator decorators
  - generator should create a `/search` controller route + service method that uses the DTO to construct Prisma queries (filters, pagination, ordering) and returns typed results with metadata
  - avoid touching files marked with `/*_ no-auto-update _*/`, and expose flags to target specific models so the route can be added alongside the CRUD generator
