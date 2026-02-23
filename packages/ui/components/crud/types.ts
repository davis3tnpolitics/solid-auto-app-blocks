import type * as React from "react"
import type { FieldValues, Path } from "react-hook-form"

export type CrudPaginationState = {
  pageNumber: number
  pageSize: number
  count: number
  pageCount: number
}

export type CrudInfiniteScrollState = {
  hasMore: boolean
  isLoadingMore?: boolean
  onLoadMore: () => void | Promise<void>
  disabled?: boolean
  rootMargin?: string
  threshold?: number
  loadMoreLabel?: string
}

export type CrudTableColumn<Row extends Record<string, unknown>> = {
  key: keyof Row | string
  header: string
  render?: (row: Row) => React.ReactNode
  className?: string
}

export type CrudDetailField<Row extends Record<string, unknown>> = {
  key: keyof Row | string
  label: string
  render?: (row: Row) => React.ReactNode
  className?: string
}

export type CrudFormField<Values extends FieldValues> = {
  name: Path<Values>
  label: string
  description?: string
  placeholder?: string
  type?: "text" | "email" | "number" | "textarea" | "checkbox"
  disabled?: boolean
}
