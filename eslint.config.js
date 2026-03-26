import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import mocha from "eslint-plugin-mocha";
import chaiExpect from "eslint-plugin-chai-expect";
import globals from "globals";

// Mimic CommonJS variables in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize FlatCompat with the current directory
const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
  recommendedConfig: js.configs.recommended, // Optional, for "eslint:recommended"
});

export default [
  {
    ignores: [
      "node_modules/**/*.*",
      "examples/**/*.*",
      "testcases/**/*.*",
      "public/testem/*.js",
      "**/.eslintrc.js",
      "eslint.config.js",
      "tests/fixtures/tape/public/bundle.js",
      "tests/fixtures/firefox/custom_user.js",
    ],
  },
  {
    plugins: { "chai-expect": chaiExpect, mocha },
    rules: {
      "chai-expect/missing-assertion": 2,
      "chai-expect/no-inner-compare": 2,
      "mocha/no-exclusive-tests": 2,
    },
  },
  ...compat.config({
    root: true,
    parserOptions: {
      ecmaVersion: 2020,
    },
    extends: "eslint:recommended",
    env: {
      browser: false,
      node: true,
      es6: true,
      mocha: true,
    },
    globals: {},
    rules: {
      "no-cond-assign": [2, "except-parens"],
      "no-console": 0,
      "no-empty": 2,
      curly: 2,
      eqeqeq: 2,
      "guard-for-in": 0,
      "no-caller": 2,
      "no-eq-null": 2,
      "no-eval": 2,
      "no-new": 0,
      "no-unused-expressions": [
        2,
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
      "wrap-iife": 0,
      yoda: 2,
      semi: 2,
      strict: [2, "global"],
      "no-undef": 2,
      "no-unused-vars": 2,
      "no-use-before-define": [2, "nofunc"],
      camelcase: 0,
      "eol-last": 2,
      indent: [
        2,
        2,
        {
          SwitchCase: 1,
          VariableDeclarator: { var: 2, let: 2, const: 3 },
        },
      ],
      "keyword-spacing": 2,
      "linebreak-style": [2, "unix"],
      "new-cap": [
        2,
        {
          properties: false,
        },
      ],
      "no-plusplus": 0,
      "no-trailing-spaces": 2,
      "no-unneeded-ternary": 2,
      "space-before-blocks": 2,
      "space-in-parens": 2,
      "space-infix-ops": 2,
      "space-unary-ops": 2,
      "space-before-function-paren": [
        "error",
        { anonymous: "never", named: "never" },
      ],
      quotes: [2, "single"],
    },
  }),
  {
    files: [
      "tests/fixtures/tape/public/tap_adapter.js",
      "tests/fixtures/firefox/custom_user.js",
      "lib/utils/esbuild-buffer-inject.js",
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["tests/fixtures/tape/public/tap_adapter.js"],
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^(msg|src|line|col|err)$" }],
    },
  },
];
