const {
  createTempWorkspace,
  removeTempWorkspace,
  readFile,
  fileExists,
} = require("../helpers/workspace");
const { runCreateBlock } = require("../helpers/cli");

describe("create:block smoke tests", () => {
  function withWorkspace(run) {
    const workspaceRoot = createTempWorkspace("create-block-smoke-");

    try {
      return run(workspaceRoot);
    } finally {
      removeTempWorkspace(workspaceRoot);
    }
  }

  it("lists available blocks", () => {
    withWorkspace((workspaceRoot) => {
      const result = runCreateBlock(["--list"], { workspaceRoot });

      expect(result.stdout).toContain("next-app");
      expect(result.stdout).toContain("nest-app");
      expect(result.stdout).toContain("api-updator");
    });
  });

  it("creates a Next app and health route", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        [
          "--block",
          "next-app",
          "--name",
          "smoke-web",
          "--port",
          "3400",
          "--skip-install",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, "apps/smoke-web/package.json")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/smoke-web/src/app/api/health/route.ts")).toBe(true);
    });
  });

  it("creates a Nest app", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        [
          "--block",
          "nest-app",
          "--name",
          "smoke-api",
          "--port",
          "3401",
          "--skip-install",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, "apps/smoke-api/src/main.ts")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/smoke-api/src/health/health.controller.ts")).toBe(true);
    });
  });

  it("generates api-updator artifacts with search enabled by default", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        ["--block", "nest-app", "--name", "api-default", "--skip-install"],
        { workspaceRoot }
      );

      runCreateBlock(
        [
          "--block",
          "api-updator",
          "--app",
          "api-default",
          "--model",
          "User",
          "--skip-db-generate",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, "apps/api-default/src/users/dto/search-user.dto.ts")).toBe(true);

      const controller = readFile(workspaceRoot, "apps/api-default/src/users/users.controller.ts");
      const service = readFile(workspaceRoot, "apps/api-default/src/users/users.service.ts");

      expect(controller).toContain('@Post("search")');
      expect(controller).toContain('required: ["metadata", "data"]');
      expect(service).toContain("createPaginatedResponse");
    });
  });

  it("omits search artifacts when --search false is passed", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        ["--block", "nest-app", "--name", "api-no-search", "--skip-install"],
        { workspaceRoot }
      );

      runCreateBlock(
        [
          "--block",
          "api-updator",
          "--app",
          "api-no-search",
          "--model",
          "User",
          "--search",
          "false",
          "--skip-db-generate",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, "apps/api-no-search/src/users/dto/search-user.dto.ts")).toBe(false);

      const controller = readFile(workspaceRoot, "apps/api-no-search/src/users/users.controller.ts");
      expect(controller).not.toContain('@Post("search")');
    });
  });

  it("supports --all model discovery from prisma schema", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        ["--block", "nest-app", "--name", "api-all", "--skip-install"],
        { workspaceRoot }
      );

      runCreateBlock(
        [
          "--block",
          "api-updator",
          "--app",
          "api-all",
          "--all",
          "--skip-db-generate",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, "apps/api-all/src/users/users.module.ts")).toBe(true);
    });
  });

  it("preserves passthrough args after a standalone -- token", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        [
          "--block",
          "next-app",
          "--",
          "--name",
          "passthrough-web",
          "--skip-install",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, "apps/passthrough-web/package.json")).toBe(true);
    });
  });
});
