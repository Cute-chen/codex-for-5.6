# Fast Conversation Default Fallback Design

## Context

On `ChatGPT.app` `26.707.31428` build `5059`, enabling Fast globally does not keep every reopened conversation on Fast. Runtime inspection showed that affected conversations can retain `serviceTier: "default"`, while the configured Fast tier is `"priority"`.

The current `26.707` conversation-fallback patch ignores `null` and the older `"standard"` spelling, but still treats `"default"` as an explicit next-turn override. That stale value therefore wins over the configured Fast tier for only the conversations that retain it.

## Desired Behavior

- Treat `null`, `"standard"`, and `"default"` conversation-level Standard values as fallback state, not as overrides of the configured Settings tier.
- Preserve an explicit non-Standard next-turn tier such as `"priority"`.
- Continue ignoring stale latest-turn `params.serviceTier` state.
- Keep model support and service-tier allowance validation unchanged.
- Keep the runtime-only launcher model and do not modify the installed app bundle.

## Implementation Approach

Update the `26.707` conversation-fallback target in `src/targets/speed.mts` so its patched request-tier expression accepts a conversation next-turn tier only when that value is neither `"standard"` nor `"default"`. Otherwise it must use the configured Settings tier before calling the existing request-tier normalization helper.

Keep the change limited to this target family. Do not clear or rewrite stored conversation settings during navigation, because that would add persistent state mutation to a value-selection fix.

## Regression Coverage

Extend the runtime patch suite before changing production code. The failing regression must prove that the generated patched expression no longer lets `"default"` override configured `"priority"`.

Cover these cases:

- conversation next-turn `"default"` plus configured `"priority"` resolves to Fast
- conversation next-turn `"standard"` plus configured `"priority"` resolves to Fast
- conversation next-turn `"priority"` remains Fast
- stale latest-turn service-tier state remains excluded
- repeated patching remains idempotent

Run the normal validation gates after regenerating `bin/codexfast`:

```bash
pnpm build:check
pnpm typecheck
pnpm test
```

Also inspect the real extracted build `5059` bundle and the live/runtime-patched expression. A fresh real-app launch cannot be claimed while the active ChatGPT session is needed for the current conversation.

## Documentation Scope

Update `docs/feature-scope.md`, `docs/patch-targets.md`, and `CHANGELOG.md` to state that both current `"default"` and legacy `"standard"` conversation values fall back to the configured Settings tier. Update README wording only if its existing Fast persistence description would otherwise remain inaccurate.

## Non-Goals

- Do not change Fast into a per-conversation-only setting.
- Do not clear stored conversation settings on navigation.
- Do not change model metadata, Plugins targets, automatic-update behavior, compatibility whitelist entries, or package version metadata.
- Do not publish or release a package as part of this implementation.
