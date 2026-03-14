const fs = require("fs");
const path = require("path");

const {
  createTempWorkspace,
  removeTempWorkspace,
  writeFile,
} = require("../helpers/workspace");

const generatorModulePath = path.resolve(
  __dirname,
  "../../../generators/next-analytics-pages.js"
);
const sharedUtilsModulePath = path.resolve(
  __dirname,
  "../../../generators/_shared/utils.js"
);

function loadGeneratorForWorkspace(workspaceRoot) {
  const previous = process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT;

  process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT = workspaceRoot;
  delete require.cache[sharedUtilsModulePath];
  delete require.cache[generatorModulePath];

  const generator = require(generatorModulePath);

  if (previous === undefined) {
    delete process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT;
  } else {
    process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT = previous;
  }

  return generator;
}

describe("next-analytics-pages unit logic", () => {
  it("normalizes route base, profile, layout, and granularity options", () => {
    const {
      normalizeRouteBase,
      normalizeProfile,
      normalizeLayout,
      normalizeGranularity,
    } = require(generatorModulePath);

    expect(normalizeRouteBase("analytics")).toBe("analytics");
    expect(normalizeRouteBase("/insights/Revenue/")).toBe("insights/revenue");
    expect(normalizeProfile("operations")).toBe("operations");
    expect(normalizeLayout("split")).toBe("split");
    expect(normalizeGranularity("month")).toBe("month");

    expect(() => normalizeProfile("custom")).toThrow(/Invalid --profile value/);
    expect(() => normalizeLayout("grid")).toThrow(/Invalid --layout value/);
    expect(() => normalizeGranularity("hour")).toThrow(/Invalid --default-grain value/);
  });

  it("parses generated analytics contracts", () => {
    const { parseAnalyticsContractSource } = require(generatorModulePath);

    const spec = parseAnalyticsContractSource(
      `import type { AnalyticsQueryContract } from "cube-helpers";

export const userAnalyticsContract: AnalyticsQueryContract = {
  cube: "Users",
  dimensions: ["id", "email"],
  measures: ["count", "sumAge"],
  totals: ["count"],
  timeDimensions: ["createdAt"],
  defaultTimeDimension: "createdAt",
  scopedFilters: ["organizationId"],
};
`,
      "user.analytics.ts"
    );

    expect(spec.modelName).toBe("User");
    expect(spec.contractName).toBe("userAnalyticsContract");
    expect(spec.cube).toBe("Users");
    expect(spec.dimensions).toEqual(["id", "email"]);
    expect(spec.measures).toEqual(["count", "sumAge"]);
    expect(spec.totals).toEqual(["count"]);
    expect(spec.timeDimensions).toEqual(["createdAt"]);
    expect(spec.defaultTimeDimension).toBe("createdAt");
    expect(spec.scopedFilters).toEqual(["organizationId"]);
    expect(spec.routeSegment).toBe("users");
  });

  it("discovers all analytics contract specs from analytics app directory", () => {
    const tempRoot = createTempWorkspace("next-analytics-contracts-");

    try {
      writeFile(
        tempRoot,
        "apps/api/src/analytics/contracts/user.analytics.ts",
        `export const userAnalyticsContract = {
  cube: "Users",
  dimensions: ["id"],
  measures: ["count"],
  totals: ["count"],
  timeDimensions: ["createdAt"],
  defaultTimeDimension: "createdAt",
  scopedFilters: [],
} as const;
`
      );

      writeFile(
        tempRoot,
        "apps/api/src/analytics/contracts/account.analytics.ts",
        `export const accountAnalyticsContract = {
  cube: "Accounts",
  dimensions: ["id"],
  measures: ["count"],
  totals: ["count"],
  timeDimensions: [],
  defaultTimeDimension: undefined,
  scopedFilters: [],
} as const;
`
      );

      const { readAnalyticsContractSpecs } = loadGeneratorForWorkspace(tempRoot);
      const specs = readAnalyticsContractSpecs(path.join(tempRoot, "apps", "api"));
      expect(specs.map((entry) => entry.modelName)).toEqual(["Account", "User"]);
    } finally {
      removeTempWorkspace(tempRoot);
    }
  });

  it("respects no-auto-update and force behavior when writing files", () => {
    const tempRoot = createTempWorkspace("next-analytics-write-");
    const targetPath = path.join(tempRoot, "apps", "web", "src", "lib", "analytics", "client.ts");

    try {
      const { writeFileRespectingDirective } = loadGeneratorForWorkspace(tempRoot);

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, "original", "utf8");

      writeFileRespectingDirective(targetPath, "updated", false);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("original");

      writeFileRespectingDirective(targetPath, "updated", true);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("updated");

      fs.writeFileSync(targetPath, "/* no-auto-update */\nprotected", "utf8");
      writeFileRespectingDirective(targetPath, "should-not-change", true);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("/* no-auto-update */\nprotected");
    } finally {
      removeTempWorkspace(tempRoot);
    }
  });

  it("generates Cube proxy route with hardened error handling", () => {
    const { createCubeProxyRouteFile } = require(generatorModulePath);
    const routeSource = createCubeProxyRouteFile();

    expect(routeSource).toContain('process.env.CUBE_API_URL');
    expect(routeSource).toContain('process.env.NEXT_PUBLIC_CUBE_API_URL');
    expect(routeSource).toContain('process.env.CUBE_API_TOKEN');
    expect(routeSource).not.toContain('NEXT_PUBLIC_CUBE_API_TOKEN');
    expect(routeSource).toContain("/cubejs-api/v1/load");
    expect(routeSource).toContain('{ status: 400 }');
    expect(routeSource).toContain('{ status: 502 }');
    expect(routeSource).toContain('Cube API returned a non-success response.');
  });

  it("generates Cube load client helper instead of route-specific analytics fetch helper", () => {
    const { createAnalyticsClientFile } = require(generatorModulePath);
    const clientSource = createAnalyticsClientFile();

    expect(clientSource).toContain("requestCubeLoad");
    expect(clientSource).toContain('fetch("/api/analytics/cube"');
    expect(clientSource).not.toContain("requestAnalytics");
    expect(clientSource).toContain("CubeLoadResponse");
  });

  it("generates model analytics API helpers using Cube query presets", () => {
    const { createModelApiFile } = require(generatorModulePath);
    const source = createModelApiFile({
      modelName: "User",
      contractName: "userAnalyticsContract",
    });

    expect(source).toContain("requestCubeLoad");
    expect(source).toContain("toScopeFilters");
    expect(source).toContain("toMember");
    expect(source).toContain("fetchUserAnalyticsSummary");
    expect(source).toContain("fetchUserAnalyticsGrouped");
    expect(source).toContain("fetchUserAnalyticsTimeSeries");
    expect(source).not.toContain('"/analytics/users/grouped"');
  });
});
