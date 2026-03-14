const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCubeService,
  createDateBucketGranularities,
  createDefaultDimensions,
  createDefaultMeasures,
  createDefaultPreAggregations,
  createDefaultTimeDimensions,
  createGroupedAggregationProfile,
  normalizeTimeWindow,
} = require("../dist");

test("buildCubeService returns the provided schema object unchanged", () => {
  const schema = {
    cube: "Users",
    sqlTable: "public.users",
    dimensions: [],
    timeDimensions: [],
    measures: [],
  };

  const result = buildCubeService(schema);
  assert.equal(result, schema);
});

test("createDefaultDimensions returns the same dimensions reference", () => {
  const dimensions = [{ name: "id", type: "string", primaryKey: true }];
  const result = createDefaultDimensions(dimensions);
  assert.equal(result, dimensions);
});

test("createDefaultTimeDimensions uses default granularities", () => {
  const result = createDefaultTimeDimensions(["createdAt"]);
  assert.deepEqual(result, [
    { name: "createdAt", granularities: ["day", "week", "month"] },
  ]);
});

test("createDefaultTimeDimensions supports explicit granularities", () => {
  const result = createDefaultTimeDimensions(["createdAt"], ["day", "month", "year"]);
  assert.deepEqual(result, [
    { name: "createdAt", granularities: ["day", "month", "year"] },
  ]);
});

test("createDefaultMeasures builds count + numeric measure families", () => {
  const result = createDefaultMeasures({
    numericFields: ["total_revenue", "avg-score"],
  });

  assert.deepEqual(
    result.map((entry) => entry.name),
    [
      "count",
      "sumTotalRevenue",
      "avgTotalRevenue",
      "minTotalRevenue",
      "maxTotalRevenue",
      "totalTotalRevenue",
      "sumAvgScore",
      "avgAvgScore",
      "minAvgScore",
      "maxAvgScore",
      "totalAvgScore",
    ]
  );
});

test("createDefaultMeasures respects includeCount/includeTotals flags", () => {
  const result = createDefaultMeasures({
    numericFields: ["amount"],
    includeCount: false,
    includeTotals: false,
  });

  assert.deepEqual(
    result.map((entry) => entry.name),
    ["sumAmount", "avgAmount", "minAmount", "maxAmount"]
  );
});

test("createDefaultMeasures supports empty numeric fields when count is disabled", () => {
  const result = createDefaultMeasures({
    numericFields: [],
    includeCount: false,
  });

  assert.deepEqual(result, []);
});

test("createDefaultPreAggregations returns empty list when timeDimension is missing", () => {
  const result = createDefaultPreAggregations({
    measureNames: ["count"],
  });

  assert.deepEqual(result, []);
});

test("createDefaultPreAggregations builds rollups for each granularity", () => {
  const result = createDefaultPreAggregations({
    timeDimension: "createdAt",
    measureNames: ["count", "sumAmount"],
    granularities: ["week", "month"],
  });

  assert.deepEqual(result, [
    {
      name: "createdAt_week_rollup",
      type: "rollup",
      measures: ["count", "sumAmount"],
      timeDimension: "createdAt",
      granularity: "week",
    },
    {
      name: "createdAt_month_rollup",
      type: "rollup",
      measures: ["count", "sumAmount"],
      timeDimension: "createdAt",
      granularity: "month",
    },
  ]);
});

test("createGroupedAggregationProfile applies defaults and overrides", () => {
  const withDefaults = createGroupedAggregationProfile({
    dimension: "status",
    measures: ["count"],
  });
  assert.deepEqual(withDefaults, {
    dimension: "status",
    measures: ["count"],
    order: "desc",
    limit: 50,
  });

  const withOverrides = createGroupedAggregationProfile({
    dimension: "country",
    measures: ["sumRevenue"],
    order: "asc",
    limit: 10,
  });
  assert.deepEqual(withOverrides, {
    dimension: "country",
    measures: ["sumRevenue"],
    order: "asc",
    limit: 10,
  });
});

test("createDateBucketGranularities handles hour/quarter options deterministically", () => {
  assert.deepEqual(createDateBucketGranularities(), ["day", "week", "month", "year"]);
  assert.deepEqual(createDateBucketGranularities({ includeHour: true }), [
    "hour",
    "day",
    "week",
    "month",
    "year",
  ]);
  assert.deepEqual(createDateBucketGranularities({ includeQuarter: true }), [
    "day",
    "week",
    "month",
    "quarter",
    "year",
  ]);
  assert.deepEqual(
    createDateBucketGranularities({ includeHour: true, includeQuarter: true }),
    ["hour", "day", "week", "month", "quarter", "year"]
  );
});

test("normalizeTimeWindow validates required fields", () => {
  assert.equal(normalizeTimeWindow(), null);
  assert.equal(normalizeTimeWindow({ from: "2026-01-01" }), null);
  assert.equal(normalizeTimeWindow({ to: "2026-12-31" }), null);

  assert.deepEqual(
    normalizeTimeWindow({
      from: "2026-01-01",
      to: "2026-12-31",
      preset: "last-12-months",
    }),
    {
      from: "2026-01-01",
      to: "2026-12-31",
      preset: "last-12-months",
    }
  );
});

