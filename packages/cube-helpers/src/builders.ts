import type {
  CubeDimensionDefinition,
  CubeMeasureDefinition,
  CubePreAggregationDefinition,
  CubeServiceSchema,
  CubeTimeDimensionDefinition,
  TimeGranularity,
} from "./types";

function toPascalCase(value: string): string {
  const camel = String(value)
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^(.)/, (char) => char.toUpperCase());
  return camel;
}

export function buildCubeService(schema: CubeServiceSchema): CubeServiceSchema {
  return schema;
}

export function createDefaultDimensions(
  dimensions: CubeDimensionDefinition[]
): CubeDimensionDefinition[] {
  return dimensions;
}

export function createDefaultTimeDimensions(
  fieldNames: string[],
  granularities: TimeGranularity[] = ["day", "week", "month"]
): CubeTimeDimensionDefinition[] {
  return fieldNames.map((name) => ({
    name,
    granularities,
  }));
}

export function createDefaultMeasures(options: {
  numericFields: string[];
  includeCount?: boolean;
  includeTotals?: boolean;
}): CubeMeasureDefinition[] {
  const { numericFields, includeCount = true, includeTotals = true } = options;
  const measures: CubeMeasureDefinition[] = [];

  if (includeCount) {
    measures.push({ name: "count", type: "count" });
  }

  numericFields.forEach((field) => {
    const suffix = toPascalCase(field);
    measures.push({ name: `sum${suffix}`, type: "sum", field });
    measures.push({ name: `avg${suffix}`, type: "avg", field });
    measures.push({ name: `min${suffix}`, type: "min", field });
    measures.push({ name: `max${suffix}`, type: "max", field });
    if (includeTotals) {
      measures.push({ name: `total${suffix}`, type: "sum", field });
    }
  });

  return measures;
}

export function createDefaultPreAggregations(options: {
  timeDimension?: string;
  measureNames: string[];
  granularities?: TimeGranularity[];
}): CubePreAggregationDefinition[] {
  const {
    timeDimension,
    measureNames,
    granularities = ["day", "month"],
  } = options;

  if (!timeDimension) return [];

  return granularities.map((granularity) => ({
    name: `${timeDimension}_${granularity}_rollup`,
    type: "rollup",
    measures: measureNames,
    timeDimension,
    granularity,
  }));
}
