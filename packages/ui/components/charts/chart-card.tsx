"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import type { ChartCardProps } from "./types"

function ChartCard({
  title,
  description,
  actions,
  className,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn("bg-background", className)}>
      {(title || description || actions) && (
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            {title && (
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
            )}
            {description && (
              <CardDescription className="text-sm text-muted-foreground">
                {description}
              </CardDescription>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export { ChartCard }
