"use client"

import * as React from "react"

import type { ChartBaseProps } from "./types"
import { SparkAreaChartCard, type SparkAreaChartCardProps } from "./spark-area-chart"
import { SparkBarChartCard, type SparkBarChartCardProps } from "./spark-bar-chart"
import { SparkLineChartCard, type SparkLineChartCardProps } from "./spark-line-chart"

type SparkChartProps<TData> = ChartBaseProps<TData> & {
  type: "line" | "area" | "bar"
} & Omit<
    SparkAreaChartCardProps<TData> &
      SparkLineChartCardProps<TData> &
      SparkBarChartCardProps<TData>,
    "data" | "type"
  >

function SparkChart<TData>({ type, ...props }: SparkChartProps<TData>) {
  if (type === "bar") {
    return <SparkBarChartCard {...props} />
  }
  if (type === "area") {
    return <SparkAreaChartCard {...props} />
  }
  return <SparkLineChartCard {...props} />
}

export type { SparkChartProps }
export { SparkChart }
