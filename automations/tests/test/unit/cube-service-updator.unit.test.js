const fs = require("fs");
const path = require("path");

const {
  createTempWorkspace,
  removeTempWorkspace,
  writeFile,
} = require("../helpers/workspace");

const generatorModulePath = path.resolve(
  __dirname,
  "../../../generators/cube-service-updator.js"
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

describe("cube-service-updator unit logic", () => {
  it("infers analytics field types", () => {
    const { inferAnalyticsFieldType } = require(generatorModulePath);

    expect(inferAnalyticsFieldType("id", "string")).toBe("id");
    expect(inferAnalyticsFieldType("email", "string")).toBe("string");
    expect(inferAnalyticsFieldType("isActive", "boolean")).toBe("boolean");
    expect(inferAnalyticsFieldType("createdAt", "Date | null")).toBe("date");
    expect(inferAnalyticsFieldType("age", "number")).toBe("number");
    expect(inferAnalyticsFieldType("tags", "string[]")).toBeNull();
  });

  it("parses csv lists and naming helpers", () => {
    const { parseCsvList, toCamelCase, toPascalCase, kebabCase, pluralizeWord } =
      require(generatorModulePath);

    expect(parseCsvList("User, Account ,Session")).toEqual(["User", "Account", "Session"]);
    expect(parseCsvList("")).toEqual([]);
    expect(toCamelCase("user-profile")).toBe("userProfile");
    expect(toPascalCase("user_profile")).toBe("UserProfile");
    expect(kebabCase("UserProfile")).toBe("user-profile");
    expect(pluralizeWord("category")).toBe("categories");
  });

  it("detects no-auto-update directives", () => {
    const { hasNoAutoUpdateDirective } = require(generatorModulePath);

    expect(hasNoAutoUpdateDirective("/* no-auto-update */\ncontent")).toBe(true);
    expect(hasNoAutoUpdateDirective("/*_ no-auto-update _*/\ncontent")).toBe(true);
    expect(hasNoAutoUpdateDirective("content\n/* no-auto-update */")).toBe(false);
  });

  it("respects no-auto-update and force behavior when writing files", () => {
    const tempRoot = createTempWorkspace("cube-service-write-");
    const targetPath = path.join(
      tempRoot,
      "apps",
      "api",
      "src",
      "analytics",
      "cubes",
      "user.cube.ts"
    );

    try {
      const { writeFileRespectingDirective } = loadGeneratorForWorkspace(tempRoot);

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, "original", "utf8");

      writeFileRespectingDirective(targetPath, "updated-without-force", false);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("original");

      writeFileRespectingDirective(targetPath, "updated-with-force", true);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("updated-with-force");

      fs.writeFileSync(targetPath, "/* no-auto-update */\nprotected", "utf8");
      writeFileRespectingDirective(targetPath, "should-not-overwrite", true);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("/* no-auto-update */\nprotected");
    } finally {
      removeTempWorkspace(tempRoot);
    }
  });

  it("discovers model names from prisma files", () => {
    const tempRoot = createTempWorkspace("cube-service-models-");

    try {
      writeFile(
        tempRoot,
        "packages/database/prisma/extra.prisma",
        `model Account {
  id String @id @default(cuid())
}

model User {
  id String @id
}
`
      );

      const { readAllPrismaModelNames } = loadGeneratorForWorkspace(tempRoot);
      expect(readAllPrismaModelNames()).toEqual(["Account", "User"]);
    } finally {
      removeTempWorkspace(tempRoot);
    }
  });
});
