"use client"

import * as React from "react"
import {
  SparkLineChart as TremorSparkLineChart,
  type SparkLineChartProps as TremorSparkLineChartProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartEmpty } from "./chart-empty"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type SparkLineChartCardProps<TData> = ChartBaseProps<TData> &
  Omit<TremorSparkLineChartProps, "data" | "className" | "colors"> & {
    withCard?: boolean
  }

function SparkLineChartCard<TData>({
  data,
  title,
  description,
  actions,
  height = 120,
  className,
  withCard = false,
  emptyLabel,
  loading,
  colors,
  ...chartProps
}: SparkLineChartCardProps<TData>) {
  const content = (
    <ChartContainer
      height={height}
      className={cn(
        "p-0",
        withCard && "border-none bg-transparent shadow-none",
        className
      )}
    >
      <div className="h-full w-full px-3 py-2">
        {loading ? (
          <ChartSkeleton rows={2} />
        ) : !data?.length ? (
          <ChartEmpty label={emptyLabel} />
        ) : (
          <TremorSparkLineChart
            data={data}
            colors={colors}
            className="h-full"
            {...chartProps}
          />
        )}
      </div>
    </ChartContainer>
  )

  if (!withCard) {
    return content
  }

  return (
    <ChartCard title={title} description={description} actions={actions}>
      {content}
    </ChartCard>
  )
}

export type { SparkLineChartCardProps }
export { SparkLineChartCard }
