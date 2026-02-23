"use client"

import * as React from "react"
import {
  CategoryBar as TremorCategoryBar,
  type CategoryBarProps as TremorCategoryBarProps,
} from "@tremor/react"

import { cn } from "../../lib/utils"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartEmpty } from "./chart-empty"
import { ChartSkeleton } from "./chart-skeleton"
import type { ChartBaseProps } from "./types"

type CategoryBarCardProps = Omit<ChartBaseProps, "data"> &
  Omit<TremorCategoryBarProps, "className" | "values" | "colors"> & {
    values: number[]
  }

function CategoryBarCard({
  title,
  description,
  actions,
  height = 140,
  className,
  withCard = true,
  emptyLabel,
  loading,
  colors,
  values,
  ...chartProps
}: CategoryBarCardProps) {
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
      ) : !values?.length ? (
        <ChartEmpty label={emptyLabel ?? "No segments"} />
      ) : (
        <TremorCategoryBar
          values={values}
          colors={colors as TremorCategoryBarProps["colors"]}
          className="w-full"
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

export type { CategoryBarCardProps }
export { CategoryBarCard }
