import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"

describe("interactive ui primitives", () => {
  it("opens and closes dialog content", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog body</DialogDescription>
        </DialogContent>
      </Dialog>
    )

    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }))
    expect(await screen.findByText("Dialog body")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(screen.queryByText("Dialog body")).not.toBeInTheDocument()
  })

  it("opens dropdown menus and handles item select", async () => {
    const onSelect = vi.fn()

    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    fireEvent.pointerDown(screen.getByRole("button", { name: "Menu" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it("switches tabs by controlled value updates", () => {
    const { rerender } = render(
      <Tabs value="overview" onValueChange={() => {}}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview panel</TabsContent>
        <TabsContent value="details">Details panel</TabsContent>
      </Tabs>
    )

    expect(screen.getByText("Overview panel")).toBeVisible()
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true"
    )

    rerender(
      <Tabs value="details" onValueChange={() => {}}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview panel</TabsContent>
        <TabsContent value="details">Details panel</TabsContent>
      </Tabs>
    )

    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
  })
})
