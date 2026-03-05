import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const buildDir = resolve(process.cwd(), "build");
const outputDir = resolve(process.cwd());

function collectLuaFilesRecursively(directoryPath) {
  const entries = readdirSync(directoryPath);
  const luaFiles = [];

  for (const entryName of entries) {
    const entryPath = resolve(directoryPath, entryName);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      luaFiles.push(...collectLuaFilesRecursively(entryPath));
      continue;
    }

    if (entryName.endsWith(".lua")) {
      luaFiles.push(entryPath);
    }
  }

  return luaFiles;
}

if (!existsSync(buildDir)) {
  process.exit(0);
}

for (const sourceFilePath of collectLuaFilesRecursively(buildDir)) {
  const relativeFilePath = relative(buildDir, sourceFilePath);
  const destinationFilePath = resolve(outputDir, relativeFilePath);

  mkdirSync(dirname(destinationFilePath), { recursive: true });

  cpSync(sourceFilePath, destinationFilePath, {
    recursive: false,
    force: true,
  });
}