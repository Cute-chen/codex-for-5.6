#!/bin/zsh

set -u

RESOURCE_DIR="${0:A:h}"
CODEXFAST="$RESOURCE_DIR/codexfast"
HELPER_APP="$RESOURCE_DIR/Codex56Status.app"
STATE_DIR="$HOME/Library/Application Support/AICodeMirror/Codex 5.6"
PID_FILE="$STATE_DIR/status-helper.pid"
READY_FILE="$STATE_DIR/ready"
FAILURE_FILE="$STATE_DIR/failure"
LOG_FILE="$STATE_DIR/codexfast.log"
BOOT_LOG="$STATE_DIR/launcher.log"

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/.volta/bin:$PATH"

function close_terminal_window() {
  if [[ "${CODEX56_TEST_MODE:-0}" == "1" ]]; then
    return
  fi
  (
    sleep 0.6
    /usr/bin/osascript <<'APPLESCRIPT'
tell application "Terminal"
    repeat with terminalWindow in windows
        repeat with terminalTab in tabs of terminalWindow
            if custom title of terminalTab is "AICodeMirror Codex 5.6" then
                close terminalWindow
                return
            end if
        end repeat
    end repeat
end tell
APPLESCRIPT
  ) >/dev/null 2>&1 &!
}

function finish_and_close() {
  close_terminal_window
  exit 0
}

function wait_then_close() {
  print ""
  read -k 1 "?按任意键关闭..."
  print ""
  finish_and_close
}

function codex_is_running() {
  /usr/bin/pgrep -x ChatGPT >/dev/null 2>&1 || /usr/bin/pgrep -x Codex >/dev/null 2>&1
}

function stop_running_codex() {
  /usr/bin/osascript -e 'tell application "ChatGPT" to quit' >/dev/null 2>&1 || true
  /usr/bin/osascript -e 'tell application "Codex" to quit' >/dev/null 2>&1 || true

  local attempt
  for attempt in {1..20}; do
    codex_is_running || return 0
    sleep 0.5
  done

  /usr/bin/pkill -TERM -x ChatGPT >/dev/null 2>&1 || true
  /usr/bin/pkill -TERM -x Codex >/dev/null 2>&1 || true

  for attempt in {1..10}; do
    codex_is_running || return 0
    sleep 0.5
  done

  return 1
}

function find_node() {
  local node_bin
  node_bin="$(command -v node 2>/dev/null || true)"
  if [[ -z "$node_bin" && -s "$HOME/.nvm/nvm.sh" ]]; then
    source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
    node_bin="$(command -v node 2>/dev/null || true)"
  fi
  print -r -- "$node_bin"
}

function helper_is_running() {
  [[ -s "$PID_FILE" ]] || return 1
  local helper_pid
  helper_pid="$(<"$PID_FILE")"
  [[ "$helper_pid" == <-> ]] || return 1
  /bin/kill -0 "$helper_pid" >/dev/null 2>&1
}

clear
print -P "%F{cyan}============================================%f"
print -P "%F{cyan}             AICodeMirror Codex 5.6%f"
print -P "%F{cyan}============================================%f"
print ""
print "感谢开源项目 Veath/codexfast："
print -P "%F{blue}https://github.com/Veath/codexfast%f"
print ""
print -P "%B由 AICodeMirror 团队制作%b"
print ""
print "1、开始注入 5.6 模型列表插件"
print "2、退出"
print ""
read "choice?请输入选项："

case "$choice" in
  1) ;;
  2) finish_and_close ;;
  *)
    print -P "%F{red}无效选项。%f"
    wait_then_close
    ;;
esac

/bin/mkdir -p "$STATE_DIR"

if helper_is_running; then
  print ""
  print -P "%F{green}Codex 显示5.6系列模型已注入成功，请享用%f"
  sleep 3
  finish_and_close
fi

/bin/rm -f "$PID_FILE" "$READY_FILE" "$FAILURE_FILE"

if codex_is_running; then
  print ""
  print -P "%F{yellow}检测到 Codex App 正在运行。%f"
  print "1、继续关闭并重启 Codex App"
  print "2、退出"
  print ""
  read "restart_choice?请输入选项："

  case "$restart_choice" in
    1)
      print ""
      print "正在关闭 Codex App..."
      if ! stop_running_codex; then
        print -P "%F{red}无法完全关闭 Codex App，请手动退出后重试。%f"
        wait_then_close
      fi
      ;;
    2) finish_and_close ;;
    *)
      print -P "%F{red}无效选项。%f"
      wait_then_close
      ;;
  esac
fi

NODE_BIN="$(find_node)"
if [[ -z "$NODE_BIN" ]]; then
  print ""
  print -P "%F{red}未找到 Node.js。需要 Node.js 18.12 或更高版本。%f"
  wait_then_close
fi

print ""
print "正在注入 GPT-5.6 模型列表，请稍候..."

if ! /usr/bin/open -n "$HELPER_APP" --args "$NODE_BIN" "$CODEXFAST" "$STATE_DIR" >>"$BOOT_LOG" 2>&1; then
  print -P "%F{red}菜单栏 helper 启动失败。%f"
  wait_then_close
fi

local_attempt=0
while (( local_attempt < 120 )); do
  if [[ -f "$READY_FILE" ]]; then
    print ""
    print -P "%F{green}%BCodex 显示5.6系列模型已注入成功，请享用%b%f"
    print -P "%F{245}菜单栏中的“5.6”可用于查看日志或关闭注入。%f"
    sleep 3
    finish_and_close
  fi

  if [[ -f "$FAILURE_FILE" ]]; then
    print ""
    print -P "%F{red}注入失败：%f"
    /usr/bin/tail -n 20 "$FAILURE_FILE" 2>/dev/null || true
    print ""
    print -P "%F{245}运行日志：$LOG_FILE%f"
    wait_then_close
  fi

  if [[ -s "$PID_FILE" ]] && ! helper_is_running; then
    print ""
    print -P "%F{red}菜单栏 helper 已意外退出。%f"
    /usr/bin/tail -n 20 "$LOG_FILE" 2>/dev/null || true
    wait_then_close
  fi

  sleep 0.5
  (( local_attempt += 1 ))
done

print ""
print -P "%F{red}等待注入完成超时。%f"
print -P "%F{245}运行日志：$LOG_FILE%f"
wait_then_close
