module.exports = {
  env: {
    browser: true,
    node: true,
  },
  extends: [
    "prettier",
    "plugin:prettier/recommended",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    sourceType: "module",
    createDefaultProgram: true,
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "no-prototype-builtins": "off",
    "@typescript-eslint/no-empty-interface": "off",
  },
  overrides: [
    {
      files: ["test/**/*.ts"],
      rules: {
        "@typescript-eslint/no-empty-function": "off",
      },
    },
  ],
};
