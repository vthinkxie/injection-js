export default {
  output: {
    format: "umd",
    name: "injection-js",
    globals: {
      tslib: "tslib",
    },
  },
  external: ["tslib"],
};
