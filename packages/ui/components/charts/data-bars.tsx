"use client"

import * as React from "react"
import { BarChart as TremorBarChart } from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartEmpty } from "./chart-empty"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type DataBar = { name: string; value: number }

type DataBarsProps = ChartBaseProps<DataBar> & {
  valueKey?: string
}

function DataBars({
  data,
  title,
  description,
  actions,
  height = 240,
  className,
  withCard = true,
  emptyLabel,
  loading,
  colors,
  valueFormatter,
  valueKey = "value",
  showGridLines = false,
  showTooltip = true,
}: DataBarsProps) {
  const prepared = React.useMemo(
    () =>
      data?.map((item) => ({
        name: item.name,
        [valueKey]: item.value,
      })) ?? [],
    [data, valueKey]
  )

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
      ) : !prepared?.length ? (
        <ChartEmpty label={emptyLabel} />
      ) : (
        <TremorBarChart
          data={prepared}
          index="name"
          categories={[valueKey]}
          valueFormatter={valueFormatter}
          colors={colors}
          showLegend={false}
          showTooltip={showTooltip}
          showGridLines={showGridLines}
          className="h-full"
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

export type { DataBar, DataBarsProps }
export { DataBars }
