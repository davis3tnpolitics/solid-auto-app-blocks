const {
  createTempWorkspace,
  removeTempWorkspace,
  readFile,
  fileExists,
  writeJson,
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
      expect(result.stdout).toContain("cube-app");
      expect(result.stdout).toContain("api-updator");
      expect(result.stdout).toContain("cube-service-updator");
      expect(result.stdout).toContain("github-workflow-app");
      expect(result.stdout).toContain("next-crud-pages");
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
      expect(fileExists(workspaceRoot, ".github/workflows/app-smoke-web-ci.yml")).toBe(true);
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
      expect(fileExists(workspaceRoot, ".github/workflows/app-smoke-api-ci.yml")).toBe(true);
    });
  });

  it("creates a Cube app (template fallback mode)", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        [
          "--block",
          "cube-app",
          "--name",
          "smoke-cube",
          "--port",
          "4400",
          "--skip-install",
          "--skip-cube-cli",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, "apps/smoke-cube/package.json")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/smoke-cube/cube.js")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/smoke-cube/model/Health.js")).toBe(true);
      expect(fileExists(workspaceRoot, ".github/workflows/app-smoke-cube-ci.yml")).toBe(true);

      const packageJson = readFile(workspaceRoot, "apps/smoke-cube/package.json");
      expect(packageJson).toContain("@cubejs-backend/server");
      expect(packageJson).toContain("\"cube-helpers\": \"workspace:*\"");
    });
  });

  it("supports opt-out of generated app workflow files", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        [
          "--block",
          "next-app",
          "--name",
          "skip-ci-web",
          "--skip-install",
          "--skip-ci-workflow",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, "apps/skip-ci-web/package.json")).toBe(true);
      expect(fileExists(workspaceRoot, ".github/workflows/app-skip-ci-web-ci.yml")).toBe(false);
    });
  });

  it("can generate app workflows with dedicated block", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        [
          "--block",
          "next-app",
          "--name",
          "manual-ci-web",
          "--skip-install",
          "--skip-ci-workflow",
        ],
        { workspaceRoot }
      );

      runCreateBlock(
        [
          "--block",
          "github-workflow-app",
          "--app",
          "manual-ci-web",
          "--framework",
          "next",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, ".github/workflows/app-manual-ci-web-ci.yml")).toBe(true);
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
      const searchDto = readFile(
        workspaceRoot,
        "apps/api-default/src/users/dto/search-user.dto.ts"
      );

      expect(controller).toContain('@Post("search")');
      expect(controller).toContain('required: ["metadata", "data"]');
      expect(controller).toContain('required: ["pageSize", "count", "pageCount", "pageNumber"]');
      expect(service).toContain("createPaginatedResponse");
      expect(service).toContain("paginate(query)");
      expect(service).toContain("async search(query: SearchUserDto)");
      expect(service).toContain("orderBy");
      expect(searchDto).toContain("export class SearchUserDto extends PaginationQueryDto");
      expect(searchDto).toContain("export class UserSearchFiltersDto");
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

  it("supports explicit Prisma omit fields in generated service responses", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        ["--block", "nest-app", "--name", "api-omit", "--skip-install"],
        { workspaceRoot }
      );

      runCreateBlock(
        [
          "--block",
          "api-updator",
          "--app",
          "api-omit",
          "--model",
          "User",
          "--omit-fields",
          "email",
          "--skip-db-generate",
        ],
        { workspaceRoot }
      );

      const service = readFile(workspaceRoot, "apps/api-omit/src/users/users.service.ts");
      expect(service).toContain("private readonly responseOmit");
      expect(service).toContain("email: true");
      expect(service).toContain("omit: this.responseOmit");
    });
  });

  it("generates Next CRUD hooks and pages for a model", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        [
          "--block",
          "next-app",
          "--name",
          "crud-web",
          "--skip-install",
          "--skip-ci-workflow",
        ],
        { workspaceRoot }
      );

      runCreateBlock(
        [
          "--block",
          "next-crud-pages",
          "--app",
          "crud-web",
          "--model",
          "User",
          "--layout",
          "cards",
          "--list-mode",
          "infinite",
          "--form-style",
          "two-column",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, "apps/crud-web/src/lib/api/client.ts")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/crud-web/src/lib/users/hooks.ts")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/crud-web/src/lib/users/overrides.ts")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/crud-web/src/lib/users/config.ts")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/crud-web/src/app/users/page.tsx")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/crud-web/src/app/users/[id]/page.tsx")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/crud-web/src/app/users/create/page.tsx")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/crud-web/src/app/users/[id]/edit/page.tsx")).toBe(true);

      const listPage = readFile(workspaceRoot, "apps/crud-web/src/app/users/page.tsx");
      const config = readFile(workspaceRoot, "apps/crud-web/src/lib/crud/ui-config.ts");
      const packageJson = readFile(workspaceRoot, "apps/crud-web/package.json");

      expect(listPage).toContain("CrudList");
      expect(listPage).toContain("CrudTable");
      expect(listPage).toContain("useInfiniteUsers");
      expect(listPage).toContain("fetchNextPage");
      expect(config).toContain('layout: "cards"');
      expect(config).toContain('listMode: "infinite"');
      expect(config).toContain('formStyle: "two-column"');
      expect(packageJson).toContain("@tanstack/react-query");
      expect(packageJson).toContain("axios");

      const hooks = readFile(workspaceRoot, "apps/crud-web/src/lib/users/hooks.ts");
      expect(hooks).toContain("onMutate");
      expect(hooks).toContain("onError");
      expect(hooks).toContain("patchListItems");
      expect(hooks).toContain("queryClient.cancelQueries");
    });
  });

  it("generates Cube analytics services from Prisma contracts", () => {
    withWorkspace((workspaceRoot) => {
      runCreateBlock(
        ["--block", "nest-app", "--name", "cube-api", "--skip-install"],
        { workspaceRoot }
      );

      runCreateBlock(
        [
          "--block",
          "cube-service-updator",
          "--app",
          "cube-api",
          "--model",
          "User",
          "--skip-db-generate",
          "--tenant-field",
          "organizationId",
        ],
        { workspaceRoot }
      );

      expect(fileExists(workspaceRoot, "apps/cube-api/src/analytics/cubes/user.cube.ts")).toBe(true);
      expect(fileExists(workspaceRoot, "apps/cube-api/src/analytics/contracts/user.analytics.ts")).toBe(
        true
      );
      expect(fileExists(workspaceRoot, "apps/cube-api/src/analytics/index.ts")).toBe(true);

      const cube = readFile(workspaceRoot, "apps/cube-api/src/analytics/cubes/user.cube.ts");
      const contract = readFile(
        workspaceRoot,
        "apps/cube-api/src/analytics/contracts/user.analytics.ts"
      );
      const packageJson = readFile(workspaceRoot, "apps/cube-api/package.json");

      expect(cube).toContain('cube: "Users"');
      expect(cube).toContain("createDefaultMeasures");
      expect(cube).toContain("requiredFilters: [\"organizationId\"]");
      expect(contract).toContain("userAnalyticsContract");
      expect(contract).toContain('scopedFilters: ["organizationId"]');
      expect(packageJson).toContain("\"cube-helpers\": \"workspace:*\"");
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

  it("supports --dry-run without writing files", () => {
    withWorkspace((workspaceRoot) => {
      const result = runCreateBlock(
        [
          "--block",
          "next-app",
          "--dry-run",
          "--name",
          "dry-run-web",
          "--skip-install",
        ],
        { workspaceRoot }
      );

      expect(result.stdout).toContain("[dry-run]");
      expect(fileExists(workspaceRoot, "apps/dry-run-web/package.json")).toBe(false);
    });
  });

  it("fails on unknown flags for a block manifest", () => {
    withWorkspace((workspaceRoot) => {
      const result = runCreateBlock(
        ["--block", "next-app", "--name", "bad-web", "--not-a-real-flag"],
        { workspaceRoot, allowFailure: true }
      );

      expect(result.status).not.toBe(0);
      expect(result.output).toContain('Unknown flag "--not-a-real-flag"');
    });
  });

  it("fails when required manifest options are missing", () => {
    withWorkspace((workspaceRoot) => {
      const result = runCreateBlock(["--block", "next-app", "--skip-install"], {
        workspaceRoot,
        allowFailure: true,
      });

      expect(result.status).not.toBe(0);
      expect(result.output).toContain('Missing required option "--name"');
    });
  });

  it("fails with a clear error for malformed manifest options", () => {
    withWorkspace((workspaceRoot) => {
      writeJson(workspaceRoot, "automations/manifests/next-app.json", {
        name: "next-app",
        description: "broken on purpose",
        entry: "node automations/generators/next-app.js",
        outputs: ["apps/<name>/**"],
      });

      const result = runCreateBlock(["--list"], {
        workspaceRoot,
        allowFailure: true,
      });

      expect(result.status).not.toBe(0);
      expect(result.output).toContain('is missing an "options" array');
    });
  });

  it("fails on invalid boolean values for boolean options", () => {
    withWorkspace((workspaceRoot) => {
      const result = runCreateBlock(
        ["--block", "next-app", "--name", "invalid-bool-web", "--skip-install", "maybe"],
        { workspaceRoot, allowFailure: true }
      );

      expect(result.status).not.toBe(0);
      expect(result.output).toContain('Invalid boolean value for "--skip-install"');
    });
  });

  it("fails when non-boolean options are passed without values", () => {
    withWorkspace((workspaceRoot) => {
      const result = runCreateBlock(["--block", "next-app", "--name", "missing-port", "--port"], {
        workspaceRoot,
        allowFailure: true,
      });

      expect(result.status).not.toBe(0);
      expect(result.output).toContain('Option "--port" requires a numeric value.');
    });
  });
});
