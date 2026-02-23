import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { vi } from "vitest"
import { z } from "zod"

import { CheckboxField } from "./checkbox-field"
import { NativeSelectField } from "./native-select-field"
import { RadioGroupField } from "./radio-group-field"
import { SelectField } from "./select-field"
import { SwitchField } from "./switch-field"
import { TextField } from "./text-field"
import { TextareaField } from "./textarea-field"
import { Form } from "../ui/form"

type FormValues = {
  name: string
  bio: string
  plan: string
  nativePlan: string
  accepted: boolean
  notify: boolean
  tier: string
}

function FormHarness({
  resolver,
  defaultValues,
  onSubmit,
  children,
}: {
  resolver?: ReturnType<typeof zodResolver<FormValues>>
  defaultValues?: Partial<FormValues>
  onSubmit?: (values: FormValues) => void
  children: (context: { control: ReturnType<typeof useForm<FormValues>>["control"] }) => React.ReactNode
}) {
  const form = useForm<FormValues>({
    resolver,
    defaultValues: {
      name: "",
      bio: "",
      plan: "",
      nativePlan: "",
      accepted: false,
      notify: false,
      tier: "",
      ...defaultValues,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit?.(values))}>
        {children({ control: form.control })}
        <button type="submit">Submit</button>
      </form>
    </Form>
  )
}

describe("form fields", () => {
  it("binds TextField values and submits with react-hook-form", async () => {
    const onSubmit = vi.fn()

    render(
      <FormHarness onSubmit={onSubmit}>
        {({ control }) => (
          <TextField
            name="name"
            label="Full name"
            control={control}
            placeholder="Enter your name"
          />
        )}
      </FormHarness>
    )

    const input = screen.getByLabelText("Full name")
    fireEvent.change(input, { target: { value: "Trenton" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Trenton",
        })
      )
    )
  })

  it("shows validation message and aria-invalid when resolver fails", async () => {
    const schema = z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
      bio: z.string(),
      plan: z.string(),
      nativePlan: z.string(),
      accepted: z.boolean(),
      notify: z.boolean(),
      tier: z.string(),
    })

    render(
      <FormHarness resolver={zodResolver(schema)}>
        {({ control }) => (
          <TextField name="name" label="Name" control={control} />
        )}
      </FormHarness>
    )

    fireEvent.click(screen.getByRole("button", { name: "Submit" }))

    expect(
      await screen.findByText("Name must be at least 2 characters")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true")
  })

  it("renders TextareaField description and propagates value", async () => {
    const onSubmit = vi.fn()
    render(
      <FormHarness onSubmit={onSubmit}>
        {({ control }) => (
          <TextareaField
            name="bio"
            label="Bio"
            description="Tell us about your team"
            control={control}
          />
        )}
      </FormHarness>
    )

    fireEvent.change(screen.getByLabelText("Bio"), {
      target: { value: "Analytics team" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))

    expect(screen.getByText("Tell us about your team")).toBeInTheDocument()
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          bio: "Analytics team",
        })
      )
    )
  })

  it("binds NativeSelectField values and exposes semantic select role", async () => {
    const onSubmit = vi.fn()

    render(
      <FormHarness onSubmit={onSubmit}>
        {({ control }) => (
          <NativeSelectField
            name="nativePlan"
            label="Native plan"
            control={control}
            placeholder="Select a plan"
            options={[
              { value: "starter", label: "Starter" },
              { value: "pro", label: "Pro" },
            ]}
          />
        )}
      </FormHarness>
    )

    const nativeSelect = screen.getByRole("combobox", { name: "Native plan" })
    fireEvent.change(nativeSelect, { target: { value: "pro" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          nativePlan: "pro",
        })
      )
    )
  })

  it("binds checkbox and switch states", async () => {
    const onSubmit = vi.fn()

    render(
      <FormHarness onSubmit={onSubmit}>
        {({ control }) => (
          <>
            <CheckboxField
              name="accepted"
              label="Accept terms"
              description="Required for access"
              control={control}
            />
            <SwitchField
              name="notify"
              label="Enable notifications"
              control={control}
            />
          </>
        )}
      </FormHarness>
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "Accept terms" }))
    fireEvent.click(screen.getByRole("switch", { name: "Enable notifications" }))
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          accepted: true,
          notify: true,
        })
      )
    )
  })

  it("binds radio group values and supports disabled options", async () => {
    const onSubmit = vi.fn()

    render(
      <FormHarness onSubmit={onSubmit}>
        {({ control }) => (
          <RadioGroupField
            name="tier"
            label="Tier"
            control={control}
            options={[
              { value: "basic", label: "Basic" },
              { value: "enterprise", label: "Enterprise", disabled: true },
            ]}
          />
        )}
      </FormHarness>
    )

    fireEvent.click(screen.getByRole("radio", { name: "Basic" }))
    expect(screen.getByRole("radio", { name: "Enterprise" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: "basic",
        })
      )
    )
  })

  it("renders SelectField with combobox semantics and option metadata", () => {
    render(
      <FormHarness>
        {({ control }) => (
          <SelectField
            name="plan"
            label="Plan"
            control={control}
            placeholder="Select plan"
            options={[
              { value: "starter", label: "Starter" },
              { value: "pro", label: "Pro" },
            ]}
          />
        )}
      </FormHarness>
    )

    const combobox = screen.getByRole("combobox")
    expect(combobox).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("Select plan")).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Starter", hidden: true })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Pro", hidden: true })
    ).toBeInTheDocument()
  })
})
