# Fast Global Service Tier Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the configured global `service_tier` authoritative for every existing `26.707` conversation so switching conversations cannot restore stale Fast or Standard state.

**Architecture:** Keep the official build `5059` guarded matcher, but replace its conversation/turn fallback with the already-computed base tier. Existing model capability and allowance normalization remains unchanged, while stored conversation and latest-turn tier fields become non-authoritative.

**Tech Stack:** TypeScript, Node.js, regex-based runtime JavaScript patching, generated single-file CLI, shell-backed regression suite.

---

## File Map

- Modify `test/suites/runtime-patch-suite.mts`: prove the generated request-tier expression always returns the configured base tier for existing conversations.
- Modify `src/targets/speed.mts`: emit and recognize `requestTier = baseTier` for the `26.707` fallback target.
- Modify `docs/feature-scope.md`: describe build `26.707` global tier authority without changing earlier-bundle behavior claims.
- Modify `docs/patch-targets.md`: record the updated build `5059` fallback strategy.
- Modify `CHANGELOG.md`: replace the narrower unreleased fallback entry with the full bidirectional fix.
- Regenerate `bin/codexfast`: include the updated runtime target in the self-contained launcher.

### Task 1: Add the failing global-authority regression

**Files:**
- Modify: `test/suites/runtime-patch-suite.mts` near `serviceTierConversationFallback26707Result`

- [ ] **Step 1: Require the generated request tier to use the base tier directly**

Replace the current 26.707 string assertion with:

```ts
  assertContains(
    serviceTierConversationFallback26707Result.content,
    "k=O;S=Iee(s,k,y)",
    "expected 26.707 fallback to use the configured base tier as the only source for existing conversations",
  );
```

- [ ] **Step 2: Update the semantic expression checks**

Keep the existing expression extraction, then replace its three behavior checks with:

```ts
  if (requestTierExpression26707 !== "O") {
    fail(
      "expected the 26.707 request-tier expression to ignore conversation and latest-turn tier state",
      requestTierExpression26707,
    );
  }
  const resolveConversationTier26707 = new Function(
    "e",
    "u",
    "O",
    `return ${requestTierExpression26707}`,
  ) as (
    conversationId: string | null,
    nextTurnSettings: { serviceTier?: string | null } | null,
    configuredTier: string | null,
  ) => string | null;
  if (
    resolveConversationTier26707("conversation", { serviceTier: "priority" }, "default") !==
    "default"
  ) {
    fail("expected configured Standard to override stale conversation Fast");
  }
  if (
    resolveConversationTier26707("conversation", { serviceTier: "default" }, "priority") !==
    "priority"
  ) {
    fail("expected configured Fast to override stale conversation Standard");
  }
  if (
    resolveConversationTier26707("conversation", { serviceTier: "standard" }, "priority") !==
    "priority"
  ) {
    fail("expected configured Fast to override legacy conversation Standard");
  }
  if (
    resolveConversationTier26707("conversation", { serviceTier: "priority" }, "priority") !==
    "priority"
  ) {
    fail("expected configured Fast to remain Fast when conversation state matches");
  }
```

- [ ] **Step 3: Run the focused regression and verify RED**

Run:

```bash
pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: exit `1` with the new global-authority assertion because the current patched expression still lets conversation `"priority"` override configured `"default"`.

### Task 2: Implement the single-source target

**Files:**
- Modify: `src/targets/speed.mts` in `SERVICE_TIER_CONVERSATION_FALLBACK_26707_PATCHED_SIGNATURE`
- Modify: `src/targets/speed.mts` in `patchConversationServiceTierFallback26707`

- [ ] **Step 1: Recognize the new patched expression**

Replace `SERVICE_TIER_CONVERSATION_FALLBACK_26707_PATCHED_SIGNATURE` with:

```ts
const SERVICE_TIER_CONVERSATION_FALLBACK_26707_PATCHED_SIGNATURE =
  /(let [^;]+,([A-Za-z_$][\w$]*)=[A-Za-z_$][\w$]*==null&&[A-Za-z_$][\w$]*!=null\?[A-Za-z_$][\w$]*\.value:[A-Za-z_$][\w$]*\?[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\):[A-Za-z_$][\w$]*\.serviceTier,([A-Za-z_$][\w$]*)=\2;)([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\(([^,]+),\3,([A-Za-z_$][\w$]*)\),/;
```

- [ ] **Step 2: Mark unused guarded captures explicitly**

Change the callback parameters to:

```ts
  _conversationVar: string,
  _nextTurnSettingsVar: string,
  _latestTurnTierVar: string,
```

- [ ] **Step 3: Emit the base tier directly**

Replace the callback return with:

```ts
  return `${prefixBeforeRequestTier}${requestTierVar}=${baseTierVar};${serviceTierForRequestVar}=${fallbackFunction}(${modelVar},${requestTierVar},${isAllowedVar}),`;
```

- [ ] **Step 4: Regenerate the launcher**

Run:

```bash
pnpm build
```

Expected: `bin/codexfast` contains the new patched signature and `requestTier = baseTier` replacement.

- [ ] **Step 5: Re-run the focused regression and verify GREEN**

Run:

```bash
pnpm exec tsx test/runtime-launch-flow.mts
```

Expected: `runtime launch flow test passed`, including repeated-patch idempotency and generated CLI coverage.

### Task 3: Update reusable behavior documentation

**Files:**
- Modify: `docs/feature-scope.md`
- Modify: `docs/patch-targets.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Split earlier and 26.707 fallback behavior in feature scope**

Replace the current reopened-conversation bullet with:

```markdown
- On earlier service-tier bundles, reopened conversations and paused/edited resends keep explicit non-standard next-turn Fast selections while falling back to the configured Settings tier when stale Standard/null conversation-level or latest-turn state would otherwise force Standard.
- On `26.707.31428`, the configured Settings tier is the single source of truth for existing conversations, so stored conversation-level and latest-turn service-tier state cannot restore Fast or Standard after the global setting changes.
```

- [ ] **Step 2: Replace the build-specific fallback sentence**

In the `26.707.31428` paragraph of `docs/patch-targets.md`, replace the existing conversation-fallback sentence with:

```text
The conversation fallback uses the resolved base tier directly, making the configured Settings tier authoritative for existing conversations and ignoring stored conversation-level or latest-turn Fast/Standard state after switching conversations.
```

- [ ] **Step 3: Replace the unreleased changelog item**

Use this single entry under `## [Unreleased]` / `### Fixed`:

```markdown
- Fixed Fast/Standard state drifting across reopened `26.707` conversations by making the configured global service tier authoritative and ignoring stored conversation-level and latest-turn tier values in both directions.
```

- [ ] **Step 4: Check generated and documentation consistency**

Run:

```bash
git diff --check
pnpm build:check
```

Expected: both commands exit successfully.

### Task 4: Run complete verification and commit

**Files:**
- Verify all modified files; no additional implementation files expected

- [ ] **Step 1: Run type and regression gates**

Run:

```bash
pnpm typecheck
pnpm test
```

Expected: typecheck succeeds, supported-version drift reports 44 builds, and `runtime launch flow test passed`.

- [ ] **Step 2: Verify the real extracted bundle still matches**

Run:

```bash
pnpm inspect:bundle-targets /tmp/codexfast-5059.wWWURZ/app
```

Expected: `speed-service-tier-conversation-fallback-26707` is `guarded` in the official extracted build `5059` bundle.

- [ ] **Step 3: Apply the new patch to the real extracted source in memory**

Run:

```bash
pnpm exec tsx -e 'import { readFileSync } from "node:fs"; import { applyRuntimePatchesToBody } from "./src/patch-engine.mts"; const file = "/tmp/codexfast-5059.wWWURZ/app/webview/assets/app-initial~app-main~onboarding-page~hotkey-window-thread-page~quick-chat-window-page~chatg~k0ede4gb-C17KDkOa.js"; const body = readFileSync(file, "utf8"); const result = applyRuntimePatchesToBody(file, body); if (!result.content.includes("k=O;S=Iee(s,k,y)")) throw new Error("real bundle did not use the configured base tier directly"); if (!result.patchedLabels.includes("Speed service tier conversation fallback")) throw new Error("real bundle did not report the fallback target"); console.log("REAL_BUNDLE_GLOBAL_TIER_OK");'
```

Expected: print `REAL_BUNDLE_GLOBAL_TIER_OK` without writing the extracted bundle.

- [ ] **Step 4: Verify the installed app remains untouched**

Run:

```bash
stat -f '%N %z %Sm' /Applications/ChatGPT.app/Contents/Resources/app.asar /Applications/ChatGPT.app/Contents/Info.plist
codesign --verify --deep --strict /Applications/ChatGPT.app
```

Expected: both files remain present and signature verification exits successfully. Do not restart the active app during this implementation.

- [ ] **Step 5: Commit the focused fix**

Run:

```bash
git add src/targets/speed.mts test/suites/runtime-patch-suite.mts bin/codexfast docs/feature-scope.md docs/patch-targets.md CHANGELOG.md docs/superpowers/plans/2026-07-10-fast-global-service-tier-source.md
git commit -m "fix: make Fast tier globally authoritative"
```

Expected: one focused Conventional Commit. Do not publish or create a release.
