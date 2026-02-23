const path = require("path");

const modulePath = path.resolve(__dirname, "../../../generators/github-workflow-app.js");

describe("github-workflow-app unit logic", () => {
  it("normalizes workflow slugs from app names", () => {
    const { normalizeWorkflowSlug } = require(modulePath);

    expect(normalizeWorkflowSlug("My App")).toBe("my-app");
    expect(normalizeWorkflowSlug("api_v2")).toBe("api-v2");
    expect(normalizeWorkflowSlug("---Admin---Portal---")).toBe("admin-portal");
  });

  it("renders app workflow with core CI steps", () => {
    const { createWorkflowContent } = require(modulePath);

    const content = createWorkflowContent({
      appName: "smoke-web",
      workflowSlug: "smoke-web",
      framework: "next",
    });

    expect(content).toContain('name: App CI (smoke-web)');
    expect(content).toContain('"apps/smoke-web/**"');
    expect(content).toContain("pnpm --filter smoke-web lint");
    expect(content).toContain("pnpm --filter smoke-web typecheck");
    expect(content).toContain("pnpm --filter smoke-web build");
    expect(content).toContain("if: ${{ false }}");
  });
});
