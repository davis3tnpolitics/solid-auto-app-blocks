import "@testing-library/jest-dom/vitest"
import * as React from "react"
import { vi } from "vitest"

class ResizeObserverMock implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock
}

if (!globalThis.PointerEvent) {
  // Radix UI relies on PointerEvent in jsdom tests.
  globalThis.PointerEvent = MouseEvent as unknown as typeof PointerEvent
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {}
}

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false
}

if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => {}
}

if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {}
}

const tremorMockComponent =
  (name: string) =>
  ({ children, data, ...props }: { children?: React.ReactNode; data?: unknown }) => {
    return (
      <div
        data-testid={`tremor-${name}`}
        data-data-length={Array.isArray(data) ? data.length : 0}
        data-show-legend={String(Boolean((props as { showLegend?: boolean }).showLegend))}
        data-show-tooltip={String(Boolean((props as { showTooltip?: boolean }).showTooltip))}
      >
        {children}
      </div>
    )
  }

vi.mock("@tremor/react", () => ({
  AreaChart: tremorMockComponent("area-chart"),
  BarChart: tremorMockComponent("bar-chart"),
  BarList: tremorMockComponent("bar-list"),
  CategoryBar: tremorMockComponent("category-bar"),
  ComboChart: tremorMockComponent("combo-chart"),
  DonutChart: tremorMockComponent("donut-chart"),
  FunnelChart: tremorMockComponent("funnel-chart"),
  LineChart: tremorMockComponent("line-chart"),
  ProgressBar: tremorMockComponent("progress-bar"),
  ProgressCircle: tremorMockComponent("progress-circle"),
  ScatterChart: tremorMockComponent("scatter-chart"),
  SparkAreaChart: tremorMockComponent("spark-area-chart"),
  SparkBarChart: tremorMockComponent("spark-bar-chart"),
  SparkLineChart: tremorMockComponent("spark-line-chart"),
  Tracker: tremorMockComponent("tracker"),
}))
