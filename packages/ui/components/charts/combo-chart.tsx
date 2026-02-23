"use client"

import * as React from "react"
import {
  BarChart as TremorComboChart,
  type BarChartProps as TremorComboChartProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartEmpty } from "./chart-empty"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type ComboChartCardProps<TData> = ChartBaseProps<TData> &
  Omit<
    TremorComboChartProps,
    | "data"
    | "className"
    | "colors"
    | "valueFormatter"
    | "showLegend"
    | "showTooltip"
    | "showGridLines"
  > & {
    // Tremor v3 does not expose ComboChart; keep the public prop for compatibility.
    type?: "line" | "bar"
  }

function ComboChartCard<TData>({
  data,
  title,
  description,
  actions,
  height = 300,
  className,
  withCard = true,
  emptyLabel,
  loading,
  colors,
  valueFormatter,
  showLegend,
  showTooltip,
  showGridLines,
  type: _type,
  ...chartProps
}: ComboChartCardProps<TData>) {
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
        <TremorComboChart
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

export type { ComboChartCardProps }
export { ComboChartCard }
