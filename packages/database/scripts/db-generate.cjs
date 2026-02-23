#!/usr/bin/env node
const { execSync } = require("child_process");

const fallbackDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/solid_auto_app_blocks?schema=public";

try {
  execSync("pnpm exec prisma generate --schema ./prisma --generator client", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || fallbackDatabaseUrl,
    },
  });
} catch (error) {
  process.stderr.write(
    `[database] prisma generate failed: ${error && error.message ? error.message : String(error)}\n`
  );
  process.exit(1);
}
