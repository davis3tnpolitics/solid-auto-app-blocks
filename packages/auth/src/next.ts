import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

type Overrideable<T> = Partial<T> | undefined;
type AuthPrismaClient = Parameters<typeof PrismaAdapter>[0];

/**
 * Builds a shared Auth.js/NextAuth config that uses the workspace Prisma client.
 * Consumers can merge in providers, secrets, and callbacks.
 */
export function createAuthConfig(
  prisma: AuthPrismaClient,
  overrides: Overrideable<NextAuthConfig> = {}
): NextAuthConfig {
  const base: NextAuthConfig = {
    adapter: PrismaAdapter(prisma),
    providers: [],
    session: {
      strategy: "database",
    },
    callbacks: {
      async session({ session, user }) {
        if (session.user && user?.id) {
          session.user.id = user.id;
        }
        return session;
      },
    },
  };

  return {
    ...base,
    ...overrides,
    session: { ...base.session, ...(overrides?.session ?? {}) },
    callbacks: { ...base.callbacks, ...(overrides?.callbacks ?? {}) },
  };
}
