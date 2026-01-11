Shared Auth.js helpers for the monorepo.

- `createAuthConfig(prisma, overrides?)` — returns a NextAuth/Auth.js config wired to the workspace Prisma client with a database session strategy and a user id on the session payload. Pass in providers/secrets via `overrides`.

Usage in a Next route:

```ts
import NextAuth from "next-auth";
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
```
