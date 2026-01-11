"use client"

import * as React from "react"
import {
  Tracker as TremorTracker,
  type TrackerProps as TremorTrackerProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type TrackerCardProps = Omit<ChartBaseProps, "data"> &
  Omit<TremorTrackerProps, "className" | "data" | "color"> & {
    data: TremorTrackerProps["data"]
  }

function TrackerCard({
  data,
  title,
  description,
  actions,
  height = 120,
  className,
  withCard = true,
  loading,
  colors,
  ...trackerProps
}: TrackerCardProps) {
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
        <TremorTracker
          data={data}
          color={colors?.[0]}
          className="w-full"
          {...trackerProps}
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

export type { TrackerCardProps }
export { TrackerCard }
