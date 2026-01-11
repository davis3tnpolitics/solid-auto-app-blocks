#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const {
  repoRoot,
  parseCliFlags,
  writeFileSafe,
  readWorkspacePackages,
  formatJson,
} = require("../../_shared/utils");

function main() {
  try {
    const flags = parseCliFlags({ force: false });
    const appName = flags.app || flags.name || flags.appName;
    if (!appName) {
      throw new Error('Provide an app name with "--app <name>".');
    }

    const appDir = path.join(repoRoot, "apps", appName);
    if (!fs.existsSync(appDir)) {
      throw new Error(`App not found at ${appDir}.`);
    }

    const packages = readWorkspacePackages().map((p) => p.name);
    if (!packages.includes("auth")) {
      console.warn('[add-auth] Package "auth" not found. Install/build it first.');
    }

    ensureNextAuthDependency(appDir);
    scaffoldAuth(appDir, { force: Boolean(flags.force) });

    console.log(`[add-auth] Auth.js scaffolding added to apps/${appName}`);
  } catch (error) {
    console.error(`[add-auth] ${error.message}`);
    process.exit(1);
  }
}

function ensureNextAuthDependency(appDir) {
  const packageJsonPath = path.join(appDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found in ${appDir}`);
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const deps = pkg.dependencies || {};

  if (!deps["next-auth"]) {
    deps["next-auth"] = "^5.0.0-beta.19";
    pkg.dependencies = deps;
    fs.writeFileSync(packageJsonPath, formatJson(pkg), "utf8");
    console.log('[add-auth] Added "next-auth" dependency to package.json.');
  }
}

function scaffoldAuth(appDir, { force }) {
  const files = {
    "src/app/api/auth/[...nextauth]/route.ts": createAuthRoute(),
    "src/types/next-auth.d.ts": createNextAuthTypes(),
    "src/middleware.ts": createMiddleware(),
  };

  Object.entries(files).forEach(([relativePath, content]) => {
    const destination = path.join(appDir, relativePath);
    writeFileSafe(destination, content, { force });
  });
}

function createAuthRoute() {
  return `import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { getRequiredEnv } from "config";
import { PrismaClient } from "database";
import { createAuthConfig } from "auth";

const prisma = new PrismaClient();

const handler = NextAuth(
  createAuthConfig(prisma, {
    secret: getRequiredEnv("AUTH_SECRET"),
    providers: [
      GitHub({
        clientId: getRequiredEnv("AUTH_GITHUB_ID"),
        clientSecret: getRequiredEnv("AUTH_GITHUB_SECRET"),
      }),
    ],
  })
);

export { handler as GET, handler as POST };
`;
}

function createNextAuthTypes() {
  return `import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string;
    };
  }
}
`;
}

function createMiddleware() {
  return `export { auth as middleware } from "next-auth/middleware";

export const config = {
  matcher: ["/app/:path*"],
};
`;
}

main();
