import { join } from "node:path";

export type AppPaths = {
  bundle: string;
  resources: string;
  infoPlist: string;
  asar: string;
  asarBackup: string;
  sparklePublicEdKeyBackup: string;
};

export type AppMetadata = {
  version: string;
  build: string;
  versionKey: string;
  compatibility: string;
  supported: boolean;
};

export type TempWorkspace = {
  root: string;
  appDir: string;
  assetsDir: string;
  asar: string;
};

export type Toolchain = {
  node: string;
  npm: string;
  npx: string;
  codesign: string;
  plistBuddy: string;
};

export type CodexfastContext = {
  paths: AppPaths;
  metadata: AppMetadata;
  temp: TempWorkspace;
  toolchain: Toolchain;
};

export function createAppPaths(appBundle = "/Applications/Codex.app"): AppPaths {
  const resources = join(appBundle, "Contents", "Resources");
  return {
    bundle: appBundle,
    resources,
    infoPlist: join(appBundle, "Contents", "Info.plist"),
    asar: join(resources, "app.asar"),
    asarBackup: join(resources, "app.asar1"),
    sparklePublicEdKeyBackup: join(resources, "SUPublicEDKey.codexfast.bak"),
  };
}

export function emptyAppMetadata(): AppMetadata {
  return {
    version: "unknown",
    build: "unknown",
    versionKey: "unknown+unknown",
    compatibility: "unsupported",
    supported: false,
  };
}

export function emptyTempWorkspace(): TempWorkspace {
  return {
    root: "",
    appDir: "",
    assetsDir: "",
    asar: "",
  };
}

export function emptyToolchain(): Toolchain {
  return {
    node: "",
    npm: "",
    npx: "",
    codesign: "",
    plistBuddy: "",
  };
}

export function createCodexfastContext(appBundle = process.env.CODEXFAST_APP_BUNDLE): CodexfastContext {
  return {
    paths: createAppPaths(appBundle ?? "/Applications/Codex.app"),
    metadata: emptyAppMetadata(),
    temp: emptyTempWorkspace(),
    toolchain: emptyToolchain(),
  };
}
