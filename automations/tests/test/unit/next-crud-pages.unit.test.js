const fs = require("fs");
const path = require("path");

const {
  createTempWorkspace,
  removeTempWorkspace,
  writeFile,
} = require("../helpers/workspace");

const generatorModulePath = path.resolve(
  __dirname,
  "../../../generators/next-crud-pages.js"
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

describe("next-crud-pages unit logic", () => {
  it("normalizes naming helpers", () => {
    const { toCamelCase, toPascalCase, kebabCase, pluralizeWord } = require(generatorModulePath);

    expect(toCamelCase("user-profile")).toBe("userProfile");
    expect(toPascalCase("user_profile")).toBe("UserProfile");
    expect(kebabCase("UserProfile")).toBe("user-profile");
    expect(pluralizeWord("category")).toBe("categories");
    expect(pluralizeWord("class")).toBe("classes");
    expect(pluralizeWord("user")).toBe("users");
  });

  it("infers field type analysis", () => {
    const { analyzeFieldType } = require(generatorModulePath);

    expect(analyzeFieldType("string")).toEqual({
      kind: "string",
      array: false,
      optionalByUnion: false,
    });
    expect(analyzeFieldType("Date | null")).toEqual({
      kind: "date",
      array: false,
      optionalByUnion: true,
    });
    expect(analyzeFieldType("number[]")).toEqual({
      kind: "number",
      array: true,
      optionalByUnion: false,
    });
  });

  it("normalizes list mode options", () => {
    const { normalizeListMode } = require(generatorModulePath);

    expect(normalizeListMode("table")).toBe("table");
    expect(normalizeListMode("infinite")).toBe("infinite");
    expect(() => normalizeListMode("cards")).toThrow(/Invalid --list-mode value/);
  });

  it("discovers model names from prisma files", () => {
    const tempRoot = createTempWorkspace("next-crud-models-");

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

  it("respects no-auto-update when writing files", () => {
    const tempRoot = createTempWorkspace("next-crud-write-");
    const targetPath = path.join(tempRoot, "apps", "web", "src", "lib", "test.ts");

    try {
      const { writeFileRespectingDirective } = loadGeneratorForWorkspace(tempRoot);

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, "original", "utf8");

      writeFileRespectingDirective(targetPath, "updated", false);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("original");

      writeFileRespectingDirective(targetPath, "updated", true);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("updated");

      fs.writeFileSync(targetPath, "/*_ no-auto-update _*/\nprotected", "utf8");
      writeFileRespectingDirective(targetPath, "should-not-change", true);
      expect(fs.readFileSync(targetPath, "utf8")).toBe("/*_ no-auto-update _*/\nprotected");
    } finally {
      removeTempWorkspace(tempRoot);
    }
  });
});
