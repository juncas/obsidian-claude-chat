import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
    {
        ignores: ["main.js", "node_modules/**", "*.mjs"]
    },
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module"
            }
        },
        plugins: {
            "@typescript-eslint": tseslint
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
            "no-console": "off",
            "semi": ["warn", "always"],
            "quotes": ["warn", "single", { "avoidEscape": true }]
        }
    }
];
