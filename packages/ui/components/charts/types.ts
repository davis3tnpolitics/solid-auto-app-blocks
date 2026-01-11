import * as React from "react"

type ChartCardProps = {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

type ChartContainerProps = {
  height?: number
  className?: string
  children: React.ReactNode
}

type ChartBaseProps<TData = unknown> = {
  data: TData[]
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  height?: number
  withCard?: boolean
  emptyLabel?: React.ReactNode
  loading?: boolean
  colors?: string[]
  valueFormatter?: (value: number | string) => string
  showLegend?: boolean
  showGridLines?: boolean
  showTooltip?: boolean
}

export type { ChartBaseProps, ChartCardProps, ChartContainerProps }
