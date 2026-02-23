import * as React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import type { CrudDetailField } from "./types"

type CrudDetailProps<Row extends Record<string, unknown>> = {
  title: string
  description?: string
  data?: Row | null
  fields: CrudDetailField<Row>[]
  isLoading?: boolean
  error?: string | null
}

function readDetailValue<Row extends Record<string, unknown>>(row: Row, key: string | keyof Row) {
  const value = row[key as keyof Row]
  if (value === null || value === undefined) return "-"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

export function CrudDetail<Row extends Record<string, unknown>>({
  title,
  description,
  data,
  fields,
  isLoading = false,
  error,
}: CrudDetailProps<Row>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : null}
        {!isLoading && error ? <p className="text-destructive">{error}</p> : null}
        {!isLoading && !error && !data ? (
          <p className="text-muted-foreground">Record not found.</p>
        ) : null}
        {!isLoading && !error && data ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={String(field.key)} className={field.className}>
                <dt className="text-muted-foreground text-sm">{field.label}</dt>
                <dd className="font-medium">
                  {field.render ? field.render(data) : readDetailValue(data, field.key)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </CardContent>
    </Card>
  )
}
