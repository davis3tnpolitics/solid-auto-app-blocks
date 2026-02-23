type CubeScalar = string | number | boolean | Date | null | undefined

type CubeRow = Record<string, CubeScalar>

type CubeMemberMeta = {
  key: string
  title?: string
  shortTitle?: string
  type?: string
}

type CubeResultMeta = {
  dimensions?: CubeMemberMeta[]
  measures?: CubeMemberMeta[]
  timeDimensions?: CubeMemberMeta[]
}

type CubeResultInput = {
  rows: CubeRow[]
  meta?: CubeResultMeta
}

type SortDirection = "asc" | "desc"

type Granularity = "hour" | "day" | "week" | "month" | "quarter" | "year"

type ChartDataRow = Record<string, string | number>

type SingleSeriesCategoricalAdapterOptions = {
  dimensionKey: string
  measureKey: string
  indexKey?: string
  valueKey?: string
  nullCategoryLabel?: string
  measureFallback?: number
  sortBy?: "category" | "value" | "none"
  sortDirection?: SortDirection
}

type SingleSeriesCategoricalAdapterResult = {
  data: ChartDataRow[]
  indexKey: string
  categories: [string]
  valueKey: string
  meta?: CubeResultMeta
}

type SeriesDescriptor = {
  key: string
  label: string
}

type MultiSeriesCategoricalAdapterOptions = {
  categoryKey: string
  seriesKey: string
  measureKey: string
  indexKey?: string
  nullCategoryLabel?: string
  nullSeriesLabel?: string
  measureFallback?: number
  sortBy?: "category" | "total" | "none"
  sortDirection?: SortDirection
}

type MultiSeriesCategoricalAdapterResult = {
  data: ChartDataRow[]
  indexKey: string
  categories: string[]
  series: SeriesDescriptor[]
  meta?: CubeResultMeta
}

type TimeSeriesAdapterOptions = {
  timeDimensionKey: string
  measureKey: string
  indexKey?: string
  valueKey?: string
  granularity?: Granularity
  missingBucketLabel?: string
  measureFallback?: number
  sortDirection?: SortDirection
}

type TimeSeriesAdapterResult = {
  data: ChartDataRow[]
  indexKey: string
  categories: [string]
  valueKey: string
  granularity: Granularity
  meta?: CubeResultMeta
}

type StackedSegmentAdapterOptions = {
  categoryKey: string
  segmentKey: string
  measureKey: string
  indexKey?: string
  nullCategoryLabel?: string
  nullSegmentLabel?: string
  measureFallback?: number
  sortBy?: "category" | "total" | "none"
  sortDirection?: SortDirection
}

type StackedSegment = {
  category: string
  segment: string
  value: number
}

type StackedSegmentAdapterResult = {
  data: ChartDataRow[]
  indexKey: string
  categories: string[]
  segments: StackedSegment[]
  meta?: CubeResultMeta
}

type TableListAdapterOptions = {
  columns?: string[]
  numericColumns?: string[]
  dateColumns?: string[]
  stringFallback?: string
  numberFallback?: number
  sortBy?: string
  sortDirection?: SortDirection
}

type TableListRow = Record<string, string | number | boolean | null>

type TableListAdapterResult = {
  columns: string[]
  rows: TableListRow[]
  meta?: CubeResultMeta
}

type TimeBucketResult = {
  bucket: string
  order: number
}

type NameValuePair = {
  name: string
  value: number
}

function extractDimensionValue(
  row: CubeRow,
  key: string,
  fallback = "Unknown"
): string {
  const value = row[key]
  if (value === null || value === undefined || value === "") {
    return fallback
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return String(value)
}

function parseMeasureValue(value: CubeScalar, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback
  }

  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim()
    if (!normalized.length) {
      return fallback
    }
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0
  }

  return fallback
}

function toUtcDate(value: CubeScalar): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0")
}

function getIsoWeek(date: Date): { year: number; week: number } {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const week = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  )
  return { year: utcDate.getUTCFullYear(), week }
}

function normalizeTimeBucket(
  value: CubeScalar,
  granularity: Granularity = "day",
  fallback = "Unknown"
): TimeBucketResult {
  const date = toUtcDate(value)
  if (!date) {
    return {
      bucket: fallback,
      order: Number.POSITIVE_INFINITY,
    }
  }

  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const hour = date.getUTCHours()
  const quarter = Math.floor((month - 1) / 3) + 1

  if (granularity === "hour") {
    const bucket = `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:00`
    return { bucket, order: date.getTime() }
  }

  if (granularity === "day") {
    const bucket = `${year}-${pad2(month)}-${pad2(day)}`
    return { bucket, order: Date.UTC(year, month - 1, day) }
  }

  if (granularity === "week") {
    const isoWeek = getIsoWeek(date)
    return {
      bucket: `${isoWeek.year}-W${pad2(isoWeek.week)}`,
      order: date.getTime(),
    }
  }

  if (granularity === "month") {
    return {
      bucket: `${year}-${pad2(month)}`,
      order: Date.UTC(year, month - 1, 1),
    }
  }

  if (granularity === "quarter") {
    return {
      bucket: `${year}-Q${quarter}`,
      order: Date.UTC(year, (quarter - 1) * 3, 1),
    }
  }

  return {
    bucket: `${year}`,
    order: Date.UTC(year, 0, 1),
  }
}

function toDeterministicSeriesKey(label: string, used: Set<string>): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

  const base = normalized || "series"
  if (!used.has(base)) {
    used.add(base)
    return base
  }

  let suffix = 2
  let nextKey = `${base}_${suffix}`
  while (used.has(nextKey)) {
    suffix += 1
    nextKey = `${base}_${suffix}`
  }

  used.add(nextKey)
  return nextKey
}

function sortDirectionFactor(sortDirection: SortDirection = "asc"): 1 | -1 {
  return sortDirection === "asc" ? 1 : -1
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en", { sensitivity: "base" })
}

function adaptCubeSingleSeriesCategorical(
  input: CubeResultInput,
  options: SingleSeriesCategoricalAdapterOptions
): SingleSeriesCategoricalAdapterResult {
  const indexKey = options.indexKey ?? "category"
  const valueKey = options.valueKey ?? "value"
  const nullCategoryLabel = options.nullCategoryLabel ?? "Unknown"
  const measureFallback = options.measureFallback ?? 0
  const sortBy = options.sortBy ?? "category"
  const direction = sortDirectionFactor(options.sortDirection)

  const data = input.rows.map((row) => {
    const category = extractDimensionValue(
      row,
      options.dimensionKey,
      nullCategoryLabel
    )
    const value = parseMeasureValue(row[options.measureKey], measureFallback)
    return {
      [indexKey]: category,
      [valueKey]: value,
    }
  })

  if (sortBy !== "none") {
    data.sort((left, right) => {
      const leftCategory = String(left[indexKey] ?? "")
      const rightCategory = String(right[indexKey] ?? "")
      if (sortBy === "value") {
        const numericDiff =
          Number(left[valueKey] ?? 0) - Number(right[valueKey] ?? 0)
        if (numericDiff !== 0) {
          return numericDiff * direction
        }
        return compareText(leftCategory, rightCategory)
      }
      return compareText(leftCategory, rightCategory) * direction
    })
  }

  return {
    data,
    indexKey,
    categories: [valueKey],
    valueKey,
    meta: input.meta,
  }
}

function createSeriesDescriptors(
  labels: string[],
  nullSeriesLabel: string
): SeriesDescriptor[] {
  const used = new Set<string>()
  const uniqueLabels = Array.from(
    new Set(labels.map((value) => value || nullSeriesLabel))
  )

  return uniqueLabels
    .sort(compareText)
    .map((label) => ({
      label,
      key: toDeterministicSeriesKey(label, used),
    }))
}

function adaptCubeMultiSeriesCategorical(
  input: CubeResultInput,
  options: MultiSeriesCategoricalAdapterOptions
): MultiSeriesCategoricalAdapterResult {
  const indexKey = options.indexKey ?? "category"
  const nullCategoryLabel = options.nullCategoryLabel ?? "Unknown"
  const nullSeriesLabel = options.nullSeriesLabel ?? "Uncategorized"
  const measureFallback = options.measureFallback ?? 0
  const sortBy = options.sortBy ?? "category"
  const direction = sortDirectionFactor(options.sortDirection)

  const normalizedRows = input.rows.map((row) => ({
    category: extractDimensionValue(row, options.categoryKey, nullCategoryLabel),
    seriesLabel: extractDimensionValue(row, options.seriesKey, nullSeriesLabel),
    value: parseMeasureValue(row[options.measureKey], measureFallback),
  }))

  const descriptors = createSeriesDescriptors(
    normalizedRows.map((row) => row.seriesLabel),
    nullSeriesLabel
  )
  const labelToKey = new Map(
    descriptors.map((descriptor) => [descriptor.label, descriptor.key])
  )

  const byCategory = new Map<string, ChartDataRow>()
  for (const item of normalizedRows) {
    const current = byCategory.get(item.category) ?? { [indexKey]: item.category }
    const key = labelToKey.get(item.seriesLabel) ?? "series"
    const previous = parseMeasureValue(current[key], 0)
    current[key] = previous + item.value
    byCategory.set(item.category, current)
  }

  const categoryKeys = descriptors.map((descriptor) => descriptor.key)
  const data = Array.from(byCategory.values()).map((row) => {
    const next: ChartDataRow = { [indexKey]: String(row[indexKey]) }
    for (const key of categoryKeys) {
      next[key] = parseMeasureValue(row[key], 0)
    }
    return next
  })

  if (sortBy !== "none") {
    data.sort((left, right) => {
      const leftCategory = String(left[indexKey] ?? "")
      const rightCategory = String(right[indexKey] ?? "")
      if (sortBy === "total") {
        const leftTotal = categoryKeys.reduce(
          (total, key) => total + parseMeasureValue(left[key], 0),
          0
        )
        const rightTotal = categoryKeys.reduce(
          (total, key) => total + parseMeasureValue(right[key], 0),
          0
        )
        if (leftTotal !== rightTotal) {
          return (leftTotal - rightTotal) * direction
        }
      }
      return compareText(leftCategory, rightCategory) * direction
    })
  }

  return {
    data,
    indexKey,
    categories: categoryKeys,
    series: descriptors,
    meta: input.meta,
  }
}

function adaptCubeTimeSeries(
  input: CubeResultInput,
  options: TimeSeriesAdapterOptions
): TimeSeriesAdapterResult {
  const indexKey = options.indexKey ?? "bucket"
  const valueKey = options.valueKey ?? "value"
  const granularity = options.granularity ?? "day"
  const missingBucketLabel = options.missingBucketLabel ?? "Unknown"
  const measureFallback = options.measureFallback ?? 0
  const direction = sortDirectionFactor(options.sortDirection)

  const grouped = new Map<string, { bucket: string; order: number; value: number }>()

  for (const row of input.rows) {
    const normalized = normalizeTimeBucket(
      row[options.timeDimensionKey],
      granularity,
      missingBucketLabel
    )
    const value = parseMeasureValue(row[options.measureKey], measureFallback)
    const current = grouped.get(normalized.bucket)
    if (current) {
      current.value += value
      current.order = Math.min(current.order, normalized.order)
      continue
    }

    grouped.set(normalized.bucket, {
      bucket: normalized.bucket,
      order: normalized.order,
      value,
    })
  }

  const data = Array.from(grouped.values())
    .sort((left, right) => {
      const leftOrder = left.order
      const rightOrder = right.order
      if (leftOrder !== rightOrder) {
        return (leftOrder - rightOrder) * direction
      }
      return compareText(left.bucket, right.bucket) * direction
    })
    .map((row) => ({
      [indexKey]: row.bucket,
      [valueKey]: row.value,
    }))

  return {
    data,
    indexKey,
    categories: [valueKey],
    valueKey,
    granularity,
    meta: input.meta,
  }
}

function adaptCubeStackedSegments(
  input: CubeResultInput,
  options: StackedSegmentAdapterOptions
): StackedSegmentAdapterResult {
  const grouped = adaptCubeMultiSeriesCategorical(input, {
    categoryKey: options.categoryKey,
    seriesKey: options.segmentKey,
    measureKey: options.measureKey,
    indexKey: options.indexKey,
    nullCategoryLabel: options.nullCategoryLabel,
    nullSeriesLabel: options.nullSegmentLabel,
    measureFallback: options.measureFallback,
    sortBy: options.sortBy,
    sortDirection: options.sortDirection,
  })

  const segments: StackedSegment[] = grouped.data.flatMap((row) => {
    const category = String(row[grouped.indexKey] ?? "")
    return grouped.series.map((descriptor) => ({
      category,
      segment: descriptor.label,
      value: parseMeasureValue(row[descriptor.key], 0),
    }))
  })

  return {
    data: grouped.data,
    indexKey: grouped.indexKey,
    categories: grouped.categories,
    segments,
    meta: grouped.meta,
  }
}

function getSortedColumns(input: CubeResultInput, preferredColumns?: string[]): string[] {
  if (preferredColumns?.length) {
    return [...preferredColumns]
  }

  const columns = new Set<string>()
  for (const row of input.rows) {
    for (const key of Object.keys(row)) {
      columns.add(key)
    }
  }
  return Array.from(columns).sort(compareText)
}

function normalizeTableValue(
  value: CubeScalar,
  isNumeric: boolean,
  isDate: boolean,
  stringFallback: string,
  numberFallback: number
): string | number | boolean | null {
  if (isNumeric) {
    return parseMeasureValue(value, numberFallback)
  }

  if (isDate) {
    return normalizeTimeBucket(value, "day", stringFallback).bucket
  }

  if (value === null || value === undefined || value === "") {
    return stringFallback
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }

  return null
}

function adaptCubeTableList(
  input: CubeResultInput,
  options: TableListAdapterOptions = {}
): TableListAdapterResult {
  const columns = getSortedColumns(input, options.columns)
  const numeric = new Set(options.numericColumns ?? [])
  const dates = new Set(options.dateColumns ?? [])
  const stringFallback = options.stringFallback ?? ""
  const numberFallback = options.numberFallback ?? 0

  const rows = input.rows.map((row) => {
    const normalized: TableListRow = {}
    for (const column of columns) {
      normalized[column] = normalizeTableValue(
        row[column],
        numeric.has(column),
        dates.has(column),
        stringFallback,
        numberFallback
      )
    }
    return normalized
  })

  if (options.sortBy) {
    const direction = sortDirectionFactor(options.sortDirection)
    const sortColumn = options.sortBy
    rows.sort((left, right) => {
      const leftValue = left[sortColumn]
      const rightValue = right[sortColumn]

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction
      }

      return compareText(String(leftValue ?? ""), String(rightValue ?? "")) * direction
    })
  }

  return {
    columns,
    rows,
    meta: input.meta,
  }
}

function toNameValuePairs(
  result: SingleSeriesCategoricalAdapterResult,
  options: {
    nameKey?: string
    valueKey?: string
  } = {}
): NameValuePair[] {
  const nameKey = options.nameKey ?? result.indexKey
  const valueKey = options.valueKey ?? result.valueKey
  return result.data.map((row) => ({
    name: String(row[nameKey] ?? ""),
    value: parseMeasureValue(row[valueKey], 0),
  }))
}

function toCategoryBarValues(result: StackedSegmentAdapterResult): number[] {
  return result.data.map((row) =>
    result.categories.reduce(
      (sum, categoryKey) => sum + parseMeasureValue(row[categoryKey], 0),
      0
    )
  )
}

export type {
  CubeMemberMeta,
  CubeResultInput,
  CubeResultMeta,
  CubeRow,
  CubeScalar,
  Granularity,
  MultiSeriesCategoricalAdapterOptions,
  MultiSeriesCategoricalAdapterResult,
  NameValuePair,
  SeriesDescriptor,
  SingleSeriesCategoricalAdapterOptions,
  SingleSeriesCategoricalAdapterResult,
  SortDirection,
  StackedSegment,
  StackedSegmentAdapterOptions,
  StackedSegmentAdapterResult,
  TableListAdapterOptions,
  TableListAdapterResult,
  TableListRow,
  TimeSeriesAdapterOptions,
  TimeSeriesAdapterResult,
}

export {
  adaptCubeMultiSeriesCategorical,
  adaptCubeSingleSeriesCategorical,
  adaptCubeStackedSegments,
  adaptCubeTableList,
  adaptCubeTimeSeries,
  extractDimensionValue,
  normalizeTimeBucket,
  parseMeasureValue,
  toCategoryBarValues,
  toNameValuePairs,
}
