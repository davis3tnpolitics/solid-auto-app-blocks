"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import type { ChartContainerProps } from "./types"

function ChartContainer({
  height = 280,
  className,
  children,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        "text-foreground relative w-full overflow-hidden rounded-lg border bg-card",
        "dark:border-border/60",
        className
      )}
      style={{ minHeight: height, height }}
    >
      <div className="h-full w-full px-4 py-3 sm:px-5">{children}</div>
    </div>
  )
}

export { ChartContainer }
