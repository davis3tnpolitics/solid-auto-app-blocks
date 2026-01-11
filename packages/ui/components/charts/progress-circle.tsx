"use client"

import * as React from "react"
import {
  ProgressCircle as TremorProgressCircle,
  type ProgressCircleProps as TremorProgressCircleProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type ProgressCircleCardProps = Omit<ChartBaseProps, "data"> &
  Omit<TremorProgressCircleProps, "className" | "color" | "value"> & {
    value: number
  }

function ProgressCircleCard({
  title,
  description,
  actions,
  height = 200,
  className,
  withCard = true,
  loading,
  colors,
  value,
  ...progressProps
}: ProgressCircleCardProps) {
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
        <ChartSkeleton rows={2} />
      ) : (
        <TremorProgressCircle
          value={value}
          color={colors?.[0]}
          className="max-h-[160px] max-w-[160px]"
          {...progressProps}
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

export type { ProgressCircleCardProps }
export { ProgressCircleCard }
