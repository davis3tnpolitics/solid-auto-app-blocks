const fs = require("fs");
const path = require("path");

const {
  repoRoot,
  createTempWorkspace,
  removeTempWorkspace,
  writeFile,
} = require("../helpers/workspace");

const generatorModulePath = path.resolve(
  __dirname,
  "../../../generators/next-compose-page.js"
);
const sharedUtilsModulePath = path.resolve(
  __dirname,
  "../../../generators/_shared/utils.js"
);

function loadGeneratorForWorkspace(workspaceRoot, options = {}) {
  const previousRepoRoot = process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT;
  const previousScriptRoot = process.env.SOLID_AUTO_APP_BLOCKS_SCRIPT_ROOT;

  process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT = workspaceRoot;
  process.env.SOLID_AUTO_APP_BLOCKS_SCRIPT_ROOT =
    options.scriptRoot || repoRoot;

  delete require.cache[sharedUtilsModulePath];
  delete require.cache[generatorModulePath];

  const generator = require(generatorModulePath);

  if (previousRepoRoot === undefined) {
    delete process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT;
  } else {
    process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT = previousRepoRoot;
  }

  if (previousScriptRoot === undefined) {
    delete process.env.SOLID_AUTO_APP_BLOCKS_SCRIPT_ROOT;
  } else {
    process.env.SOLID_AUTO_APP_BLOCKS_SCRIPT_ROOT = previousScriptRoot;
  }

  return generator;
}

describe("next-compose-page unit logic", () => {
  it("normalizes route and validates section types", () => {
    const { normalizeSpec, normalizeRoutePath } = require(generatorModulePath);

    expect(normalizeRoutePath("/Insights/Main Dashboard/")).toBe(
      "insights/main-dashboard"
    );

    const normalized = normalizeSpec({
      kind: "next-page-spec",
      version: 1,
      route: "/dashboard",
      title: "Dashboard",
      sections: [
        {
          type: "crud-list",
          model: "User",
        },
      ],
    });

    expect(normalized.route).toBe("dashboard");
    expect(normalized.layout).toBe("stack");
    expect(normalized.sections[0].id).toContain("crud-list");

    expect(() =>
      normalizeSpec({
        kind: "next-page-spec",
        version: 1,
        route: "dashboard",
        sections: [{ type: "unsupported" }],
      })
    ).toThrow(/unsupported type/);
  });

  it("resolves database contract models from generated contracts", () => {
    const tempRoot = createTempWorkspace("next-compose-db-contract-");

    try {
      const { resolveDatabaseContractModel } = loadGeneratorForWorkspace(tempRoot);
      const contract = resolveDatabaseContractModel("User");
      expect(contract.modelName).toBe("User");
      expect(contract.path).toContain("packages");
      expect(Array.isArray(contract.fields)).toBe(true);
      expect(contract.fields.some((field) => field.name === "email")).toBe(true);
    } finally {
      removeTempWorkspace(tempRoot);
    }
  });

  it("resolves analytics contract models from analytics app contracts", () => {
    const tempRoot = createTempWorkspace("next-compose-analytics-contract-");

    try {
      writeFile(
        tempRoot,
        "apps/api/src/analytics/contracts/user.analytics.ts",
        `export const userAnalyticsContract = {
  cube: "Users",
  dimensions: ["email"],
  measures: ["count", "sumAge"],
  totals: ["count"],
  timeDimensions: ["createdAt"],
  defaultTimeDimension: "createdAt",
  scopedFilters: ["organizationId"],
} as const;
`
      );

      const { resolveAnalyticsContractModel } = loadGeneratorForWorkspace(tempRoot);
      const contract = resolveAnalyticsContractModel({
        analyticsApp: "api",
        modelName: "User",
      });

      expect(contract.modelName).toBe("User");
      expect(contract.routeSegment).toBe("users");
      expect(contract.dimensions).toEqual(["email"]);
      expect(contract.measures).toEqual(["count", "sumAge"]);
      expect(contract.defaultTimeDimension).toBe("createdAt");
    } finally {
      removeTempWorkspace(tempRoot);
    }
  });

  it("loads preset specs from script-root templates", () => {
    const tempRoot = createTempWorkspace("next-compose-presets-");

    try {
      const { resolvePresetPath, parseSpecFromFile } = loadGeneratorForWorkspace(tempRoot, {
        scriptRoot: repoRoot,
      });

      const presetPath = resolvePresetPath("dashboard-basic");
      expect(fs.existsSync(presetPath)).toBe(true);

      const spec = parseSpecFromFile(presetPath, {
        model: "User",
        route: "dashboard",
        analyticsApp: "api",
      });

      expect(spec.route).toBe("dashboard");
      expect(spec.sections.length).toBeGreaterThanOrEqual(2);
      expect(spec.sections.some((section) => section.type === "crud-list")).toBe(true);
      expect(
        spec.sections.some((section) => section.type === "analytics-bar-chart")
      ).toBe(true);
    } finally {
      removeTempWorkspace(tempRoot);
    }
  });
});
