import path from "path";
import { config as loadEnvFile } from "dotenv";

const rootEnvPath = path.resolve(__dirname, "../../..", ".env");

const loaded = loadEnvFile({ path: rootEnvPath });
if (loaded.error && (loaded.error as NodeJS.ErrnoException).code !== "ENOENT") {
  throw loaded.error;
}

type EnvValue = string | undefined;

function throwMissing(key: string): never {
  throw new Error(`Missing environment variable "${key}". Declare it in .env or your deployment pipeline.`);
}

/**
 * Returns the value of an environment variable or throws if it is missing.
 */
export function getRequiredEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throwMissing(key);
  }
  return value;
}

/**
 * Returns the value of an environment variable or undefined if it is not set.
 */
export function getOptionalEnv(key: string): EnvValue {
  return process.env[key];
}

/**
 * Ensures every key in the schema is present before returning the populated map.
 */
export function ensureEnv<T extends Record<string, string>>(
  schema: readonly (keyof T & string)[]
): T {
  const result = {} as T;
  schema.forEach((key) => {
    result[key] = getRequiredEnv(key);
  });
  return result;
}

export const envSchema = Object.freeze({
  DATABASE_URL: "DATABASE_URL",
});

export type SchemaKeys = keyof typeof envSchema;
