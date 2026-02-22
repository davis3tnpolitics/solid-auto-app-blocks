type QueryNumberLike = number | `${number}` | null | undefined;
type QueryValue = QueryNumberLike | QueryNumberLike[];

export interface PaginationQueryParams {
  page?: QueryValue;
  pageNumber?: QueryValue;
  pageSize?: QueryValue;
  limit?: QueryValue;
  offset?: QueryValue;
}

export interface PaginationOptions {
  defaultPageNumber?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}

export interface PaginationParams {
  pageNumber: number;
  pageSize: number;
  offset: number;
  limit: number;
}

export interface PaginationMetadata {
  pageSize: number;
  count: number;
  pageCount: number;
  pageNumber: number;
}

export interface PaginatedData<T> {
  items: T[];
}

export interface PaginatedResponse<T> {
  metadata: PaginationMetadata;
  data: PaginatedData<T>;
}

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_MAX_PAGE_SIZE = 100;

export function paginate(
  query: PaginationQueryParams = {},
  options: PaginationOptions = {}
): PaginationParams {
  const defaultPageNumber = ensurePositiveInt(options.defaultPageNumber, DEFAULT_PAGE_NUMBER);
  const defaultPageSize = ensurePositiveInt(options.defaultPageSize, DEFAULT_PAGE_SIZE);
  const maxPageSize = ensurePositiveInt(options.maxPageSize, DEFAULT_MAX_PAGE_SIZE);

  const rawPageNumber = firstDefined(query.pageNumber, query.page);
  const rawPageSize = firstDefined(query.pageSize, query.limit);
  const explicitOffset = coerceNonNegativeInt(query.offset);

  let pageSize = coercePositiveInt(rawPageSize, defaultPageSize);
  pageSize = Math.min(pageSize, maxPageSize);

  let pageNumber = coercePositiveInt(rawPageNumber, defaultPageNumber);

  const offset = explicitOffset ?? (pageNumber > 0 ? (pageNumber - 1) * pageSize : 0);

  if (explicitOffset !== null && rawPageNumber === undefined) {
    pageNumber = Math.floor(explicitOffset / pageSize) + 1;
  }

  return {
    pageNumber,
    pageSize,
    offset,
    limit: pageSize,
  };
}

export function createPaginationMetadata(
  count: number,
  pagination: Pick<PaginationParams, "pageNumber" | "pageSize">
): PaginationMetadata {
  const safeCount = count < 0 ? 0 : Math.floor(count);
  const safePageSize = ensurePositiveInt(pagination.pageSize, DEFAULT_PAGE_SIZE);
  const safePageNumber = ensurePositiveInt(
    pagination.pageNumber,
    DEFAULT_PAGE_NUMBER
  );

  return {
    pageSize: safePageSize,
    count: safeCount,
    pageCount: Math.ceil(safeCount / safePageSize),
    pageNumber: safePageNumber,
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  count: number,
  pagination: Pick<PaginationParams, "pageNumber" | "pageSize">
): PaginatedResponse<T> {
  return {
    metadata: createPaginationMetadata(count, pagination),
    data: {
      items,
    },
  };
}

function firstDefined(...values: QueryValue[]): QueryValue | undefined {
  return values.find((value) => value !== undefined);
}

function coercePositiveInt(value: QueryValue, fallback: number): number {
  const normalized = normalizeQueryValue(value);
  if (normalized === null) return fallback;

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;

  return parsed;
}

function coerceNonNegativeInt(value: QueryValue): number | null {
  const normalized = normalizeQueryValue(value);
  if (normalized === null) return null;

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;

  return parsed;
}

function normalizeQueryValue(value: QueryValue): string | null {
  if (value === undefined || value === null) return null;

  if (Array.isArray(value)) {
    const first = value.find((entry) => entry !== undefined && entry !== null);
    if (first === undefined || first === null) return null;
    return String(first);
  }

  return String(value);
}

function ensurePositiveInt(value: number | undefined, fallback: number): number {
  if (typeof value !== "number") return fallback;
  if (!Number.isFinite(value) || value < 1) return fallback;

  return Math.floor(value);
}
