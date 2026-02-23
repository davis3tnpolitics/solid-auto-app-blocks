const {
  createTempWorkspace,
  removeTempWorkspace,
  fileExists,
  writeJson,
} = require("../helpers/workspace");
const { runCreateWorkflow } = require("../helpers/cli");

describe("create:workflow smoke tests", () => {
  function withWorkspace(run) {
    const workspaceRoot = createTempWorkspace("create-workflow-smoke-");

    try {
      return run(workspaceRoot);
    } finally {
      removeTempWorkspace(workspaceRoot);
    }
  }

  it("lists available workflows", () => {
    withWorkspace((workspaceRoot) => {
      const result = runCreateWorkflow(["--list"], { workspaceRoot });

      expect(result.stdout).toContain("examples");
    });
  });

  it("runs the examples workflow and generates all expected apps/resources", () => {
    withWorkspace((workspaceRoot) => {
      runCreateWorkflow(
        [
          "--workflow",
          "examples",
          "--web",
          "workflow-web",
          "--api",
          "workflow-api",
          "--model",
          "User",
          "--skip-db-generate",
          "true",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, "apps/workflow-web/package.json")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/workflow-api/src/main.ts")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/workflow-api/src/users/users.controller.ts")).toBe(true);
    });
  });

  it("supports dry-run without writing files", () => {
    withWorkspace((workspaceRoot) => {
      const result = runCreateWorkflow(
        ["--workflow", "examples", "--web", "dry-run-web", "--dry-run"],
        { workspaceRoot }
      );

      expect(result.stdout).toContain("[dry-run]");
      expect(fileExists(workspaceRoot, "apps/dry-run-web/package.json")).toBe(false);
    });
  });

  it("resolves step dependencies regardless of declaration order", () => {
    withWorkspace((workspaceRoot) => {
      writeJson(workspaceRoot, "automations/workflows/ordered.json", {
        name: "ordered",
        description: "dependency ordering test",
        variables: {
          web: "ordered-web",
          api: "ordered-api",
        },
        steps: [
          {
            id: "api",
            block: "nest-app",
            dependsOn: ["web"],
            args: ["--name", "{{api}}", "--skip-install"],
          },
          {
            id: "web",
            block: "next-app",
            args: ["--name", "{{web}}", "--skip-install"],
          },
        ],
      });

      const result = runCreateWorkflow(["--workflow", "ordered"], { workspaceRoot });

      expect(fileExists(workspaceRoot, "apps/ordered-web/package.json")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/ordered-api/src/main.ts")).toBe(true);

      const webIndex = result.output.indexOf('"--block" "next-app"');
      const apiIndex = result.output.indexOf('"--block" "nest-app"');
      expect(webIndex).toBeGreaterThanOrEqual(0);
      expect(apiIndex).toBeGreaterThan(webIndex);
    });
  });

  it("fails when a workflow variable is missing", () => {
    withWorkspace((workspaceRoot) => {
      writeJson(workspaceRoot, "automations/workflows/missing-var.json", {
        name: "missing-var",
        description: "missing var test",
        steps: [
          {
            id: "web",
            block: "next-app",
            args: ["--name", "{{missingName}}", "--skip-install"],
          },
        ],
      });

      const result = runCreateWorkflow(["--workflow", "missing-var"], {
        workspaceRoot,
        allowFailure: true,
      });

      expect(result.status).not.toBe(0);
      expect(result.output).toContain('Missing workflow variable "missingName"');
    });
  });
});
