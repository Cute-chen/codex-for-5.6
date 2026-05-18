import { existsSync } from "node:fs";
import type { CodexfastContext } from "./cli-context.mts";
import { printLine, resolveCommand, resolvePlistBuddy, run } from "./cli-utils.mts";

export type CheckRequirementsOptions = {
  command?: string;
  context: CodexfastContext;
  cleanupStaleArchiveTempFiles: () => void;
  supportedAppVersions: Record<string, string>;
  supportedAppVersionKeys: string;
};

function readBundlePlistValueForContext(
  context: CodexfastContext,
  key: string,
  fallback = "unknown",
): string {
  const result = run(context.toolchain.plistBuddy, [
    "-c",
    `Print :${key}`,
    context.paths.infoPlist,
  ]);
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function loadAppCompatibilityMetadataForContext(
  context: CodexfastContext,
  supportedAppVersions: Record<string, string>,
): void {
  context.metadata.version = readBundlePlistValueForContext(
    context,
    "CFBundleShortVersionString",
  );
  context.metadata.build = readBundlePlistValueForContext(
    context,
    "CFBundleVersion",
  );
  context.metadata.versionKey = `${context.metadata.version}+${context.metadata.build}`;
  context.metadata.supported = Object.prototype.hasOwnProperty.call(
    supportedAppVersions,
    context.metadata.versionKey,
  );
  context.metadata.compatibility = context.metadata.supported
    ? `supported (${supportedAppVersions[context.metadata.versionKey]})`
    : "unsupported";
}

export function checkRequirements(
  options: CheckRequirementsOptions,
): boolean {
  const {
    cleanupStaleArchiveTempFiles,
    command,
    context,
    supportedAppVersionKeys,
    supportedAppVersions,
  } = options;

  if (!existsSync(context.paths.resources)) {
    printLine(
      `Codex resources directory not found: ${context.paths.resources}`,
    );
    printLine(`Make sure Codex.app is installed at ${context.paths.bundle}.`);
    return false;
  }

  context.toolchain.node = process.execPath;
  context.toolchain.plistBuddy = resolvePlistBuddy() ?? "";

  if (!context.toolchain.plistBuddy) {
    printLine("PlistBuddy not found.");
    printLine(
      "This macOS environment cannot update ElectronAsarIntegrity in Info.plist.",
    );
    return false;
  }

  cleanupStaleArchiveTempFiles();

  loadAppCompatibilityMetadataForContext(context, supportedAppVersions);

  if (
    (command === "repair" && !context.metadata.supported) ||
    command === "launch"
  ) {
    return true;
  }

  context.toolchain.npm = resolveCommand("npm") ?? "";
  context.toolchain.npx = resolveCommand("npx") ?? "";
  context.toolchain.codesign = resolveCommand("codesign") ?? "";

  if (!context.toolchain.npm) {
    printLine("npm not found.");
    printLine("Make sure npm is available in your shell.");
    return false;
  }
  if (command === "install-watcher" && !context.toolchain.npx) {
    printLine("npx not found.");
    printLine("Make sure npx is available in your shell.");
    return false;
  }
  if (!context.toolchain.codesign) {
    printLine("codesign not found.");
    printLine("This macOS environment cannot perform local re-signing.");
    return false;
  }

  return true;
}
