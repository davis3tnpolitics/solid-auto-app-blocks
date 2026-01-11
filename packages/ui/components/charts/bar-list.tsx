"use client"

import * as React from "react"
import {
  BarList as TremorBarList,
  type BarListProps as TremorBarListProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartEmpty } from "./chart-empty"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type BarListCardProps<TData> = ChartBaseProps<TData> &
  Omit<TremorBarListProps, "data" | "className" | "colorPalette">

function BarListCard<TData>({
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
  ...chartProps
}: BarListCardProps<TData>) {
  const content = (
    <ChartContainer
      height={height}
      className={cn(
        withCard && "border-none bg-transparent shadow-none",
        className
      )}
    >
      {loading ? (
        <ChartSkeleton rows={6} />
      ) : !data?.length ? (
        <ChartEmpty label={emptyLabel} />
      ) : (
        <TremorBarList
          data={data as TremorBarListProps["data"]}
          colorPalette={colors}
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

export type { BarListCardProps }
export { BarListCard }
