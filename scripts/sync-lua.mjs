import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const filesToSync = ["main.lua", "conf.lua", "lualib_bundle.lua"];
const buildDir = resolve(process.cwd(), "build");

for (const fileName of filesToSync) {
  const source = resolve(buildDir, fileName);
  const destination = resolve(process.cwd(), fileName);

  if (existsSync(source)) {
    cpSync(source, destination);
  }
}