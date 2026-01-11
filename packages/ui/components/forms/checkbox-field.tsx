"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { Checkbox } from "../ui/checkbox"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import type { BaseFieldProps } from "./types"

type CheckboxFieldProps<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
> = BaseFieldProps<TFieldValues, TName> &
  Omit<
    React.ComponentProps<typeof Checkbox>,
    "name" | "defaultChecked" | "checked" | "onCheckedChange"
  >

function CheckboxField<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  className,
  ...checkboxProps
}: CheckboxFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex flex-col gap-2", className)}>
          <div className="flex items-start gap-3">
            <FormControl>
              <Checkbox
                {...checkboxProps}
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1">
              {label && <FormLabel>{label}</FormLabel>}
              {description && <FormDescription>{description}</FormDescription>}
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export type { CheckboxFieldProps }
export { CheckboxField }
