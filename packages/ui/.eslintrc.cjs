'use strict';

module.exports = {
  root: true,
  extends: [require.resolve('../../packages/config/eslintrc.cjs')],
  parserOptions: {
    project: './tsconfig.json',
  },
};
