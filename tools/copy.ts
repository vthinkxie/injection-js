import { writeFileSync, copyFileSync, readFileSync } from "fs";
import { resolve } from "path";

main();

function main() {
  const projectRoot = resolve(__dirname, "..");
  const distPath = resolve(projectRoot, "dist");
  const packageJson = readFileSync(
    resolve(projectRoot, "package.json"),
    "utf8"
  );
  const distPackageJson = createDistPackageJson(JSON.parse(packageJson));

  copyFileSync(
    resolve(projectRoot, "README.md"),
    resolve(distPath, "README.md")
  );
  writeFileSync(resolve(distPath, "package.json"), distPackageJson);
}

function createDistPackageJson(packageConfig: any) {
  const {
    devDependencies,
    scripts,
    engines,
    ...distPackageJson
  } = packageConfig;

  return JSON.stringify(distPackageJson, null, 2);
}
