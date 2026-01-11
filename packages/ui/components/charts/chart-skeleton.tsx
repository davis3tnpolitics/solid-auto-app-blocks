"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { Skeleton } from "../ui/skeleton"

type ChartSkeletonProps = {
  className?: string
  rows?: number
}

function ChartSkeleton({ className, rows = 3 }: ChartSkeletonProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col justify-center gap-2 px-4 py-6",
        className
      )}
    >
      <Skeleton className="h-6 w-32" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <Skeleton key={idx} className="h-5 w-full" />
        ))}
      </div>
    </div>
  )
}

export { ChartSkeleton }
