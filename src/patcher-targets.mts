import { MODEL_TARGET_SPECS, GPT_55_OFFICIAL_MODEL_LIST_MIN_VERSION } from "./targets/models.mts";
import { PLUGIN_TARGET_SPECS } from "./targets/plugins.mts";
import { SPEED_TARGET_SPECS } from "./targets/speed.mts";

export { GPT_55_OFFICIAL_MODEL_LIST_MIN_VERSION };

export type ReplacementCallback = (match: string, ...captures: string[]) => string;
export type Replacement = string | ReplacementCallback;

export type TargetSpec = {
  id: string;
  label: string;
  needle: string;
  guardedSignature: RegExp;
  patchedSignature: RegExp;
  legacyPatchedSignature: RegExp | null;
  applyReplacement: Replacement;
  normalizeReplacement?: Replacement;
  restoreReplacement?: Replacement;
};

export type TargetState = {
  guarded: boolean;
  patched: boolean;
  legacyPatched: boolean;
};

export type TargetMatch = TargetState & {
  spec: TargetSpec;
};

export type FileTarget = {
  filePath: string;
  backupPath: string;
  backupPaths: string[];
  content: string;
  matches: TargetMatch[];
};

export const TARGET_SPECS: TargetSpec[] = [
  ...SPEED_TARGET_SPECS,
  ...PLUGIN_TARGET_SPECS,
  ...MODEL_TARGET_SPECS,
];
