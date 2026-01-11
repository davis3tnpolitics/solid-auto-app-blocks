"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { Textarea } from "../ui/textarea"
import type { BaseFieldProps } from "./types"

type TextareaFieldProps<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
> = BaseFieldProps<TFieldValues, TName> &
  Omit<React.ComponentProps<typeof Textarea>, "name" | "defaultValue">

function TextareaField<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  className,
  ...textareaProps
}: TextareaFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Textarea
              {...field}
              value={field.value ?? ""}
              {...textareaProps}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export type { TextareaFieldProps }
export { TextareaField }
