"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { Input } from "../ui/input"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import type { BaseFieldProps } from "./types"

type TextFieldProps<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
> = BaseFieldProps<TFieldValues, TName> &
  Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue">

function TextField<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  className,
  ...inputProps
}: TextFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input {...field} value={field.value ?? ""} {...inputProps} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export type { TextFieldProps }
export { TextField }
