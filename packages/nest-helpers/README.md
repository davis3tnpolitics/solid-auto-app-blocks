# nest-helpers

Shared NestJS-focused helpers for workspace apps.

## Pagination helpers

`paginate()` parses GET query params into backend-agnostic pagination args (`offset` + `limit`) and normalized page info.

`createPaginatedResponse()` returns a standardized payload:

- `metadata`: `pageSize`, `count`, `pageCount`, `pageNumber`
- `data`: object containing `items`

### Example

```ts
import { createPaginatedResponse, paginate } from "nest-helpers";

const pagination = paginate(req.query, { defaultPageSize: 20, maxPageSize: 100 });
const [items, count] = await Promise.all([
  prisma.user.findMany({ skip: pagination.offset, take: pagination.limit }),
  prisma.user.count(),
]);

return createPaginatedResponse(items, count, pagination);
```
