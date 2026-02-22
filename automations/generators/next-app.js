#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  repoRoot,
  parseCliFlags,
  writeFileSafe,
  formatJson,
  readWorkspacePackages,
} = require("./_shared/utils");

function main() {
  try {
    const flags = parseCliFlags({ port: 3000, sample: true, force: false, install: true });
    const appName = flags.name || flags.app || flags.appName;
    const shouldInstall = flags.install !== false && flags.skipInstall !== true;

    if (!appName) {
      throw new Error('Provide an app name with "--name <appName>".');
    }

    const targetDir = path.join(repoRoot, "apps", appName);
    if (fs.existsSync(targetDir) && !flags.force) {
      throw new Error(
        `App directory already exists at ${targetDir}. Use --force to overwrite.`
      );
    }

    const packages = readWorkspacePackages();
    scaffoldNextApp({
      appName,
      targetDir,
      packages,
      port: Number(flags.port) || 3000,
      includeSample: flags.sample !== false,
      force: Boolean(flags.force),
    });

    if (shouldInstall) {
      runWorkspaceInstall();
    }

    console.log(`[next-app] Created Next.js app at apps/${appName}`);
  } catch (error) {
    console.error(`[next-app] ${error.message}`);
    process.exit(1);
  }
}

function runWorkspaceInstall() {
  try {
    execSync("pnpm install", {
      cwd: repoRoot,
      stdio: "inherit",
    });
  } catch (error) {
    throw new Error(`Failed to run "pnpm install" after app creation (${error.message})`);
  }
}

function scaffoldNextApp({ appName, targetDir, packages, port, includeSample, force }) {
  const files = {
    "package.json": createPackageJson(appName, packages),
    "tsconfig.json": createTsConfig(packages),
    "next.config.ts": createNextConfig(),
    ".eslintrc.cjs": createEslintConfig(),
    ".gitignore": createGitignore(),
    "next-env.d.ts": createNextEnvDts(),
    "postcss.config.mjs": createPostcssConfig(),
    "components.json": createComponentsJson(),
    "src/app/layout.tsx": createLayout(appName),
    "src/app/page.tsx": createPage(appName, packages, includeSample),
    "src/app/api/health/route.ts": createHealthRoute(),
    "src/app/globals.css": createGlobals(),
    "src/lib/env.ts": createEnvHelper(),
    "README.md": createReadme(appName, port),
  };

  Object.entries(files).forEach(([relativePath, content]) => {
    const destination = path.join(targetDir, relativePath);
    writeFileSafe(destination, content, { force });
  });
}

function createPackageJson(appName, packages) {
  const workspaceDeps = packages.reduce((acc, pkg) => {
    acc[pkg.name] = "workspace:*";
    return acc;
  }, {});

  const packageJson = {
    name: appName,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
      typecheck: "tsc --noEmit",
    },
    dependencies: {
      next: "16.1.1",
      "next-auth": "^5.0.0-beta.19",
      react: "19.2.3",
      "react-dom": "19.2.3",
      ...workspaceDeps,
    },
    devDependencies: {
      typescript: "^5",
      "@types/node": "^20",
      "@types/react": "^19",
      "@types/react-dom": "^19",
      eslint: "^9",
      "eslint-config-next": "16.1.1",
      "@tailwindcss/postcss": "^4",
      tailwindcss: "^4",
    },
    engines: {
      node: ">=18.18.0",
    },
  };

  return formatJson(packageJson);
}

function createTsConfig(packages) {
  const paths = {
    "@/*": ["./src/*"],
  };

  packages.forEach((pkg) => {
    paths[pkg.name] = [`../../packages/${pkg.dir}`];
    paths[`${pkg.name}/*`] = [`../../packages/${pkg.dir}/*`];
  });

  const tsconfig = {
    extends: "../../packages/config/tsconfig.base.json",
    compilerOptions: {
      target: "ES2021",
      lib: ["dom", "dom.iterable", "esnext"],
      module: "esnext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
      allowJs: true,
      noEmit: true,
      resolveJsonModule: true,
      isolatedModules: true,
      skipLibCheck: true,
      strict: true,
      baseUrl: ".",
      paths,
      incremental: true,
      plugins: [{ name: "next" }],
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"],
  };

  return formatJson(tsconfig);
}

function createEslintConfig() {
  return `'use strict';

module.exports = {
  root: true,
  extends: [
    "next/core-web-vitals",
    "next/typescript",
    require.resolve("../../packages/config/eslintrc.cjs"),
  ],
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
      },
    ],
  },
};
`;
}

function createNextConfig() {
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ["src", "."],
  },
};

export default nextConfig;
`;
}

function createGitignore() {
  return `node_modules
.next
out
.turbo
.vercel
dist
.env
.env.local
.env.production
.env.development
`;
}

function createNextEnvDts() {
  return `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
`;
}

function createPostcssConfig() {
  return `const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`;
}

function createComponentsJson() {
  return `{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "utils": "@workspace/ui/lib/utils",
    "ui": "@workspace/ui/components"
  }
}
`;
}

function createLayout(appName) {
  return `import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "${appName}",
  description: "${appName} generated by automations/generators/next-app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

function createPage(appName, packages, includeSample) {
  const packageList = packages.map((pkg) => pkg.name).sort();

  const listMarkup = packageList
    .map((pkg) => `            <li key="${pkg}">${pkg}</li>`)
    .join("\n");

  const sampleSection = includeSample
    ? `
        <section>
          <h2>Getting started</h2>
          <ol>
            <li>Run <code>pnpm install</code> at the repo root.</li>
            <li>Start this app with <code>pnpm --filter ${appName} dev</code>.</li>
            <li>Add routes or components in <code>src/app</code>.</li>
          </ol>
        </section>`
    : "";

  return `export default function Page() {
  const workspacePackages = ${JSON.stringify(packageList, null, 2)};

  return (
    <main className="page">
      <header>
        <p className="eyebrow">Next.js App</p>
        <h1>${appName}</h1>
        <p>Generated via <code>automations/generators/next-app.js</code>.</p>
      </header>

      <section>
        <h2>Workspace packages</h2>
        <ul>
${listMarkup || "            <li>No packages detected.</li>"}
        </ul>
      </section>${sampleSection}

      <section>
        <p>Need API health? Try <code>/api/health</code>.</p>
      </section>
    </main>
  );
}
`;
}

function createHealthRoute() {
  return `export async function GET() {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
`;
}

function createGlobals() {
  return `@import "@workspace/ui/styles/globals.css";

main.page {
  @apply max-w-4xl mx-auto flex flex-col gap-8 py-10 px-6 text-slate-900;
}

body {
  @apply min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50;
}

header h1 {
  @apply text-3xl font-semibold;
}

h2 {
  @apply mb-1 text-xl font-semibold;
}

ul {
  @apply list-disc pl-6 space-y-1;
}

code {
  @apply rounded-md bg-slate-900 px-2 py-1 text-sm font-medium text-slate-100;
}

.eyebrow {
  @apply uppercase tracking-[0.08em] text-xs text-slate-500;
}
`;
}

function createEnvHelper() {
  return `import { getOptionalEnv } from "config";

export const appEnv = {
  apiBaseUrl: getOptionalEnv("NEXT_PUBLIC_API_BASE_URL") ?? "http://localhost:3001",
};
`;
}

function createReadme(appName, port) {
  return `# ${appName}

Generated by \`automations/generators/next-app.js\`.

## Commands

- \`pnpm --filter ${appName} dev --port ${port}\` — run the app locally
- \`pnpm --filter ${appName} lint\` — lint with Next + shared config
- \`pnpm --filter ${appName} typecheck\` — TypeScript typecheck

## Notes

- TS config extends \`packages/config/tsconfig.base.json\` and maps all workspace packages.
- ESLint extends Next core-web-vitals plus shared workspace rules.
- A simple \`/api/health\` route is included for quick smoke tests.
- Tailwind CSS v4 is ready via \`@tailwindcss/postcss\` and imports shared UI styles from \`@workspace/ui\`.
- Auth.js dependency is included; run the add-auth generator to scaffold routes/middleware when you need it.
`;
}

main();
