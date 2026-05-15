import { TARGET_SPECS, type Replacement, type TargetMatch, type TargetSpec } from "./patcher-targets.mts";

export type RuntimePatchResult = {
  content: string;
  matchedLabels: string[];
  patchedLabels: string[];
  alreadyPatchedLabels: string[];
};

export function replaceContent(content: string, signature: RegExp, replacement: Replacement): string {
  if (typeof replacement === "string") {
    return content.replace(signature, replacement);
  }

  return content.replace(signature, (...args: unknown[]) =>
    replacement(String(args[0] ?? ""), ...args.slice(1).map((value) => String(value))),
  );
}

export function replaceContentOrThrow(
  content: string,
  signature: RegExp | null,
  replacement: Replacement | undefined,
  label: string,
): string {
  if (!signature || !replacement) {
    throw new Error(`Missing replacement metadata for ${label}.`);
  }
  return replaceContent(content, signature, replacement);
}

export function inspectSpec(content: string, spec: TargetSpec): TargetMatch | null {
  if (!content.includes(spec.needle)) {
    return null;
  }

  const guarded = spec.guardedSignature.test(content);
  const patched = spec.patchedSignature.test(content);
  const legacyPatched = spec.legacyPatchedSignature?.test(content) ?? false;

  if (!guarded && !patched && !legacyPatched) {
    return null;
  }

  return {
    spec,
    guarded,
    patched,
    legacyPatched,
  };
}

export function describeState(match: TargetMatch): string {
  if (match.guarded) {
    return `${match.spec.label} disabled`;
  }
  if (match.patched || match.legacyPatched) {
    return `${match.spec.label} enabled`;
  }
  return "Unknown state";
}

export function applyRuntimePatchesToBody(_resourcePath: string, body: string): RuntimePatchResult {
  let content = body;
  const matchedLabels: string[] = [];
  const patchedLabels: string[] = [];
  const alreadyPatchedLabels: string[] = [];

  for (const spec of TARGET_SPECS) {
    const match = inspectSpec(content, spec);
    if (!match) {
      continue;
    }

    matchedLabels.push(spec.label);
    if (match.guarded) {
      content = replaceContent(content, spec.guardedSignature, spec.applyReplacement);
      patchedLabels.push(spec.label);
      continue;
    }

    if (match.legacyPatched) {
      content = replaceContentOrThrow(content, spec.legacyPatchedSignature, spec.normalizeReplacement, spec.label);
      patchedLabels.push(spec.label);
      continue;
    }

    if (match.patched) {
      alreadyPatchedLabels.push(spec.label);
    }
  }

  return {
    content,
    matchedLabels,
    patchedLabels,
    alreadyPatchedLabels,
  };
}
