"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { NativeSelect, NativeSelectOption } from "../ui/native-select"
import type { BaseFieldProps, SelectOption } from "./types"

type NativeSelectFieldProps<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
> = BaseFieldProps<TFieldValues, TName> &
  Omit<
    React.ComponentProps<typeof NativeSelect>,
    "name" | "defaultValue" | "value" | "onChange"
  > & {
    placeholder?: string
    options: SelectOption[]
  }

function NativeSelectField<
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
}: NativeSelectFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <NativeSelect
              {...selectProps}
              value={field.value ?? ""}
              onChange={(event) => field.onChange(event.target.value)}
            >
              {placeholder && (
                <NativeSelectOption value="" disabled>
                  {placeholder}
                </NativeSelectOption>
              )}
              {options.map((option) => (
                <NativeSelectOption
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export type { NativeSelectFieldProps }
export { NativeSelectField }
