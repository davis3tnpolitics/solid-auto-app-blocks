"use client"

import * as React from "react"
import { BarChart3Icon } from "lucide-react"

import { cn } from "../../lib/utils"

type ChartEmptyProps = {
  label?: React.ReactNode
  className?: string
}

function ChartEmpty({ label = "No data to display", className }: ChartEmptyProps) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-sm",
        className
      )}
    >
      <BarChart3Icon className="text-border h-8 w-8" aria-hidden />
      <p className="text-center leading-snug">{label}</p>
    </div>
  )
}

export { ChartEmpty }
