import * as React from "react"

import { Button } from "../ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import type { CrudPaginationState, CrudTableColumn } from "./types"

type CrudTableProps<Row extends Record<string, unknown>> = {
  rows: Row[]
  columns: CrudTableColumn<Row>[]
  rowKey?: (row: Row, index: number) => string
  emptyState?: React.ReactNode
  pagination?: CrudPaginationState
  pageSizeOptions?: number[]
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  isPageLoading?: boolean
}

function readCellValue<Row extends Record<string, unknown>>(row: Row, key: string | keyof Row) {
  const value = row[key as keyof Row]
  if (value === null || value === undefined) return "-"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

export function CrudTable<Row extends Record<string, unknown>>({
  rows,
  columns,
  rowKey,
  emptyState,
  pagination,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  isPageLoading = false,
}: CrudTableProps<Row>) {
  const hasPagination = Boolean(pagination)
  const canGoBack = Boolean(pagination && pagination.pageNumber > 1 && onPageChange)
  const canGoForward = Boolean(
    pagination && pagination.pageNumber < pagination.pageCount && onPageChange
  )

  const showEmpty = rows.length === 0

  return (
    <div className="space-y-3">
      {showEmpty ? (
        <>{emptyState ?? <p className="text-muted-foreground">No records found.</p>}</>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.key)} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={rowKey ? rowKey(row, index) : String((row as { id?: unknown }).id ?? index)}
              >
                {columns.map((column) => (
                  <TableCell key={String(column.key)} className={column.className}>
                    {column.render ? column.render(row) : readCellValue(row, column.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {hasPagination && pagination ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Page {pagination.pageNumber} of {pagination.pageCount || 1} ({pagination.count} total)
          </p>

          <div className="flex items-center gap-2">
            {onPageSizeChange ? (
              <label className="text-muted-foreground flex items-center gap-2 text-sm">
                <span>Rows per page</span>
                <select
                  aria-label="Rows per page"
                  className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                  value={pagination.pageSize}
                  onChange={(event) => onPageSizeChange(Number(event.target.value))}
                  disabled={isPageLoading}
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.pageNumber > 1 && onPageChange?.(pagination.pageNumber - 1)}
              disabled={!canGoBack || isPageLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                pagination.pageNumber < pagination.pageCount &&
                onPageChange?.(pagination.pageNumber + 1)
              }
              disabled={!canGoForward || isPageLoading}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
