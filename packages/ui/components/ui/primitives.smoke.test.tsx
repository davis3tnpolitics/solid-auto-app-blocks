import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"

import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { Input } from "./input"

describe("ui primitive smoke tests", () => {
  it("renders button and handles click interaction", () => {
    const onClick = vi.fn()

    render(<Button onClick={onClick}>Save</Button>)
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("renders input with textbox semantics", () => {
    render(<Input aria-label="Email" type="email" defaultValue="a@b.com" />)
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("a@b.com")
  })

  it("renders checkbox and toggles checked state", () => {
    render(<Checkbox aria-label="Accept terms" />)

    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" })
    expect(checkbox).toHaveAttribute("aria-checked", "false")

    fireEvent.click(checkbox)
    expect(checkbox).toHaveAttribute("aria-checked", "true")
  })
})
