"use client"

import * as React from "react"
import {
  BarChart as TremorBarChart,
  type BarChartProps as TremorBarChartProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartEmpty } from "./chart-empty"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type BarChartCardProps<TData> = ChartBaseProps<TData> &
  Omit<
    TremorBarChartProps,
    | "data"
    | "className"
    | "colors"
    | "valueFormatter"
    | "showLegend"
    | "showTooltip"
    | "showGridLines"
  >

function BarChartCard<TData>({
  data,
  title,
  description,
  actions,
  height = 280,
  className,
  withCard = true,
  emptyLabel,
  loading,
  colors,
  valueFormatter,
  showLegend,
  showTooltip,
  showGridLines,
  ...chartProps
}: BarChartCardProps<TData>) {
  const content = (
    <ChartContainer
      height={height}
      className={cn(
        withCard && "border-none bg-transparent shadow-none",
        className
      )}
    >
      {loading ? (
        <ChartSkeleton />
      ) : !data?.length ? (
        <ChartEmpty label={emptyLabel} />
      ) : (
        <TremorBarChart
          data={data}
          valueFormatter={valueFormatter}
          colors={colors}
          showLegend={showLegend}
          showTooltip={showTooltip}
          showGridLines={showGridLines}
          className="h-full"
          {...chartProps}
        />
      )}
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

export type { BarChartCardProps }
export { BarChartCard }
