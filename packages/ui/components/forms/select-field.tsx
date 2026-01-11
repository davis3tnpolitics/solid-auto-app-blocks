"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import type { BaseFieldProps, SelectOption } from "./types"

type SelectFieldProps<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
> = BaseFieldProps<TFieldValues, TName> &
  Omit<
    React.ComponentProps<typeof Select>,
    "name" | "defaultValue" | "value" | "onValueChange"
  > & {
    placeholder?: string
    options: SelectOption[]
  }

function SelectField<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  placeholder,
  options,
  className,
  ...selectProps
}: SelectFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Select
              value={field.value ?? ""}
              onValueChange={field.onChange}
              {...selectProps}
            >
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export type { SelectFieldProps }
export { SelectField }
