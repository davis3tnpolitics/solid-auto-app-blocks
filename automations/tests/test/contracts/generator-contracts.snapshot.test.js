const {
  createTempWorkspace,
  removeTempWorkspace,
  readFile,
} = require("../helpers/workspace");
const { runCreateBlock } = require("../helpers/cli");

describe("generator contract snapshots", () => {
  let workspaceRoot;

  beforeAll(() => {
    workspaceRoot = createTempWorkspace("generator-contracts-");

    runCreateBlock(
      [
        "--block",
        "next-app",
        "--name",
        "snapshot-web",
        "--port",
        "3330",
        "--skip-install",
      ],
      { workspaceRoot }
    );

    runCreateBlock(
      [
        "--block",
        "nest-app",
        "--name",
        "snapshot-api",
        "--port",
        "3331",
        "--skip-install",
      ],
      { workspaceRoot }
    );

    runCreateBlock(
      [
        "--block",
        "api-updator",
        "--app",
        "snapshot-api",
        "--model",
        "User",
        "--skip-db-generate",
      ],
      { workspaceRoot }
    );
  });

  afterAll(() => {
    removeTempWorkspace(workspaceRoot);
  });

  it("snapshots next-app core files", () => {
    expect(readFile(workspaceRoot, "apps/snapshot-web/package.json")).toMatchSnapshot();
    expect(readFile(workspaceRoot, "apps/snapshot-web/src/app/page.tsx")).toMatchSnapshot();
    expect(readFile(workspaceRoot, ".github/workflows/app-snapshot-web-ci.yml")).toMatchSnapshot();
  });

  it("snapshots nest-app core files", () => {
    expect(readFile(workspaceRoot, "apps/snapshot-api/src/main.ts")).toMatchSnapshot();
    expect(readFile(workspaceRoot, "apps/snapshot-api/src/app.module.ts")).toMatchSnapshot();
    expect(readFile(workspaceRoot, ".github/workflows/app-snapshot-api-ci.yml")).toMatchSnapshot();
  });

  it("snapshots api-updator generated contracts", () => {
    expect(
      readFile(workspaceRoot, "apps/snapshot-api/src/users/users.controller.ts")
    ).toMatchSnapshot();
    expect(readFile(workspaceRoot, "apps/snapshot-api/src/users/users.service.ts")).toMatchSnapshot();
    expect(
      readFile(workspaceRoot, "apps/snapshot-api/src/users/dto/search-user.dto.ts")
    ).toMatchSnapshot();
  });
});
