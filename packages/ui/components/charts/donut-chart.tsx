"use client"

import * as React from "react"
import {
  DonutChart as TremorDonutChart,
  type DonutChartProps as TremorDonutChartProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartEmpty } from "./chart-empty"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type DonutChartCardProps<TData> = ChartBaseProps<TData> &
  Omit<
    TremorDonutChartProps,
    | "data"
    | "className"
    | "colors"
    | "valueFormatter"
    | "showTooltip"
  >

function DonutChartCard<TData>({
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
  showTooltip,
  ...chartProps
}: DonutChartCardProps<TData>) {
  const content = (
    <ChartContainer
      height={height}
      className={cn(
        "flex items-center justify-center",
        withCard && "border-none bg-transparent shadow-none",
        className
      )}
    >
      {loading ? (
        <ChartSkeleton />
      ) : !data?.length ? (
        <ChartEmpty label={emptyLabel} />
      ) : (
        <TremorDonutChart
          data={data}
          valueFormatter={valueFormatter}
          colors={colors}
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

export type { DonutChartCardProps }
export { DonutChartCard }
