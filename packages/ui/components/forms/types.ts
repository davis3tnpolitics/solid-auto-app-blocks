import * as React from "react"
import { type Control, type FieldPath, type FieldValues } from "react-hook-form"

type BaseFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  name: TName
  control?: Control<TFieldValues>
  label?: React.ReactNode
  description?: React.ReactNode
  className?: string
}

type SelectOption = {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

type RadioOption = {
  value: string
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
}

export type { BaseFieldProps, SelectOption, RadioOption }
