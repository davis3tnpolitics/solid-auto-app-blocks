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
    const flags = parseCliFlags({ port: 3001, force: false, install: true });
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
    const serverPackages = selectServerPackages(packages);
    scaffoldNestApp({
      appName,
      targetDir,
      packages: serverPackages,
      port: Number(flags.port) || 3001,
      force: Boolean(flags.force),
    });

    if (shouldInstall) {
      runWorkspaceInstall();
    }

    console.log(`[nest-app] Created NestJS app at apps/${appName}`);
  } catch (error) {
    console.error(`[nest-app] ${error.message}`);
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

function scaffoldNestApp({ appName, targetDir, packages, port, force }) {
  const files = {
    "package.json": createPackageJson(appName, packages),
    "tsconfig.json": createTsConfig(packages),
    "tsconfig.build.json": createBuildTsConfig(),
    ".eslintrc.cjs": createEslintConfig(),
    ".gitignore": createGitignore(),
    "src/main.ts": createMainTs(port),
    "src/app.module.ts": createAppModule(),
    "src/app.controller.ts": createAppController(),
    "src/app.service.ts": createAppService(),
    "src/health/health.module.ts": createHealthModule(),
    "src/health/health.controller.ts": createHealthController(),
    "src/database/prisma.service.ts": createPrismaService(),
    "README.md": createReadme(appName, port),
  };

  Object.entries(files).forEach(([relativePath, content]) => {
    const destination = path.join(targetDir, relativePath);
    writeFileSafe(destination, content, { force });
  });
}

function selectServerPackages(packages) {
  const allowed = new Set([
    "database",
    "config",
    "auth",
    "@workspace/auth",
    "communications",
    "@workspace/communications",
  ]);

  return packages.filter((pkg) => allowed.has(pkg.name));
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
      build: "tsc -p tsconfig.build.json",
      start: "node dist/main.js",
      "start:dev": "ts-node --transpile-only src/main.ts",
      lint: "eslint \"src/**/*.{ts,tsx}\"",
      typecheck: "tsc --noEmit",
    },
    dependencies: {
      "@nestjs/common": "^11.0.0",
      "@nestjs/core": "^11.0.0",
      "@nestjs/platform-express": "^11.0.0",
      "@nestjs/swagger": "^11.0.0",
      "class-transformer": "^0.5.1",
      "class-validator": "^0.14.1",
      "reflect-metadata": "^0.2.0",
      rxjs: "^7.8.1",
      "swagger-ui-express": "^5.0.1",
      ...workspaceDeps,
    },
    devDependencies: {
      typescript: "^5",
      "ts-node": "^10.9.2",
      "@types/node": "^20",
      eslint: "^9",
      "@typescript-eslint/eslint-plugin": "^8.52.0",
      "@typescript-eslint/parser": "^8.52.0",
    },
    engines: {
      node: ">=18.18.0",
    },
  };

  return formatJson(packageJson);
}

function createTsConfig(packages) {
  const paths = {};

  packages.forEach((pkg) => {
    paths[pkg.name] = [`../../packages/${pkg.dir}`];
    paths[`${pkg.name}/*`] = [`../../packages/${pkg.dir}/*`];
  });

  const tsconfig = {
    extends: "../../packages/config/tsconfig.base.json",
    compilerOptions: {
      module: "CommonJS",
      target: "ES2021",
      moduleResolution: "Node",
      outDir: "./dist",
      rootDir: "./src",
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      sourceMap: true,
      strict: true,
      resolveJsonModule: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true,
      incremental: true,
      baseUrl: ".",
      paths,
    },
    include: ["src/**/*.ts"],
    exclude: ["node_modules", "dist"],
  };

  return formatJson(tsconfig);
}

function createBuildTsConfig() {
  const tsconfig = {
    extends: "./tsconfig.json",
    compilerOptions: {
      incremental: false,
      noEmit: false,
    },
    exclude: ["node_modules", "dist", "test", "**/*.spec.ts", "**/*.e2e-spec.ts"],
  };

  return formatJson(tsconfig);
}

function createEslintConfig() {
  return `'use strict';

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    require.resolve("../../packages/config/eslintrc.cjs"),
  ],
  env: {
    node: true,
    es2021: true,
  },
  rules: {
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: false,
      },
    ],
  },
};
`;
}

function createGitignore() {
  return `node_modules
dist
.env
.env.local
.env.production
.env.development
npm-debug.log*
yarn-debug.log*
yarn-error.log*
`;
}

function createMainTs(port) {
  return `import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { getOptionalEnv } from "config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    })
  );

  const nodeEnv = (getOptionalEnv("NODE_ENV") ?? "development").toLowerCase();
  if (nodeEnv === "development" || nodeEnv === "dev") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("API")
      .setDescription("API docs")
      .setVersion("1.0.0")
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("/docs", app, document);
  }

  const port = Number(getOptionalEnv("PORT")) || ${port};
  await app.listen(port);
  console.log(\`API listening on http://localhost:\${port}\`);
}

bootstrap();
`;
}

function createAppModule() {
  return `import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthModule } from "./health/health.module";
import { PrismaService } from "./database/prisma.service";

@Module({
  imports: [HealthModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
`;
}

function createAppController() {
  return `import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root() {
    return this.appService.status();
  }
}
`;
}

function createAppService() {
  return `import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  status() {
    return { status: "ok" };
  }
}
`;
}

function createHealthModule() {
  return `import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
`;
}

function createHealthController() {
  return `import { Controller, Get } from "@nestjs/common";
import { getOptionalEnv } from "config";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      environment: getOptionalEnv("NODE_ENV") ?? "development",
      timestamp: new Date().toISOString(),
    };
  }
}
`;
}

function createPrismaService() {
  return `import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "database";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
`;
}

function createReadme(appName, port) {
  return `# ${appName}

Generated by \`automations/generators/nest-app.js\`.

## Commands

- \`pnpm --filter ${appName} start:dev\` — run in dev mode with ts-node
- \`pnpm --filter ${appName} build\` — compile to \`dist/\`
- \`pnpm --filter ${appName} lint\` — lint with shared + Nest rules
- \`pnpm --filter ${appName} typecheck\` — TypeScript typecheck

## Notes

- TS config extends \`packages/config/tsconfig.base.json\` with decorator support and workspace package paths.
- A Prisma service is wired to the shared \`database\` package so API modules can inject it.
- Health endpoint is available at \`/health\`; base route returns a small status payload.
- Swagger UI is exposed at \`/docs\` in development (NODE_ENV=development|dev).
`;
}

main();
