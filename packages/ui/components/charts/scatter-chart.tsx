"use client"

import * as React from "react"
import {
  ScatterChart as TremorScatterChart,
  type ScatterChartProps as TremorScatterChartProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartEmpty } from "./chart-empty"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type ScatterChartCardProps<TData> = ChartBaseProps<TData> &
  Omit<
    TremorScatterChartProps,
    | "data"
    | "className"
    | "colors"
    | "valueFormatter"
    | "showLegend"
    | "showTooltip"
  >

function ScatterChartCard<TData>({
  data,
  title,
  description,
  actions,
  height = 320,
  className,
  withCard = true,
  emptyLabel,
  loading,
  colors,
  valueFormatter,
  showLegend,
  showTooltip,
  ...chartProps
}: ScatterChartCardProps<TData>) {
  const scatterValueFormatter: TremorScatterChartProps["valueFormatter"] =
    valueFormatter
      ? {
          x: (value) => valueFormatter(value),
          y: (value) => valueFormatter(value),
          size: (value) => valueFormatter(value),
        }
      : undefined

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
        <TremorScatterChart
          data={data}
          valueFormatter={scatterValueFormatter}
          colors={colors}
          showLegend={showLegend}
          showTooltip={showTooltip}
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

export type { ScatterChartCardProps }
export { ScatterChartCard }
