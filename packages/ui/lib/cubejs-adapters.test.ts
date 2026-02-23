import {
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
} from "./cubejs-adapters"

describe("cubejs adapters", () => {
  it("extracts dimensions with fallback handling", () => {
    const row = {
      label: "",
      date: new Date("2026-01-02T10:00:00.000Z"),
    }

    expect(extractDimensionValue(row, "label", "N/A")).toBe("N/A")
    expect(extractDimensionValue(row, "date")).toBe("2026-01-02T10:00:00.000Z")
  })

  it("parses measure values from mixed scalar types", () => {
    expect(parseMeasureValue(42)).toBe(42)
    expect(parseMeasureValue("1,024.25")).toBe(1024.25)
    expect(parseMeasureValue(true)).toBe(1)
    expect(parseMeasureValue("not-a-number", 7)).toBe(7)
    expect(parseMeasureValue(undefined, 3)).toBe(3)
  })

  it("normalizes time buckets by granularity", () => {
    expect(normalizeTimeBucket("2026-02-10", "day")).toEqual({
      bucket: "2026-02-10",
      order: Date.UTC(2026, 1, 10),
    })
    expect(normalizeTimeBucket("2026-02-10T12:30:00Z", "hour").bucket).toBe(
      "2026-02-10T12:00"
    )
    expect(normalizeTimeBucket("2026-02-10", "quarter").bucket).toBe("2026-Q1")
    expect(normalizeTimeBucket("invalid", "day", "Unknown")).toEqual({
      bucket: "Unknown",
      order: Number.POSITIVE_INFINITY,
    })
  })

  it("adapts single-series categorical data with deterministic sorting", () => {
    const result = adaptCubeSingleSeriesCategorical(
      {
        rows: [
          { segment: "Retail", revenue: "100" },
          { segment: "Enterprise", revenue: "300" },
          { segment: null, revenue: undefined },
        ],
      },
      {
        dimensionKey: "segment",
        measureKey: "revenue",
      }
    )

    expect(result.indexKey).toBe("category")
    expect(result.categories).toEqual(["value"])
    expect(result.data).toEqual([
      { category: "Enterprise", value: 300 },
      { category: "Retail", value: 100 },
      { category: "Unknown", value: 0 },
    ])
  })

  it("supports single-series sorting by value in descending order", () => {
    const result = adaptCubeSingleSeriesCategorical(
      {
        rows: [
          { segment: "A", amount: 1 },
          { segment: "B", amount: 9 },
          { segment: "C", amount: "2" },
        ],
      },
      {
        dimensionKey: "segment",
        measureKey: "amount",
        sortBy: "value",
        sortDirection: "desc",
        indexKey: "name",
        valueKey: "count",
      }
    )

    expect(result.data).toEqual([
      { name: "B", count: 9 },
      { name: "C", count: 2 },
      { name: "A", count: 1 },
    ])
  })

  it("adapts and groups multi-series categorical data", () => {
    const result = adaptCubeMultiSeriesCategorical(
      {
        rows: [
          { channel: "North", metric: "Net Profit", value: "10" },
          { channel: "North", metric: "net-profit", value: 5 },
          { channel: "South", metric: "Net Profit", value: 20 },
          { channel: "South", metric: "Gross Margin", value: 11 },
        ],
      },
      {
        categoryKey: "channel",
        seriesKey: "metric",
        measureKey: "value",
      }
    )

    expect(result.series).toEqual([
      { label: "Gross Margin", key: "gross_margin" },
      { label: "Net Profit", key: "net_profit" },
      { label: "net-profit", key: "net_profit_2" },
    ])
    expect(result.data).toEqual([
      { category: "North", gross_margin: 0, net_profit: 10, net_profit_2: 5 },
      { category: "South", gross_margin: 11, net_profit: 20, net_profit_2: 0 },
    ])
  })

  it("sorts multi-series rows by total when requested", () => {
    const result = adaptCubeMultiSeriesCategorical(
      {
        rows: [
          { label: "A", group: "x", value: 2 },
          { label: "B", group: "x", value: 6 },
          { label: "B", group: "y", value: 6 },
        ],
      },
      {
        categoryKey: "label",
        seriesKey: "group",
        measureKey: "value",
        sortBy: "total",
        sortDirection: "desc",
      }
    )

    expect(result.data.map((row) => row.category)).toEqual(["B", "A"])
  })

  it("adapts time-series data with bucket aggregation", () => {
    const result = adaptCubeTimeSeries(
      {
        rows: [
          { bucket: "2026-01-01T08:00:00Z", amount: "2" },
          { bucket: "2026-01-01T10:00:00Z", amount: 3 },
          { bucket: "2026-01-02T00:00:00Z", amount: 5 },
        ],
      },
      {
        timeDimensionKey: "bucket",
        measureKey: "amount",
        granularity: "day",
      }
    )

    expect(result.data).toEqual([
      { bucket: "2026-01-01", value: 5 },
      { bucket: "2026-01-02", value: 5 },
    ])
    expect(result.granularity).toBe("day")
  })

  it("adapts stacked segments and exposes flat segments list", () => {
    const result = adaptCubeStackedSegments(
      {
        rows: [
          { region: "East", status: "Active", count: 4 },
          { region: "East", status: "Pending", count: "3" },
          { region: "West", status: "Active", count: 2 },
        ],
      },
      {
        categoryKey: "region",
        segmentKey: "status",
        measureKey: "count",
      }
    )

    expect(result.categories).toEqual(["active", "pending"])
    expect(result.segments).toContainEqual({
      category: "East",
      segment: "Active",
      value: 4,
    })
    expect(result.segments).toContainEqual({
      category: "West",
      segment: "Pending",
      value: 0,
    })
  })

  it("adapts table/list rows with typed coercion and sorting", () => {
    const result = adaptCubeTableList(
      {
        rows: [
          { label: "B", total: "5", at: "2026-01-02T00:00:00Z", ok: true },
          { label: "A", total: null, at: "2026-01-01T00:00:00Z", ok: false },
        ],
      },
      {
        numericColumns: ["total"],
        dateColumns: ["at"],
        sortBy: "label",
      }
    )

    expect(result.columns).toEqual(["at", "label", "ok", "total"])
    expect(result.rows).toEqual([
      { at: "2026-01-01", label: "A", ok: false, total: 0 },
      { at: "2026-01-02", label: "B", ok: true, total: 5 },
    ])
  })

  it("converts adapted single-series output to name/value pairs", () => {
    const single = adaptCubeSingleSeriesCategorical(
      {
        rows: [{ label: "Open", value: 7 }],
      },
      {
        dimensionKey: "label",
        measureKey: "value",
        indexKey: "name",
      }
    )

    expect(toNameValuePairs(single)).toEqual([{ name: "Open", value: 7 }])
  })

  it("converts stacked output to category bar totals", () => {
    const stacked = adaptCubeStackedSegments(
      {
        rows: [
          { category: "A", stage: "x", value: 1 },
          { category: "A", stage: "y", value: 2 },
          { category: "B", stage: "x", value: 3 },
        ],
      },
      {
        categoryKey: "category",
        segmentKey: "stage",
        measureKey: "value",
      }
    )

    expect(toCategoryBarValues(stacked)).toEqual([3, 3])
  })
})
