"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
} from "react-hook-form"
import { z } from "zod"

import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import type { CrudFormField } from "./types"

type CrudFormProps<Values extends FieldValues> = {
  schema: z.ZodType<Values>
  fields: CrudFormField<Values>[]
  defaultValues?: Partial<Values>
  submitLabel?: string
  cancelLabel?: string
  onSubmit: (values: Values) => void | Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  formStyle?: "stacked" | "two-column"
  className?: string
}

function toBoolean(value: unknown): boolean {
  return value === true
}

function readInputType(fieldType: CrudFormField<FieldValues>["type"], name: string) {
  if (fieldType) return fieldType
  if (name.toLowerCase().includes("email")) return "email"
  return "text"
}

export function CrudForm<Values extends FieldValues>({
  schema,
  fields,
  defaultValues,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
  isSubmitting = false,
  formStyle = "stacked",
  className,
}: CrudFormProps<Values>) {
  const form = useForm<Values>({
    resolver: zodResolver(schema as any) as Resolver<Values>,
    defaultValues: defaultValues as DefaultValues<Values>,
  })

  React.useEffect(() => {
    if (!defaultValues) return
    form.reset(defaultValues as DefaultValues<Values>)
  }, [defaultValues, form])

  return (
    <Form {...form}>
      <form
        className={className}
        onSubmit={form.handleSubmit((values) => onSubmit(values))}
      >
        <div className={formStyle === "two-column" ? "grid gap-4 md:grid-cols-2" : "grid gap-4"}>
          {fields.map((field) => (
            <FormField
              key={String(field.name)}
              control={form.control}
              name={field.name}
              render={({ field: controllerField }) => {
                const type = readInputType(field.type, String(field.name))
                let control: React.ReactElement

                if (type === "textarea") {
                  control = (
                    <Textarea
                      placeholder={field.placeholder}
                      disabled={field.disabled || isSubmitting}
                      value={String(controllerField.value ?? "")}
                      onChange={controllerField.onChange}
                      onBlur={controllerField.onBlur}
                      name={controllerField.name}
                      ref={controllerField.ref}
                    />
                  )
                } else if (type === "checkbox") {
                  control = (
                    <Checkbox
                      checked={toBoolean(controllerField.value)}
                      onCheckedChange={(checked) => controllerField.onChange(checked === true)}
                      disabled={field.disabled || isSubmitting}
                      name={controllerField.name}
                    />
                  )
                } else {
                  control = (
                    <Input
                      type={type}
                      placeholder={field.placeholder}
                      disabled={field.disabled || isSubmitting}
                      value={String(controllerField.value ?? "")}
                      onChange={controllerField.onChange}
                      onBlur={controllerField.onBlur}
                      name={controllerField.name}
                      ref={controllerField.ref}
                    />
                  )
                }

                return (
                  <FormItem>
                    <FormLabel>{field.label}</FormLabel>
                    <FormControl>{control}</FormControl>
                    {field.description ? (
                      <FormDescription>{field.description}</FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              {cancelLabel}
            </Button>
          ) : null}
        </div>
      </form>
    </Form>
  )
}
