const fs = require("fs");
const path = require("path");

const {
  createTempWorkspace,
  removeTempWorkspace,
  writeFile,
} = require("../helpers/workspace");

const apiUpdatorModulePath = path.resolve(
  __dirname,
  "../../../generators/api-updator.js"
);
const sharedUtilsModulePath = path.resolve(
  __dirname,
  "../../../generators/_shared/utils.js"
);

function loadApiUpdatorForWorkspace(workspaceRoot) {
  const previous = process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT;

  process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT = workspaceRoot;
  delete require.cache[sharedUtilsModulePath];
  delete require.cache[apiUpdatorModulePath];

  const apiUpdator = require(apiUpdatorModulePath);

  if (previous === undefined) {
    delete process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT;
  } else {
    process.env.SOLID_AUTO_APP_BLOCKS_REPO_ROOT = previous;
  }

  return apiUpdator;
}

describe("api-updator unit logic", () => {
  it("infers search field types for supported scalar types", () => {
    const { inferSearchType } = require(apiUpdatorModulePath);

    expect(inferSearchType("string")).toBe("string");
    expect(inferSearchType("UUID")).toBe("string");
    expect(inferSearchType("number")).toBe("number");
    expect(inferSearchType("bigint")).toBe("number");
    expect(inferSearchType("DateTime")).toBe("date");
    expect(inferSearchType("boolean")).toBe("boolean");
    expect(inferSearchType("string[]")).toBeNull();
    expect(inferSearchType("JsonValue")).toBeNull();
    expect(inferSearchType("")).toBeNull();
  });

  it("pluralizes resource names with house rules", () => {
    const { pluralizeWord } = require(apiUpdatorModulePath);

    expect(pluralizeWord("box")).toBe("boxes");
    expect(pluralizeWord("status")).toBe("statuses");
    expect(pluralizeWord("category")).toBe("categories");
    expect(pluralizeWord("user")).toBe("users");
  });

  it("normalizes resource naming helpers", () => {
    const { toCamelCase, toPascalCase, kebabCase } = require(apiUpdatorModulePath);

    expect(toCamelCase("user_profile")).toBe("userProfile");
    expect(toPascalCase("user-profile")).toBe("UserProfile");
    expect(kebabCase("UserProfile")).toBe("user-profile");
  });

  it("detects the no-auto-update directive only at the beginning", () => {
    const { hasNoAutoUpdateDirective } = require(apiUpdatorModulePath);

    expect(hasNoAutoUpdateDirective("/*_ no-auto-update _*/\ncontent")).toBe(true);
    expect(hasNoAutoUpdateDirective("\n/*_ no-auto-update _*/\ncontent")).toBe(true);
    expect(hasNoAutoUpdateDirective("content\n/*_ no-auto-update _*/")).toBe(false);
  });

  it("respects no-auto-update and force behavior when writing files", () => {
    const tempRoot = createTempWorkspace("api-updator-write-");
    const targetPath = path.join(tempRoot, "apps", "api", "src", "users", "users.service.ts");

    try {
      const { writeFileRespectingDirective } = loadApiUpdatorForWorkspace(tempRoot);

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, "original", "utf8");

      writeFileRespectingDirective(targetPath, "updated-without-force", false);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("original");

      writeFileRespectingDirective(targetPath, "updated-with-force", true);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("updated-with-force");

      fs.writeFileSync(targetPath, "/*_ no-auto-update _*/\nprotected", "utf8");
      writeFileRespectingDirective(targetPath, "should-not-overwrite", true);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("/*_ no-auto-update _*/\nprotected");
    } finally {
      removeTempWorkspace(tempRoot);
    }
  });

  it("discovers model names from prisma files for --all mode", () => {
    const tempRoot = createTempWorkspace("api-updator-models-");

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

      const { readAllPrismaModelNames } = loadApiUpdatorForWorkspace(tempRoot);
      expect(readAllPrismaModelNames()).toEqual(["Account", "User"]);
    } finally {
      removeTempWorkspace(tempRoot);
    }
  });

  it("detects sensitive field names and parses csv lists", () => {
    const { getSensitiveFieldNames, parseCsvList } = require(apiUpdatorModulePath);

    expect(
      getSensitiveFieldNames([
        { name: "email" },
        { name: "passwordHash" },
        { name: "refreshToken" },
        { name: "apiKey" },
      ])
    ).toEqual(["passwordHash", "refreshToken", "apiKey"]);

    expect(parseCsvList("email,passwordHash, refreshToken ")).toEqual([
      "email",
      "passwordHash",
      "refreshToken",
    ]);
    expect(parseCsvList("")).toEqual([]);
  });
});
