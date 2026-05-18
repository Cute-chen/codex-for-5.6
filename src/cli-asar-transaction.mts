import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export type ArchiveSnapshot = {
  archivePath: string | null;
  integrityHash: string;
};

export function calculateAsarHeaderHash(archivePath: string): string | null {
  try {
    const archive = readFileSync(archivePath);
    const headerStringSize = archive.readUInt32LE(12);
    const headerString = archive.subarray(16, 16 + headerStringSize).toString("utf8");
    return createHash("sha256").update(headerString).digest("hex");
  } catch {
    return null;
  }
}

export function snapshotArchive(tempRoot: string, archivePath: string, integrityHash: string): ArchiveSnapshot | null {
  if (!existsSync(archivePath)) {
    return { archivePath: null, integrityHash };
  }

  const snapshotPath = join(tempRoot, "previous.app.asar");
  try {
    copyFileSync(archivePath, snapshotPath);
    return { archivePath: snapshotPath, integrityHash };
  } catch {
    return null;
  }
}

export function replaceArchiveAtomically(sourceArchive: string, targetArchive: string, resourcesDir: string, tempFileName: string): boolean {
  const targetTempAsar = join(resourcesDir, tempFileName);
  try {
    rmSync(targetTempAsar, { force: true });
    copyFileSync(sourceArchive, targetTempAsar);
    renameSync(targetTempAsar, targetArchive);
    return true;
  } catch {
    rmSync(targetTempAsar, { force: true });
    return false;
  }
}

export function removeStaleArchiveTempFiles(resourcesDir: string, staleBeforeMs: number): void {
  if (!existsSync(resourcesDir)) {
    return;
  }
  for (const entry of readdirSync(resourcesDir)) {
    if (!entry.startsWith(".codexfast.") || !entry.endsWith(".app.asar.tmp")) {
      continue;
    }
    const tempFile = join(resourcesDir, entry);
    try {
      if (statSync(tempFile).mtimeMs < staleBeforeMs) {
        rmSync(tempFile, { force: true });
      }
    } catch {
      rmSync(tempFile, { force: true });
    }
  }
}
