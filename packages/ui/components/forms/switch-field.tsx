"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { Switch } from "../ui/switch"
import type { BaseFieldProps } from "./types"

type SwitchFieldProps<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
> = BaseFieldProps<TFieldValues, TName> &
  Omit<
    React.ComponentProps<typeof Switch>,
    "name" | "defaultChecked" | "checked" | "onCheckedChange"
  >

function SwitchField<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  className,
  ...switchProps
}: SwitchFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex flex-col gap-2", className)}>
          <div className="flex items-center gap-3">
            <FormControl>
              <Switch
                {...switchProps}
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

export type { SwitchFieldProps }
export { SwitchField }
