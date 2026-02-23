"use client"

import * as React from "react"
import {
  ProgressBar as TremorProgressBar,
  type ProgressBarProps as TremorProgressBarProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type ProgressBarCardProps = Omit<ChartBaseProps, "data"> &
  Omit<TremorProgressBarProps, "className" | "color" | "value"> & {
    value: number
  }

function ProgressBarCard({
  title,
  description,
  actions,
  height = 120,
  className,
  withCard = true,
  loading,
  colors,
  value,
  ...progressProps
}: ProgressBarCardProps) {
  const content = (
    <ChartContainer
      height={height}
      className={cn(
        "flex items-center",
        withCard && "border-none bg-transparent shadow-none",
        className
      )}
    >
      {loading ? (
        <ChartSkeleton rows={2} />
      ) : (
        <TremorProgressBar
          value={value}
          color={colors?.[0] as TremorProgressBarProps["color"]}
          className="w-full"
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

export type { ProgressBarCardProps }
export { ProgressBarCard }
