import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      // Import react-hooks rules and convert all to warnings
      ...Object.keys(reactHooks.configs.recommended.rules || {}).reduce(
        (acc, key) => {
          acc[key] = "warn";
          return acc;
        },
        {},
      ),
      // Downgrade to warnings for gradual cleanup
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]" }],
      "no-useless-escape": "warn",
      "no-dupe-keys": "warn",
      "no-constant-binary-expression": "warn",
      "no-prototype-builtins": "warn",
      "no-undef": "warn",
      "no-empty": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // ESLint v10 new rules - downgrade to warnings for gradual adoption
      "preserve-caught-error": "warn",
      "no-useless-assignment": "warn",
    },
  },
];
