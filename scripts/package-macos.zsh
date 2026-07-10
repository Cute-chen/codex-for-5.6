#!/bin/zsh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$REPO_ROOT/dist"
APP_NAME="ACM For Codex 5.6模型插件.app"
APP_DIR="$DIST_DIR/$APP_NAME"
CONTENTS_DIR="$APP_DIR/Contents"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
STATUS_APP="$RESOURCES_DIR/Codex56Status.app"
STATUS_CONTENTS="$STATUS_APP/Contents"
ZIP_PATH="$DIST_DIR/Mac-ACM.For.Codex.5.6.zip"

rm -rf "$APP_DIR" "$ZIP_PATH"
mkdir -p "$CONTENTS_DIR/MacOS" "$RESOURCES_DIR/Source" "$STATUS_CONTENTS/MacOS"

cp "$REPO_ROOT/macos/Info.plist" "$CONTENTS_DIR/Info.plist"
cp "$REPO_ROOT/macos/launcher.zsh" "$CONTENTS_DIR/MacOS/launcher"
cp "$REPO_ROOT/macos/run-ui.command" "$RESOURCES_DIR/run-ui.command"
cp "$REPO_ROOT/macos/Codex56Status.m" "$RESOURCES_DIR/Source/Codex56Status.m"
cp "$REPO_ROOT/macos/app.icns" "$RESOURCES_DIR/app.icns"
cp "$REPO_ROOT/runtime/macos/codexfast.js" "$RESOURCES_DIR/codexfast"
cp "$REPO_ROOT/LICENSE" "$RESOURCES_DIR/codexfast-LICENSE.txt"
cp "$REPO_ROOT/NOTICE.md" "$RESOURCES_DIR/OPEN_SOURCE_NOTICES.txt"
chmod +x "$CONTENTS_DIR/MacOS/launcher" "$RESOURCES_DIR/run-ui.command" "$RESOURCES_DIR/codexfast"

cp "$REPO_ROOT/macos/StatusInfo.plist" "$STATUS_CONTENTS/Info.plist"
clang -O2 -fobjc-arc -framework Cocoa "$REPO_ROOT/macos/Codex56Status.m" \
  -o "$STATUS_CONTENTS/MacOS/Codex56Status"

codesign --force --sign - "$STATUS_APP"
codesign --force --deep --sign - "$APP_DIR"
ditto -c -k --sequesterRsrc --keepParent "$APP_DIR" "$ZIP_PATH"

print "Created $ZIP_PATH"
