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
      // Import react-hooks recommended rules
      ...reactHooks.configs.recommended.rules,
      // Downgrade exhaustive-deps to warning (too noisy), but keep rules-of-hooks as error (prevents crashes)
      "react-hooks/exhaustive-deps": "warn",
      // Downgrade less critical rules to warnings for gradual cleanup
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]" }],
      "no-useless-escape": "warn",
      "no-prototype-builtins": "warn",
      "no-empty": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // ESLint v10 new rules - downgrade to warnings for gradual adoption
      "preserve-caught-error": "warn",
      "no-useless-assignment": "warn",
      // Keep critical bug-catching rules as errors (no-dupe-keys, no-undef, no-constant-binary-expression)
      // These remain at "error" level from js.configs.recommended.rules
    },
  },
];
