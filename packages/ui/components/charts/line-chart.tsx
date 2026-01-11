"use client"

import * as React from "react"
import {
  LineChart as TremorLineChart,
  type LineChartProps as TremorLineChartProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartEmpty } from "./chart-empty"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type LineChartCardProps<TData> = ChartBaseProps<TData> &
  Omit<
    TremorLineChartProps,
    | "data"
    | "className"
    | "colors"
    | "valueFormatter"
    | "showLegend"
    | "showTooltip"
    | "showGridLines"
  >

function LineChartCard<TData>({
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
}: LineChartCardProps<TData>) {
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
        <TremorLineChart
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

export type { LineChartCardProps }
export { LineChartCard }
