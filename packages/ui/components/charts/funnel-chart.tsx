"use client"

import * as React from "react"
import {
  FunnelChart as TremorFunnelChart,
  type FunnelChartProps as TremorFunnelChartProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartEmpty } from "./chart-empty"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type FunnelDatum = { name: string; value: number }

type FunnelChartCardProps = ChartBaseProps<FunnelDatum> &
  Omit<TremorFunnelChartProps, "data" | "className" | "colors" | "valueFormatter">

function FunnelChartCard({
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
  ...chartProps
}: FunnelChartCardProps) {
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
        <TremorFunnelChart
          data={data}
          valueFormatter={valueFormatter}
          color={colors?.[0] as TremorFunnelChartProps["color"]}
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

export type { FunnelChartCardProps }
export { FunnelChartCard }
