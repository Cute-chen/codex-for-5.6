#!/bin/zsh

set -u

APP_ROOT="${0:A:h:h}"
RUN_UI="$APP_ROOT/Resources/run-ui.command"

/usr/bin/osascript \
  -e 'on run argv' \
  -e 'set uiPath to item 1 of argv' \
  -e 'tell application "Terminal"' \
  -e 'activate' \
  -e 'set uiTab to do script "/bin/zsh " & quoted form of uiPath' \
  -e 'set custom title of uiTab to "AICodeMirror Codex 5.6"' \
  -e 'end tell' \
  -e 'end run' \
  -- "$RUN_UI"
