import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { vi } from "vitest"
import { z } from "zod"

import { CrudDetail } from "./detail"
import { CrudForm } from "./form"
import { CrudList } from "./list"
import { CrudTable } from "./table"

describe("crud components", () => {
  it("renders CrudList states", () => {
    const { rerender } = render(
      <CrudList title="Users" description="All users" isLoading>
        <div>content</div>
      </CrudList>
    )

    expect(screen.getByText("Loading...")).toBeInTheDocument()

    rerender(
      <CrudList title="Users" isEmpty emptyState={<p>Empty now</p>}>
        <div>content</div>
      </CrudList>
    )

    expect(screen.getByText("Empty now")).toBeInTheDocument()
  })

  it("renders CrudTable rows and custom cells", () => {
    render(
      <CrudTable
        rows={[
          { id: "u1", email: "a@example.com", active: true },
          { id: "u2", email: "b@example.com", active: false },
        ]}
        columns={[
          { key: "id", header: "ID" },
          { key: "email", header: "Email" },
          {
            key: "active",
            header: "Active",
            render: (row) => (row.active ? "Active" : "Inactive"),
          },
        ]}
      />
    )

    expect(screen.getByText("a@example.com")).toBeInTheDocument()
    expect(screen.getByText("Inactive")).toBeInTheDocument()
  })

  it("supports CrudTable pagination controls", () => {
    const onPageChange = vi.fn()
    const onPageSizeChange = vi.fn()

    render(
      <CrudTable
        rows={[{ id: "u1", email: "a@example.com" }]}
        columns={[
          { key: "id", header: "ID" },
          { key: "email", header: "Email" },
        ]}
        pagination={{
          pageNumber: 2,
          pageSize: 10,
          pageCount: 3,
          count: 21,
        }}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    )

    expect(screen.getByText("Page 2 of 3 (21 total)")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Previous" }))
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    fireEvent.change(screen.getByLabelText("Rows per page"), {
      target: { value: "25" },
    })

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3)
    expect(onPageSizeChange).toHaveBeenCalledWith(25)
  })

  it("supports CrudList infinite scroll fallback button", () => {
    vi.stubGlobal("IntersectionObserver", undefined)
    const onLoadMore = vi.fn()

    render(
      <CrudList
        title="Users"
        infiniteScroll={{
          hasMore: true,
          onLoadMore,
          loadMoreLabel: "Load next page",
        }}
      >
        <div>content</div>
      </CrudList>
    )

    fireEvent.click(screen.getByRole("button", { name: "Load next page" }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })

  it("renders CrudDetail fields", () => {
    render(
      <CrudDetail
        title="User"
        data={{ id: "u1", email: "a@example.com", active: true }}
        fields={[
          { key: "id", label: "ID" },
          { key: "email", label: "Email" },
          { key: "active", label: "Active" },
        ]}
      />
    )

    expect(screen.getByText("ID")).toBeInTheDocument()
    expect(screen.getByText("a@example.com")).toBeInTheDocument()
    expect(screen.getByText("Yes")).toBeInTheDocument()
  })

  it("submits CrudForm values", async () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    const schema = z.object({
      email: z.string().email(),
      age: z.coerce.number().optional(),
      active: z.boolean().optional(),
    })

    render(
      <CrudForm
        schema={schema}
        defaultValues={{ email: "" }}
        fields={[
          { name: "email", label: "Email", type: "email" },
          { name: "age", label: "Age", type: "number" },
          { name: "active", label: "Active", type: "checkbox" },
        ]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "team@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Age"), {
      target: { value: "42" },
    })
    fireEvent.click(screen.getByRole("checkbox", { name: "Active" }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "team@example.com",
          age: 42,
          active: true,
        })
      )
    })

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
