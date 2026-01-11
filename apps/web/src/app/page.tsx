import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui";

const highlights = [
  { label: "Blocks generated", value: "24", change: "+4 this week" },
  { label: "Shared components", value: "32", change: "UI package" },
  { label: "Tests passing", value: "118", change: "typecheck + vitest" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="space-y-4">
          <Badge variant="secondary" className="uppercase tracking-wide">
            solid-auto app blocks
          </Badge>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Shared Shadcn primitives, packaged for the monorepo.
            </h1>
            <p className="text-lg text-muted-foreground">
              Components live in <code>@workspace/ui</code> and stay in sync
              across Next.js and Nest modules. Add new primitives once, consume
              them everywhere.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg">Browse UI kit</Button>
            <Button size="lg" variant="outline">
              Run a generator
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((item) => (
            <Card key={item.label}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </CardTitle>
                <CardDescription className="text-3xl font-semibold text-foreground">
                  {item.value}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {item.change}
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline">UI package demo</Badge>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-sm text-muted-foreground">
                Buttons, tabs, and cards live in @workspace/ui
              </span>
            </div>
            <CardTitle>Starter layout</CardTitle>
            <CardDescription>
              A quick preview of the shared primitives you get out of the box.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Ghosted</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <Tabs defaultValue="deploy" className="space-y-4">
              <TabsList>
                <TabsTrigger value="deploy">Deploy</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
                <TabsTrigger value="testing">Testing</TabsTrigger>
              </TabsList>
              <TabsContent
                value="deploy"
                className="rounded-lg border bg-muted/40 p-4 text-sm"
              >
                Templates for Vercel + Render are ready in <code>/deploy</code>.
                UI stays consistent across apps by importing{" "}
                <code>@workspace/ui/styles/globals.css</code>.
              </TabsContent>
              <TabsContent
                value="contracts"
                className="rounded-lg border bg-muted/40 p-4 text-sm"
              >
                Contracts + DTOs live next to Prisma in{" "}
                <code>packages/database</code>. Consume them from web + api
                blocks without duplication.
              </TabsContent>
              <TabsContent
                value="testing"
                className="rounded-lg border bg-muted/40 p-4 text-sm"
              >
                Vitest and Testing Library are wired for component smoke tests.
                Add Playwright for e2e when a flow stabilizes.
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
