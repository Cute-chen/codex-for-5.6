import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { inspectSpec } from "../src/patch-engine.mts";
import { TARGET_SPECS, type TargetSpec } from "../src/patcher-targets.mts";

type TargetInspection = {
  spec: TargetSpec;
  filePath: string | null;
  state: "guarded" | "patched" | "legacy-patched" | "needle-only" | "missing";
};

function usage(): never {
  console.error("Usage: pnpm exec tsx scripts/inspect-bundle-targets.mts <assets-dir-or-extracted-app-dir>");
  process.exit(1);
}

function resolveAssetsDir(inputPath: string): string {
  const absolute = resolve(inputPath);
  const candidates = [
    absolute,
    join(absolute, "webview", "assets"),
    join(absolute, "Contents", "Resources", "app", "webview", "assets"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  throw new Error(`Assets directory not found for ${inputPath}`);
}

function walkJsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(fullPath);
    }
  }
  return results;
}

function inspectTarget(spec: TargetSpec, jsFiles: string[]): TargetInspection {
  let needleFile: string | null = null;
  for (const filePath of jsFiles) {
    const content = readFileSync(filePath, "utf8");
    if (!content.includes(spec.needle)) {
      continue;
    }
    needleFile ??= filePath;
    const match = inspectSpec(content, spec);
    if (!match) {
      continue;
    }
    if (match.guarded) {
      return { spec, filePath, state: "guarded" };
    }
    if (match.patched) {
      return { spec, filePath, state: "patched" };
    }
    if (match.legacyPatched) {
      return { spec, filePath, state: "legacy-patched" };
    }
  }
  return needleFile ? { spec, filePath: needleFile, state: "needle-only" } : { spec, filePath: null, state: "missing" };
}

function printInspection(assetsDir: string, inspections: TargetInspection[]): void {
  console.log(`Assets: ${assetsDir}`);
  console.log(`JavaScript files: ${walkJsFiles(assetsDir).length}`);
  console.log("");
  for (const inspection of inspections) {
    const file = inspection.filePath ? relative(assetsDir, inspection.filePath) : "-";
    console.log(`${inspection.state.padEnd(14)} ${inspection.spec.id.padEnd(42)} ${file}`);
  }
}

const inputPath = process.argv[2];
if (!inputPath || inputPath === "--help" || inputPath === "-h") {
  usage();
}

try {
  const assetsDir = resolveAssetsDir(inputPath);
  const jsFiles = walkJsFiles(assetsDir);
  if (jsFiles.length === 0) {
    throw new Error(`No JavaScript files found in ${assetsDir}`);
  }
  printInspection(assetsDir, TARGET_SPECS.map((spec) => inspectTarget(spec, jsFiles)));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
