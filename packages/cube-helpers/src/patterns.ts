import type {
  GroupedAggregationProfile,
  TimeGranularity,
  TimeWindow,
} from "./types";

export function createGroupedAggregationProfile(options: {
  dimension: string;
  measures: string[];
  order?: "asc" | "desc";
  limit?: number;
}): GroupedAggregationProfile {
  return {
    dimension: options.dimension,
    measures: options.measures,
    order: options.order || "desc",
    limit: options.limit ?? 50,
  };
}

export function createDateBucketGranularities(options?: {
  includeHour?: boolean;
  includeQuarter?: boolean;
}): TimeGranularity[] {
  const granularities: TimeGranularity[] = ["day", "week", "month", "year"];

  if (options?.includeHour) {
    granularities.unshift("hour");
  }
  if (options?.includeQuarter) {
    granularities.splice(granularities.indexOf("year"), 0, "quarter");
  }

  return granularities;
}

export function normalizeTimeWindow(input?: Partial<TimeWindow>): TimeWindow | null {
  if (!input?.from || !input?.to) return null;

  return {
    from: input.from,
    to: input.to,
    preset: input.preset,
  };
}
