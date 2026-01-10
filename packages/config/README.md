# Shared Config

This package centralizes shared tooling for the workspace. It exposes:

- A reusable environment helper (`src/env.ts`) that loads the repo root `.env` and validates required keys.
- A base `tsconfig` (`tsconfig.base.json`) for apps to extend.
- Shared linting/formatting rules for ESLint and Prettier.

## Extend the configs

### TypeScript

```json
"extends": ["config/tsconfig.base.json"]
```

### ESLint

```js
module.exports = {
  extends: [require.resolve("config/eslintrc.cjs")],
};
```

### Prettier

```js
module.exports = require("config/prettier.config.cjs");
```

## Environment helpers

Import from the public entry point to reuse `getRequiredEnv`, `getOptionalEnv`, or `ensureEnv` with the same validation logic from other apps.
