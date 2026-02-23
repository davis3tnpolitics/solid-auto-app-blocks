import { render, screen } from "@testing-library/react"

import {
  adaptCubeMultiSeriesCategorical,
  adaptCubeSingleSeriesCategorical,
  adaptCubeStackedSegments,
  toCategoryBarValues,
  toNameValuePairs,
} from "../../lib/cubejs-adapters"
import { AreaChartCard } from "./area-chart"
import { BarChartCard } from "./bar-chart"
import { BarListCard } from "./bar-list"
import { CategoryBarCard } from "./category-bar"
import { ChartCard } from "./chart-card"
import { ChartContainer } from "./chart-container"
import { ChartEmpty } from "./chart-empty"
import { ChartSkeleton } from "./chart-skeleton"
import { ComboChartCard } from "./combo-chart"
import { DataBars } from "./data-bars"
import { DonutChartCard } from "./donut-chart"
import { FunnelChartCard } from "./funnel-chart"
import { LineChartCard } from "./line-chart"
import { ProgressBarCard } from "./progress-bar"
import { ProgressCircleCard } from "./progress-circle"
import { ScatterChartCard } from "./scatter-chart"
import { SparkAreaChartCard } from "./spark-area-chart"
import { SparkBarChartCard } from "./spark-bar-chart"
import { SparkChart } from "./spark-chart"
import { SparkLineChartCard } from "./spark-line-chart"
import { TrackerCard } from "./tracker"

const categoricalRows = [
  { month: "Jan", sales: 10, returns: 2 },
  { month: "Feb", sales: 20, returns: 5 },
]

describe("chart wrappers", () => {
  it("renders chart shell primitives", () => {
    const containerRender = render(
      <ChartContainer height={160}>
        <div>Child</div>
      </ChartContainer>
    )
    expect(containerRender.container.firstChild).toHaveStyle("height: 160px")

    render(<ChartEmpty label="No points yet" />)
    expect(screen.getByText("No points yet")).toBeInTheDocument()

    const skeletonRender = render(<ChartSkeleton rows={4} />)
    expect(
      skeletonRender.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBe(5)

    render(
      <ChartCard title="Revenue" description="Monthly" actions={<button>Sync</button>}>
        <div>Body</div>
      </ChartCard>
    )
    expect(screen.getByText("Revenue")).toBeInTheDocument()
    expect(screen.getByText("Monthly")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sync" })).toBeInTheDocument()
  })

  it("handles loading, empty, and rendered states for bar charts", () => {
    const { container, rerender } = render(
      <BarChartCard
        data={[]}
        loading
        index="month"
        categories={["sales"]}
      />
    )

    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0)
    expect(screen.queryByTestId("tremor-bar-chart")).not.toBeInTheDocument()

    rerender(
      <BarChartCard
        data={[]}
        index="month"
        categories={["sales"]}
        emptyLabel="Nothing to show"
      />
    )
    expect(screen.getByText("Nothing to show")).toBeInTheDocument()

    rerender(
      <BarChartCard data={categoricalRows} index="month" categories={["sales"]} />
    )
    expect(screen.getByTestId("tremor-bar-chart")).toBeInTheDocument()
  })

  it("renders area, line, combo and scatter charts", () => {
    const { rerender } = render(
      <AreaChartCard data={categoricalRows} index="month" categories={["sales"]} />
    )
    expect(screen.getByTestId("tremor-area-chart")).toBeInTheDocument()

    rerender(
      <LineChartCard data={categoricalRows} index="month" categories={["sales"]} />
    )
    expect(screen.getByTestId("tremor-line-chart")).toBeInTheDocument()

    rerender(
      <ComboChartCard
        data={categoricalRows}
        index="month"
        categories={["sales"]}
        type="line"
      />
    )
    expect(screen.getByTestId("tremor-bar-chart")).toBeInTheDocument()

    rerender(
      <ScatterChartCard
        data={categoricalRows}
        x="sales"
        y="returns"
        category="month"
      />
    )
    expect(screen.getByTestId("tremor-scatter-chart")).toBeInTheDocument()
  })

  it("covers loading, empty, and no-card branches for area/line/combo/scatter", () => {
    const sharedEmptyLabel = "No branch data"
    const cases = [
      {
        testId: "tremor-area-chart",
        renderChart: (props: {
          loading?: boolean
          withCard?: boolean
          emptyLabel?: string
          data?: typeof categoricalRows
        }) => (
          <AreaChartCard
            data={categoricalRows}
            index="month"
            categories={["sales"]}
            {...props}
          />
        ),
      },
      {
        testId: "tremor-line-chart",
        renderChart: (props: {
          loading?: boolean
          withCard?: boolean
          emptyLabel?: string
          data?: typeof categoricalRows
        }) => (
          <LineChartCard
            data={categoricalRows}
            index="month"
            categories={["sales"]}
            {...props}
          />
        ),
      },
      {
        testId: "tremor-bar-chart",
        renderChart: (props: {
          loading?: boolean
          withCard?: boolean
          emptyLabel?: string
          data?: typeof categoricalRows
        }) => (
          <ComboChartCard
            data={categoricalRows}
            index="month"
            categories={["sales"]}
            type="line"
            {...props}
          />
        ),
      },
      {
        testId: "tremor-scatter-chart",
        renderChart: (props: {
          loading?: boolean
          withCard?: boolean
          emptyLabel?: string
          data?: typeof categoricalRows
        }) => (
          <ScatterChartCard
            data={categoricalRows}
            x="sales"
            y="returns"
            category="month"
            {...props}
          />
        ),
      },
    ] as const

    for (const chartCase of cases) {
      const view = render(
        chartCase.renderChart({
          loading: true,
          withCard: false,
          data: [],
        })
      )
      expect(
        view.container.querySelectorAll("[data-slot='skeleton']").length
      ).toBeGreaterThan(0)

      view.rerender(
        chartCase.renderChart({
          data: [],
          withCard: false,
          emptyLabel: sharedEmptyLabel,
        })
      )
      expect(screen.getByText(sharedEmptyLabel)).toBeInTheDocument()

      view.rerender(
        chartCase.renderChart({
          data: categoricalRows,
          withCard: false,
        })
      )
      expect(screen.getByTestId(chartCase.testId)).toBeInTheDocument()
      view.unmount()
    }
  })

  it("renders donut and funnel charts with compatible rows", () => {
    const donutRows = [
      { segment: "A", total: 12 },
      { segment: "B", total: 8 },
    ]
    const funnelRows = [
      { name: "Visited", value: 120 },
      { name: "Signed Up", value: 64 },
    ]

    const { rerender } = render(
      <DonutChartCard data={donutRows} index="segment" category="total" />
    )
    expect(screen.getByTestId("tremor-donut-chart")).toBeInTheDocument()

    rerender(<FunnelChartCard data={funnelRows} />)
    expect(screen.getByTestId("tremor-funnel-chart")).toBeInTheDocument()
  })

  it("covers loading, empty, and no-card branches for donut and funnel charts", () => {
    const donutRows = [
      { segment: "A", total: 12 },
      { segment: "B", total: 8 },
    ]
    const funnelRows = [
      { name: "Visited", value: 120 },
      { name: "Signed Up", value: 64 },
    ]

    const donutView = render(
      <DonutChartCard
        data={[]}
        loading
        withCard={false}
        index="segment"
        category="total"
      />
    )
    expect(
      donutView.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBeGreaterThan(0)
    donutView.rerender(
      <DonutChartCard
        data={[]}
        withCard={false}
        emptyLabel="No donut slices"
        index="segment"
        category="total"
      />
    )
    expect(screen.getByText("No donut slices")).toBeInTheDocument()
    donutView.rerender(
      <DonutChartCard
        data={donutRows}
        withCard={false}
        index="segment"
        category="total"
      />
    )
    expect(screen.getByTestId("tremor-donut-chart")).toBeInTheDocument()

    const funnelView = render(
      <FunnelChartCard data={[]} loading withCard={false} />
    )
    expect(
      funnelView.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBeGreaterThan(0)
    funnelView.rerender(
      <FunnelChartCard data={[]} withCard={false} emptyLabel="No funnel rows" />
    )
    expect(screen.getByText("No funnel rows")).toBeInTheDocument()
    funnelView.rerender(<FunnelChartCard data={funnelRows} withCard={false} />)
    expect(screen.getByTestId("tremor-funnel-chart")).toBeInTheDocument()
  })

  it("renders bar-list, data-bars and category-bar variants", () => {
    const singleSeries = adaptCubeSingleSeriesCategorical(
      {
        rows: [
          { segment: "Open", amount: 5 },
          { segment: "Closed", amount: 3 },
        ],
      },
      {
        dimensionKey: "segment",
        measureKey: "amount",
        indexKey: "name",
      }
    )
    const stacked = adaptCubeStackedSegments(
      {
        rows: [
          { region: "North", status: "active", value: 4 },
          { region: "North", status: "paused", value: 2 },
          { region: "South", status: "active", value: 3 },
        ],
      },
      {
        categoryKey: "region",
        segmentKey: "status",
        measureKey: "value",
      }
    )

    const pairs = toNameValuePairs(singleSeries)
    const totals = toCategoryBarValues(stacked)

    const { rerender } = render(<BarListCard data={pairs} />)
    expect(screen.getByTestId("tremor-bar-list")).toBeInTheDocument()

    rerender(<DataBars data={pairs} />)
    expect(screen.getByTestId("tremor-bar-chart")).toBeInTheDocument()

    rerender(<CategoryBarCard values={totals} />)
    expect(screen.getByTestId("tremor-category-bar")).toBeInTheDocument()
  })

  it("covers loading, empty, and no-card branches for bar-list/data-bars/category-bar", () => {
    const rows = [
      { name: "Open", value: 5 },
      { name: "Closed", value: 3 },
    ]
    const values = [5, 3]

    const barListView = render(
      <BarListCard data={[]} loading withCard={false} />
    )
    expect(
      barListView.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBeGreaterThan(0)
    barListView.rerender(
      <BarListCard
        data={[]}
        withCard={false}
        emptyLabel="No list data"
      />
    )
    expect(screen.getByText("No list data")).toBeInTheDocument()
    barListView.rerender(<BarListCard data={rows} withCard={false} />)
    expect(screen.getByTestId("tremor-bar-list")).toBeInTheDocument()

    const dataBarsView = render(
      <DataBars data={[]} loading withCard={false} />
    )
    expect(
      dataBarsView.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBeGreaterThan(0)
    dataBarsView.rerender(
      <DataBars data={[]} withCard={false} emptyLabel="No bars" />
    )
    expect(screen.getByText("No bars")).toBeInTheDocument()
    dataBarsView.rerender(<DataBars data={rows} withCard={false} />)
    expect(screen.getByTestId("tremor-bar-chart")).toBeInTheDocument()

    const categoryView = render(
      <CategoryBarCard values={[]} loading withCard={false} />
    )
    expect(
      categoryView.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBeGreaterThan(0)
    categoryView.rerender(
      <CategoryBarCard values={[]} withCard={false} emptyLabel="No segments" />
    )
    expect(screen.getByText("No segments")).toBeInTheDocument()
    categoryView.rerender(<CategoryBarCard values={values} withCard={false} />)
    expect(screen.getByTestId("tremor-category-bar")).toBeInTheDocument()
  })

  it("renders spark charts and chart-type switcher", () => {
    const sparkRows = [
      { x: "a", y: 1 },
      { x: "b", y: 2 },
    ]

    const { rerender } = render(
      <SparkLineChartCard data={sparkRows} index="x" categories={["y"]} />
    )
    expect(screen.getByTestId("tremor-spark-line-chart")).toBeInTheDocument()

    rerender(<SparkAreaChartCard data={sparkRows} index="x" categories={["y"]} />)
    expect(screen.getByTestId("tremor-spark-area-chart")).toBeInTheDocument()

    rerender(<SparkBarChartCard data={sparkRows} index="x" categories={["y"]} />)
    expect(screen.getByTestId("tremor-spark-bar-chart")).toBeInTheDocument()

    rerender(<SparkChart type="line" data={sparkRows} index="x" categories={["y"]} />)
    expect(screen.getByTestId("tremor-spark-line-chart")).toBeInTheDocument()

    rerender(<SparkChart type="area" data={sparkRows} index="x" categories={["y"]} />)
    expect(screen.getByTestId("tremor-spark-area-chart")).toBeInTheDocument()

    rerender(<SparkChart type="bar" data={sparkRows} index="x" categories={["y"]} />)
    expect(screen.getByTestId("tremor-spark-bar-chart")).toBeInTheDocument()
  })

  it("covers loading, empty, and no-card branches for spark chart variants", () => {
    const sparkRows = [
      { x: "a", y: 1 },
      { x: "b", y: 2 },
    ]

    const lineView = render(
      <SparkLineChartCard data={[]} loading withCard={false} index="x" categories={["y"]} />
    )
    expect(
      lineView.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBeGreaterThan(0)
    lineView.rerender(
      <SparkLineChartCard
        data={[]}
        withCard={false}
        index="x"
        categories={["y"]}
        emptyLabel="No spark line"
      />
    )
    expect(screen.getByText("No spark line")).toBeInTheDocument()
    lineView.rerender(
      <SparkLineChartCard
        data={sparkRows}
        withCard={false}
        index="x"
        categories={["y"]}
      />
    )
    expect(screen.getByTestId("tremor-spark-line-chart")).toBeInTheDocument()

    const areaView = render(
      <SparkAreaChartCard data={[]} loading withCard={false} index="x" categories={["y"]} />
    )
    expect(
      areaView.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBeGreaterThan(0)
    areaView.rerender(
      <SparkAreaChartCard
        data={[]}
        withCard={false}
        index="x"
        categories={["y"]}
        emptyLabel="No spark area"
      />
    )
    expect(screen.getByText("No spark area")).toBeInTheDocument()
    areaView.rerender(
      <SparkAreaChartCard
        data={sparkRows}
        withCard={false}
        index="x"
        categories={["y"]}
      />
    )
    expect(screen.getByTestId("tremor-spark-area-chart")).toBeInTheDocument()

    const barView = render(
      <SparkBarChartCard data={[]} loading withCard={false} index="x" categories={["y"]} />
    )
    expect(
      barView.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBeGreaterThan(0)
    barView.rerender(
      <SparkBarChartCard
        data={[]}
        withCard={false}
        index="x"
        categories={["y"]}
        emptyLabel="No spark bar"
      />
    )
    expect(screen.getByText("No spark bar")).toBeInTheDocument()
    barView.rerender(
      <SparkBarChartCard
        data={sparkRows}
        withCard={false}
        index="x"
        categories={["y"]}
      />
    )
    expect(screen.getByTestId("tremor-spark-bar-chart")).toBeInTheDocument()
  })

  it("renders progress and tracker cards", () => {
    const { rerender } = render(<ProgressBarCard value={55} />)
    expect(screen.getByTestId("tremor-progress-bar")).toBeInTheDocument()

    rerender(<ProgressCircleCard value={75} />)
    expect(screen.getByTestId("tremor-progress-circle")).toBeInTheDocument()

    rerender(<TrackerCard data={[{ color: "blue" }, { color: "emerald" }]} />)
    expect(screen.getByTestId("tremor-tracker")).toBeInTheDocument()
  })

  it("covers loading and no-card branches for progress and tracker cards", () => {
    const progressView = render(
      <ProgressBarCard value={50} loading withCard={false} />
    )
    expect(
      progressView.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBeGreaterThan(0)
    progressView.rerender(<ProgressBarCard value={50} withCard={false} />)
    expect(screen.getByTestId("tremor-progress-bar")).toBeInTheDocument()

    const progressCircleView = render(
      <ProgressCircleCard value={40} loading withCard={false} />
    )
    expect(
      progressCircleView.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBeGreaterThan(0)
    progressCircleView.rerender(
      <ProgressCircleCard value={40} withCard={false} />
    )
    expect(screen.getByTestId("tremor-progress-circle")).toBeInTheDocument()

    const trackerView = render(
      <TrackerCard data={[{ color: "blue" }]} loading withCard={false} />
    )
    expect(
      trackerView.container.querySelectorAll("[data-slot='skeleton']").length
    ).toBeGreaterThan(0)
    trackerView.rerender(
      <TrackerCard data={[{ color: "blue" }, { color: "emerald" }]} withCard={false} />
    )
    expect(screen.getByTestId("tremor-tracker")).toBeInTheDocument()
  })

  it("renders chart data generated from the multi-series adapter", () => {
    const adapted = adaptCubeMultiSeriesCategorical(
      {
        rows: [
          { region: "East", metric: "Revenue", value: 10 },
          { region: "East", metric: "Cost", value: 7 },
          { region: "West", metric: "Revenue", value: 14 },
          { region: "West", metric: "Cost", value: 9 },
        ],
      },
      {
        categoryKey: "region",
        seriesKey: "metric",
        measureKey: "value",
      }
    )

    render(
      <BarChartCard
        data={adapted.data}
        index={adapted.indexKey}
        categories={adapted.categories}
        showLegend
        showTooltip
      />
    )

    const chart = screen.getByTestId("tremor-bar-chart")
    expect(chart).toHaveAttribute("data-data-length", "2")
    expect(chart).toHaveAttribute("data-show-legend", "true")
    expect(chart).toHaveAttribute("data-show-tooltip", "true")
  })

})
