import * as React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Spinner } from "../ui/spinner"
import type { CrudInfiniteScrollState } from "./types"

type CrudListProps = {
  title: string
  description?: string
  isLoading?: boolean
  error?: string | null
  isEmpty?: boolean
  emptyState?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  infiniteScroll?: CrudInfiniteScrollState
}

export function CrudList({
  title,
  description,
  isLoading = false,
  error,
  isEmpty = false,
  emptyState,
  actions,
  children,
  infiniteScroll,
}: CrudListProps) {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const inFlightRef = React.useRef(false)

  const hasMore = infiniteScroll?.hasMore ?? false
  const isLoadingMore = infiniteScroll?.isLoadingMore ?? false
  const canObserve =
    typeof window !== "undefined" &&
    typeof window.IntersectionObserver !== "undefined" &&
    !infiniteScroll?.disabled

  const triggerLoadMore = React.useCallback(() => {
    if (!infiniteScroll || !infiniteScroll.hasMore) return
    if (infiniteScroll.isLoadingMore || inFlightRef.current) return

    inFlightRef.current = true
    Promise.resolve(infiniteScroll.onLoadMore()).finally(() => {
      inFlightRef.current = false
    })
  }, [infiniteScroll])

  React.useEffect(() => {
    if (!isLoadingMore) {
      inFlightRef.current = false
    }
  }, [isLoadingMore])

  React.useEffect(() => {
    if (!canObserve || !hasMore || isLoading || Boolean(error)) return
    if (!sentinelRef.current || !infiniteScroll) return

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          triggerLoadMore()
        }
      },
      {
        root: null,
        rootMargin: infiniteScroll.rootMargin ?? "200px",
        threshold: infiniteScroll.threshold ?? 0.1,
      }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [canObserve, error, hasMore, infiniteScroll, isLoading, triggerLoadMore])

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : null}
        {!isLoading && error ? <p className="text-destructive">{error}</p> : null}
        {!isLoading && !error && isEmpty
          ? (emptyState ?? <p className="text-muted-foreground">No records found.</p>)
          : null}
        {!isLoading && !error && !isEmpty ? (
          <div className="space-y-3">
            {children}
            {hasMore ? <div ref={sentinelRef} aria-hidden data-slot="crud-list-sentinel" /> : null}

            {!canObserve && hasMore ? (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={triggerLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="size-4" />
                      Loading...
                    </span>
                  ) : (
                    infiniteScroll?.loadMoreLabel ?? "Load more"
                  )}
                </Button>
              </div>
            ) : null}

            {canObserve && hasMore ? (
              <p className="text-muted-foreground text-sm">
                {isLoadingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-4" />
                    Loading more...
                  </span>
                ) : (
                  "Scroll to load more"
                )}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
