import js from "@eslint/js";
import globals from "globals";

const browser = globals.browser;

export default [
  js.configs.recommended,
  {
    files: ["hello.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...browser,
      },
    },
    rules: {
      // hello is referenced from tests.js (separate script in the browser).
      "no-unused-vars": ["error", { varsIgnorePattern: "^hello$" }],
    },
  },
  {
    files: ["tests.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...browser,
        equal: "readonly",
        hello: "readonly",
        test: "readonly",
      },
    },
  },
];
