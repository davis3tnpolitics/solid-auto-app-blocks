export type AnalyticsValueType = "id" | "string" | "number" | "boolean" | "date";

export type CubeDimensionType = "string" | "number" | "boolean" | "time";
export type CubeMeasureType = "count" | "sum" | "avg" | "min" | "max";
export type TimeGranularity = "hour" | "day" | "week" | "month" | "quarter" | "year";

export interface CubeDimensionDefinition {
  name: string;
  type: CubeDimensionType;
  primaryKey?: boolean;
  shown?: boolean;
}

export interface CubeMeasureDefinition {
  name: string;
  type: CubeMeasureType;
  field?: string;
  description?: string;
}

export interface CubeTimeDimensionDefinition {
  name: string;
  granularities: TimeGranularity[];
}

export interface CubePreAggregationDefinition {
  name: string;
  type: "rollup";
  measures: string[];
  timeDimension: string;
  granularity: TimeGranularity;
}

export interface CubeSecurityContextDefinition {
  requiredFilters: string[];
}

export interface CubeServiceSchema {
  cube: string;
  sqlTable: string;
  dimensions: CubeDimensionDefinition[];
  timeDimensions: CubeTimeDimensionDefinition[];
  measures: CubeMeasureDefinition[];
  preAggregations?: CubePreAggregationDefinition[];
  securityContext?: CubeSecurityContextDefinition;
}

export interface AnalyticsQueryContract {
  cube: string;
  dimensions: string[];
  measures: string[];
  totals: string[];
  timeDimensions: string[];
  defaultTimeDimension?: string;
  scopedFilters?: string[];
}

export interface GroupedAggregationProfile {
  dimension: string;
  measures: string[];
  order: "asc" | "desc";
  limit: number;
}

export interface TimeWindow {
  from: string;
  to: string;
  preset?: string;
}
