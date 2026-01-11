"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"
import type { BaseFieldProps, RadioOption } from "./types"

type RadioGroupFieldProps<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
> = BaseFieldProps<TFieldValues, TName> &
  Omit<
    React.ComponentProps<typeof RadioGroup>,
    "name" | "defaultValue" | "value" | "onValueChange"
  > & {
    options: RadioOption[]
  }

function RadioGroupField<
  TFieldValues extends import("react-hook-form").FieldValues,
  TName extends import("react-hook-form").FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  options,
  className,
  ...radioGroupProps
}: RadioGroupFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("space-y-3", className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <RadioGroup
              {...radioGroupProps}
              value={field.value ?? ""}
              onValueChange={field.onChange}
              className="grid gap-3"
            >
              {options.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "border-border hover:border-ring focus-within:border-ring focus-within:ring-ring/30 relative flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 shadow-xs transition-[border,box-shadow] outline-none",
                    option.disabled && "opacity-50"
                  )}
                >
                  <RadioGroupItem
                    value={option.value}
                    disabled={option.disabled}
                    aria-describedby={
                      option.description ? `${name}-${option.value}-desc` : undefined
                    }
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-medium leading-none">
                      {option.label}
                    </span>
                    {option.description && (
                      <p
                        id={`${name}-${option.value}-desc`}
                        className="text-muted-foreground text-sm"
                      >
                        {option.description}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </RadioGroup>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export type { RadioGroupFieldProps }
export { RadioGroupField }
