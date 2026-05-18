import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CdpConnection,
  cdpCommandWithTimeout,
  waitForRuntimePatchConnection,
} from "./cli-cdp.mts";
import type { CodexfastContext } from "./cli-context.mts";
import { printExitBlock, printExitCode } from "./cli-output.mts";
import {
  applyRuntimePatchesToResponseBodyWithSource,
  isRuntimeJavaScriptResource,
  type RuntimePatchResult,
} from "./cli-runtime-patcher.mts";
import {
  asError,
  debugRuntime,
  printLine,
  resolveCommand,
  run,
  sleep,
} from "./cli-utils.mts";

type FetchHeader = {
  name: string;
  value: string;
};

type FetchRequestPausedParams = {
  requestId: string;
  request: {
    url: string;
  };
  responseHeaders?: FetchHeader[];
  responseStatusCode?: number;
};

type RuntimePatchSessionHandle = {
  patchedLabels: string[];
  close: () => void;
  lost: Promise<Error>;
};

type CodexRunningCheck =
  | { ok: true; running: boolean }
  | { ok: false; message: string };

export type RuntimeLaunchOptions = {
  context: CodexfastContext;
  patcherSource: string;
  supportedAppVersionKeys: string;
  printActionHeader: (action: string) => void;
  removeLegacyWatcherFiles: (options?: {
    quietLaunchctl?: boolean;
    reportRemoved?: boolean;
  }) => boolean;
};

const runtimePatchSessionTimeoutMs = 12_000;
const runtimePatchSettleMs = 750;
const runtimePatchInitialLoadSettleMs = 1_000;
const runtimePatchHeartbeatIntervalMs = 5_000;
const runtimePatchHeartbeatTimeoutMs = 2_000;
const runtimePatchReconnectMaxAttempts = 3;
const runtimePatchReconnectDelayMs = 1_000;

function checkCodexRunning(): CodexRunningCheck {
  if (process.env.CODEXFAST_TEST_CODEX_RUNNING === "1") {
    return { ok: true, running: true };
  }

  const pgrepBin = resolveCommand("pgrep");
  if (!pgrepBin) {
    return {
      ok: false,
      message:
        "Cannot determine whether Codex.app is running because pgrep was not found.",
    };
  }

  const result = run(pgrepBin, ["-x", "Codex"]);
  if (result.status === 0) {
    return { ok: true, running: true };
  }
  if (result.status === 1) {
    return { ok: true, running: false };
  }
  return {
    ok: false,
    message: `Cannot determine whether Codex.app is running because pgrep failed with exit code ${result.status}.`,
  };
}

function randomDebugPort(): number {
  return 40_000 + (randomBytes(2).readUInt16BE(0) % 20_000);
}

function codexExecutablePath(context: CodexfastContext): string {
  return join(context.paths.bundle, "Contents", "MacOS", "Codex");
}

function launchCodexProcess(
  context: CodexfastContext,
  debugPort: number,
): ChildProcess {
  const executable = codexExecutablePath(context);
  if (!existsSync(executable)) {
    throw new Error(`Codex executable not found: ${executable}`);
  }

  const child = spawn(
    executable,
    [
      `--remote-debugging-port=${debugPort}`,
      "--remote-debugging-address=127.0.0.1",
    ],
    {
      detached: true,
      stdio: "ignore",
      env: process.env,
    },
  );
  child.on("error", () => undefined);
  child.unref();
  return child;
}

function terminateRuntimeLaunchProcess(child: ChildProcess): void {
  if (!child.pid || child.killed) {
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill();
  }
}

function responseHeadersForFulfill(
  headers: FetchHeader[] | undefined,
): FetchHeader[] {
  const forwarded: FetchHeader[] = [];
  for (const header of headers ?? []) {
    const name = header.name.toLowerCase();
    if (name === "content-type" || name === "charset") {
      forwarded.push({ name: header.name, value: header.value });
    }
  }
  if (
    !forwarded.some((header) => header.name.toLowerCase() === "content-type")
  ) {
    forwarded.push({
      name: "content-type",
      value: "application/javascript; charset=utf-8",
    });
  }
  return forwarded;
}

async function continueFetchRequest(
  cdp: CdpConnection,
  requestId: string,
): Promise<void> {
  await cdp.send("Fetch.continueRequest", { requestId });
}

async function handleFetchRequestPaused(
  cdp: CdpConnection,
  patcherSource: string,
  params: FetchRequestPausedParams,
): Promise<string[]> {
  const resourceUrl = params.request.url;
  if (!isRuntimeJavaScriptResource(resourceUrl)) {
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }
  debugRuntime(`paused ${resourceUrl}`);

  let bodyResult: { body?: string; base64Encoded?: boolean };
  try {
    bodyResult = await cdp.send("Fetch.getResponseBody", {
      requestId: params.requestId,
    });
  } catch {
    debugRuntime(`getResponseBody failed ${resourceUrl}`);
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }

  if (typeof bodyResult.body !== "string") {
    debugRuntime(`missing body ${resourceUrl}`);
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }

  const body = bodyResult.base64Encoded
    ? Buffer.from(bodyResult.body, "base64").toString("utf8")
    : bodyResult.body;
  let patchResult: RuntimePatchResult;
  try {
    patchResult = applyRuntimePatchesToResponseBodyWithSource(
      patcherSource,
      resourceUrl,
      body,
    );
  } catch (error) {
    debugRuntime(`patch failed ${resourceUrl}: ${asError(error).message}`);
    await continueFetchRequest(cdp, params.requestId);
    return [];
  }
  const labels = [
    ...patchResult.patchedLabels,
    ...patchResult.alreadyPatchedLabels,
  ];
  if (patchResult.matchedLabels.length > 0) {
    debugRuntime(
      `matched ${resourceUrl}: ${patchResult.matchedLabels.join(", ")}`,
    );
  }

  if (patchResult.content === body) {
    await continueFetchRequest(cdp, params.requestId);
    return labels;
  }

  await cdp.send("Fetch.fulfillRequest", {
    requestId: params.requestId,
    responseCode: params.responseStatusCode ?? 200,
    responseHeaders: responseHeadersForFulfill(params.responseHeaders),
    body: Buffer.from(patchResult.content, "utf8").toString("base64"),
  });
  return labels;
}

function runtimePatchSessionLostMessage(error: Error): string {
  return `Runtime patch session lost after ${runtimePatchReconnectMaxAttempts} reconnect attempts: ${error.message}`;
}

function printRuntimePatchSessionLost(error: Error): void {
  printLine(error.message);
  printLine("Codex.app will keep running without further runtime patching.");
  printLine(
    "Lazy-loaded features that were not patched before this point may stay unavailable until you fully quit Codex and relaunch with codexfast.",
  );
}

function printRuntimeLaunchReady(patchedLabels: string[]): void {
  printLine("Patched targets:");
  for (const label of patchedLabels) {
    printLine(`  ${label}`);
  }
  printLine("");
  printLine("Runtime launch completed.");
  printLine("Keep this codexfast launch process running while you use Codex.");
  printLine("Quit Codex to end the runtime patch session.");
}

function waitForRuntimeInitialPageLoad(cdp: CdpConnection): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const resolveOnce = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      resolve();
    };

    timeout = setTimeout(resolveOnce, runtimePatchInitialLoadSettleMs);
    cdp.on("Page.loadEventFired", resolveOnce);
    cdp.on("Page.frameStoppedLoading", resolveOnce);
  });
}

async function enableRuntimePatchInterception(
  cdp: CdpConnection,
  options: { waitForInitialLoad: boolean; reload: boolean },
): Promise<void> {
  await cdp.send("Page.enable");
  debugRuntime("Page.enable ok");
  if (options.waitForInitialLoad) {
    await waitForRuntimeInitialPageLoad(cdp);
    debugRuntime("initial page load settled");
  }
  await cdp.send("Fetch.enable", {
    patterns: [
      {
        urlPattern: "app://*/assets/*.js",
        requestStage: "Response",
      },
      {
        urlPattern: "app://*/webview/assets/*.js",
        requestStage: "Response",
      },
    ],
  });
  debugRuntime("Fetch.enable ok");
  if (options.reload) {
    await cdp.send("Page.reload", { ignoreCache: true });
    debugRuntime("Page.reload ok");
  }
}

async function startRuntimePatchSession(
  debugPort: number,
  patcherSource: string,
): Promise<RuntimePatchSessionHandle> {
  let cdp = await waitForRuntimePatchConnection(debugPort);
  const observedLabels = new Set<string>();
  const pausedRequestHandlers = new Set<Promise<void>>();
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  let failSession: (error: Error) => void = () => undefined;
  let keepSessionOpen = false;
  let initialCompleted = false;
  let closed = false;
  let reconnecting = false;
  let connectionGeneration = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let resolveLost: (error: Error) => void = () => undefined;
  let markInitialObserved: () => void = () => undefined;
  const lost = new Promise<Error>((resolve) => {
    resolveLost = resolve;
  });

  const stopHeartbeat = (): void => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const markSessionLost = (error: Error): void => {
    if (closed) {
      return;
    }
    closed = true;
    stopHeartbeat();
    cdp.close();
    resolveLost(error);
  };

  const reconnectRuntimePatchSession = async (reason: Error): Promise<void> => {
    if (closed || reconnecting) {
      return;
    }
    reconnecting = true;
    cdp.close();
    let lastError = reason;

    for (
      let attempt = 1;
      attempt <= runtimePatchReconnectMaxAttempts;
      attempt += 1
    ) {
      if (closed) {
        reconnecting = false;
        return;
      }
      if (attempt > 1) {
        await sleep(runtimePatchReconnectDelayMs);
      }
      printLine(
        `Runtime patch session reconnecting (${attempt}/${runtimePatchReconnectMaxAttempts})...`,
      );
      try {
        const nextCdp = await waitForRuntimePatchConnection(debugPort);
        connectionGeneration += 1;
        cdp = nextCdp;
        registerRuntimeFetchHandler(connectionGeneration);
        await enableRuntimePatchInterception(cdp, {
          waitForInitialLoad: false,
          reload: true,
        });
        printLine("Runtime patch session reconnected.");
        reconnecting = false;
        return;
      } catch (error) {
        lastError = asError(error);
        cdp.close();
      }
    }

    reconnecting = false;
    markSessionLost(new Error(runtimePatchSessionLostMessage(lastError)));
  };

  const handleConnectionFailure = (generation: number, error: Error): void => {
    if (closed || generation !== connectionGeneration) {
      return;
    }
    if (!initialCompleted) {
      failSession(error);
      return;
    }
    void reconnectRuntimePatchSession(error);
  };

  const registerRuntimeFetchHandler = (generation: number): void => {
    const attachedCdp = cdp;
    attachedCdp.onEventError((error) => {
      handleConnectionFailure(generation, error);
    });
    attachedCdp.on("Fetch.requestPaused", (params: unknown) => {
      const task = handleFetchRequestPaused(
        attachedCdp,
        patcherSource,
        params as FetchRequestPausedParams,
      ).then((labels) => {
        let sawNewLabel = false;
        for (const label of labels) {
          if (!observedLabels.has(label)) {
            sawNewLabel = true;
          }
          observedLabels.add(label);
        }
        if (!initialCompleted && labels.length > 0) {
          markInitialObserved();
        }
        if (initialCompleted && sawNewLabel) {
          debugRuntime(
            `patched labels now active: ${[...observedLabels].join(", ")}`,
          );
        }
      });
      pausedRequestHandlers.add(task);
      task.then(
        () => pausedRequestHandlers.delete(task),
        () => pausedRequestHandlers.delete(task),
      );
      return task;
    });
  };

  const startHeartbeat = (): void => {
    heartbeatTimer = setInterval(() => {
      if (closed || reconnecting) {
        return;
      }
      if (cdp.isClosed()) {
        void reconnectRuntimePatchSession(
          new Error("CDP WebSocket connection closed."),
        );
        return;
      }
      void cdpCommandWithTimeout(
        cdp.send("Page.getFrameTree"),
        runtimePatchHeartbeatTimeoutMs,
        "Timed out waiting for CDP heartbeat.",
      ).catch((error: unknown) => {
        void reconnectRuntimePatchSession(asError(error));
      });
    }, runtimePatchHeartbeatIntervalMs);
  };

  try {
    const initialSession = new Promise<string[]>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let completed = false;
      let finishStarted = false;

      const clearSessionTimers = (): void => {
        if (settleTimer) {
          clearTimeout(settleTimer);
          settleTimer = null;
        }
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      };

      const fail = (error: Error): void => {
        if (completed) {
          return;
        }
        completed = true;
        clearSessionTimers();
        reject(error);
      };
      failSession = fail;

      const finish = (): void => {
        if (completed || finishStarted) {
          return;
        }
        finishStarted = true;
        clearSessionTimers();
        void (async () => {
          try {
            while (pausedRequestHandlers.size > 0) {
              await Promise.all([...pausedRequestHandlers]);
            }
          } catch (error) {
            fail(asError(error));
            return;
          }
          if (completed) {
            return;
          }
          if (observedLabels.size === 0) {
            fail(
              new Error(
                "Runtime patch interception completed without required targets.",
              ),
            );
            return;
          }
          completed = true;
          initialCompleted = true;
          resolve([...observedLabels]);
        })();
      };

      const markObserved = (): void => {
        if (completed || settleTimer) {
          return;
        }
        settleTimer = setTimeout(finish, runtimePatchSettleMs);
      };
      markInitialObserved = markObserved;

      timeout = setTimeout(finish, runtimePatchSessionTimeoutMs);
    });
    void initialSession.catch(() => undefined);
    registerRuntimeFetchHandler(connectionGeneration);

    try {
      await enableRuntimePatchInterception(cdp, {
        waitForInitialLoad: true,
        reload: true,
      });
    } catch (error) {
      failSession(asError(error));
    }

    const patchedLabels = await initialSession;
    keepSessionOpen = true;
    startHeartbeat();
    return {
      patchedLabels,
      close: () => {
        closed = true;
        stopHeartbeat();
        cdp.close();
      },
      lost,
    };
  } finally {
    if (!keepSessionOpen) {
      closed = true;
      stopHeartbeat();
      cdp.close();
    }
  }
}

function waitForRuntimePatchSession(
  debugPort: number,
  patcherSource: string,
): Promise<RuntimePatchSessionHandle> {
  return startRuntimePatchSession(debugPort, patcherSource);
}

function waitForRuntimeLaunchProcessExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (exitCode: number): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(exitCode);
    };

    child.once("error", () => finish(1));
    child.once("exit", (code) => finish(code ?? 0));
  });
}

export async function runRuntimeLaunch(
  options: RuntimeLaunchOptions,
): Promise<number> {
  const {
    context,
    patcherSource,
    printActionHeader,
    removeLegacyWatcherFiles,
    supportedAppVersionKeys,
  } = options;

  printActionHeader("launch");

  if (!context.metadata.supported) {
    printLine("Runtime launch is blocked for this Codex.app version.");
    printLine(`Supported versions: ${supportedAppVersionKeys}`);
    return printExitBlock(1).exitCode;
  }

  if (
    !removeLegacyWatcherFiles({ quietLaunchctl: true, reportRemoved: true })
  ) {
    printLine("Failed to remove legacy auto-repair watcher.");
    return printExitBlock(1).exitCode;
  }

  const runningCheck = checkCodexRunning();
  if (!runningCheck.ok) {
    printLine(runningCheck.message);
    return printExitBlock(1).exitCode;
  }

  if (runningCheck.running) {
    printLine(
      "Codex.app is already running. Quit Codex.app before using runtime launch.",
    );
    return printExitBlock(1).exitCode;
  }

  if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SUCCESS === "1") {
    printRuntimeLaunchReady(["Speed setting"]);
    if (process.env.CODEXFAST_TEST_RUNTIME_LAUNCH_SESSION_LOST === "1") {
      printRuntimePatchSessionLost(
        new Error(
          runtimePatchSessionLostMessage(
            new Error("simulated CDP heartbeat failure"),
          ),
        ),
      );
      return printExitBlock(0).exitCode;
    }
    return printExitCode(0).exitCode;
  }

  let child: ChildProcess | null = null;
  let session: RuntimePatchSessionHandle | null = null;
  try {
    const debugPort = randomDebugPort();
    child = launchCodexProcess(context, debugPort);
    const childExit = waitForRuntimeLaunchProcessExit(child);
    session = await waitForRuntimePatchSession(debugPort, patcherSource);
    printRuntimeLaunchReady(session.patchedLabels);
    const outcome = await Promise.race([
      childExit.then((exitCode) => ({ type: "child-exit" as const, exitCode })),
      session.lost.then((error) => ({ type: "session-lost" as const, error })),
    ]);
    if (outcome.type === "session-lost") {
      session.close();
      session = null;
      printRuntimePatchSessionLost(outcome.error);
      return printExitBlock(0).exitCode;
    }
    session.close();
    session = null;
    printExitCode(outcome.exitCode);
    return outcome.exitCode;
  } catch (error) {
    if (session) {
      session.close();
      session = null;
    }
    if (child && !child.killed) {
      terminateRuntimeLaunchProcess(child);
    }
    printLine(`Runtime launch failed: ${asError(error).message}`);
  }

  return printExitBlock(1).exitCode;
}
