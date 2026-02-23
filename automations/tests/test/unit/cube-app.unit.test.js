const path = require("path");

const generatorModulePath = path.resolve(__dirname, "../../../generators/cube-app.js");

describe("cube-app unit logic", () => {
  it("normalizes supported cube templates", () => {
    const { normalizeCubeTemplate } = require(generatorModulePath);

    expect(normalizeCubeTemplate("docker")).toBe("docker");
    expect(normalizeCubeTemplate("EXPRESS")).toBe("express");
    expect(normalizeCubeTemplate("serverless-google")).toBe("serverless-google");
    expect(() => normalizeCubeTemplate("invalid")).toThrow(/Unsupported Cube template/);
  });

  it("selects workspace dependencies for cube apps", () => {
    const { selectWorkspaceDeps } = require(generatorModulePath);

    const selected = selectWorkspaceDeps([
      { name: "database", dir: "database" },
      { name: "cube-helpers", dir: "cube-helpers" },
      { name: "config", dir: "config" },
      { name: "@workspace/ui", dir: "ui" },
    ]);

    expect(selected.map((entry) => entry.name)).toEqual(["database", "cube-helpers", "config"]);
  });
});
