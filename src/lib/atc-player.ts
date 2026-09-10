type PlayerPhase =
  "idle" | "connecting" | "live" | "buffering" | "reconnecting" | "offline";

type PlayerRuntime = {
  desired: boolean;
  phase: PlayerPhase;
  attempt: number;
  retryCount: number;
  connectTimer?: number;
  stallTimer?: number;
  retryTimer?: number;
  stableTimer?: number;
  stallPosition?: number;
};

const STATE_LABEL: Record<PlayerPhase, string> = {
  idle: "Idle",
  connecting: "Connecting",
  live: "Live",
  buffering: "Buffering",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

const CONNECT_TIMEOUT_MS = 20_000;
const STALL_TIMEOUT_MS = 10_000;
const STABLE_PLAYBACK_MS = 15_000;
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000];

const runtimes = new WeakMap<HTMLAudioElement, PlayerRuntime>();
const boundPlayers = new WeakSet<HTMLAudioElement>();

let listening: HTMLAudioElement | null = null;
let networkEventsBound = false;

function runtimeFor(audio: HTMLAudioElement): PlayerRuntime {
  const current = runtimes.get(audio);
  if (current) return current;

  const runtime: PlayerRuntime = {
    desired: false,
    phase: "idle",
    attempt: 0,
    retryCount: 0,
  };
  runtimes.set(audio, runtime);
  return runtime;
}

function feedRoot(audio: HTMLAudioElement): HTMLElement | null {
  return audio.closest("[data-atc-feed]");
}

function indicatorFor(audio: HTMLAudioElement): HTMLElement | null {
  return feedRoot(audio)?.querySelector("[data-atc-indicator]") ?? null;
}

function toggleFor(audio: HTMLAudioElement): HTMLButtonElement | null {
  const button = feedRoot(audio)?.querySelector("[data-atc-toggle]");
  return button instanceof HTMLButtonElement ? button : null;
}

function listenFor(audio: HTMLAudioElement): HTMLButtonElement | null {
  const button = feedRoot(audio)?.querySelector("[data-atc-listen]");
  return button instanceof HTMLButtonElement ? button : null;
}

function feedTitle(audio: HTMLAudioElement): string {
  return feedRoot(audio)?.querySelector("h3")?.textContent?.trim() ?? "feed";
}

function players(): HTMLAudioElement[] {
  return [...document.querySelectorAll<HTMLAudioElement>("[data-atc-audio]")];
}

function streamSrc(audio: HTMLAudioElement): string {
  return audio.dataset.src ?? "";
}

function setIndicator(audio: HTMLAudioElement, phase: PlayerPhase): void {
  const indicator = indicatorFor(audio);
  if (!indicator) return;

  indicator.dataset.state = phase;
  const label = indicator.querySelector("[data-atc-indicator-label]");
  if (label) label.textContent = STATE_LABEL[phase];
  else indicator.textContent = STATE_LABEL[phase];
}

function setPhase(audio: HTMLAudioElement, phase: PlayerPhase): void {
  runtimeFor(audio).phase = phase;
  setIndicator(audio, phase);
}

function setToggle(audio: HTMLAudioElement, active: boolean): void {
  const button = toggleFor(audio);
  if (!button) return;

  button.setAttribute("aria-pressed", String(active));
  button.setAttribute(
    "aria-label",
    `${active ? "Stop" : "Play"} ${feedTitle(audio)}`,
  );
}

function isSelectable(audio: HTMLAudioElement): boolean {
  const runtime = runtimeFor(audio);
  return (
    runtime.desired &&
    (runtime.phase === "live" || runtime.phase === "buffering")
  );
}

function syncListenUi(): void {
  if (listening && !runtimeFor(listening).desired) listening = null;

  for (const audio of players()) {
    const runtime = runtimeFor(audio);
    const selected = runtime.desired && audio === listening;
    const selectable = isSelectable(audio);

    audio.muted = !selected;
    audio.volume = 1;

    const feed = feedRoot(audio);
    if (feed) {
      feed.dataset.listening = String(selected);
      feed.dataset.live = String(runtime.phase === "live");
    }

    const listen = listenFor(audio);
    if (!listen) continue;
    listen.hidden = !selectable;
    listen.disabled = !selectable;
    listen.setAttribute("aria-pressed", String(selected));
    listen.setAttribute(
      "aria-label",
      selected
        ? `Listening to ${feedTitle(audio)}`
        : `Listen to ${feedTitle(audio)}`,
    );
  }
}

function listenTo(audio: HTMLAudioElement): void {
  if (!isSelectable(audio)) return;
  listening = audio;
  syncListenUi();
}

function clearTimer(
  runtime: PlayerRuntime,
  key: "connectTimer" | "stallTimer" | "retryTimer" | "stableTimer",
): void {
  const timer = runtime[key];
  if (timer === undefined) return;
  window.clearTimeout(timer);
  delete runtime[key];
}

function clearAllTimers(runtime: PlayerRuntime): void {
  clearTimer(runtime, "connectTimer");
  clearTimer(runtime, "stallTimer");
  clearTimer(runtime, "retryTimer");
  clearTimer(runtime, "stableTimer");
  delete runtime.stallPosition;
}

function unloadPlayer(audio: HTMLAudioElement): void {
  if (!audio.paused) audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

function loadFreshStream(audio: HTMLAudioElement): boolean {
  const url = streamSrc(audio);
  if (!url) return false;

  unloadPlayer(audio);
  audio.src = url;
  audio.load();
  return true;
}

function selectFallback(excluding: HTMLAudioElement): void {
  if (listening !== excluding) return;
  listening =
    players().find(
      (audio) => audio !== excluding && runtimeFor(audio).desired,
    ) ?? null;
}

function deactivatePlayer(
  audio: HTMLAudioElement,
  phase: "idle" | "offline",
): void {
  const runtime = runtimeFor(audio);
  runtime.desired = false;
  runtime.attempt += 1;
  runtime.retryCount = 0;
  clearAllTimers(runtime);
  unloadPlayer(audio);
  setPhase(audio, phase);
  setToggle(audio, false);
  selectFallback(audio);
  syncListenUi();
}

function retryDelay(retryCount: number): number {
  const index = Math.min(
    Math.max(retryCount - 1, 0),
    RETRY_DELAYS_MS.length - 1,
  );
  return RETRY_DELAYS_MS[index];
}

function armConnectTimeout(audio: HTMLAudioElement, attempt: number): void {
  const runtime = runtimeFor(audio);
  clearTimer(runtime, "connectTimer");
  runtime.connectTimer = window.setTimeout(() => {
    delete runtime.connectTimer;
    if (!runtime.desired || runtime.attempt !== attempt) return;
    scheduleReconnect(audio);
  }, CONNECT_TIMEOUT_MS);
}

function armStallTimeout(audio: HTMLAudioElement): void {
  const runtime = runtimeFor(audio);
  if (runtime.stallTimer !== undefined) return;

  const attempt = runtime.attempt;
  runtime.stallPosition = audio.currentTime;
  runtime.stallTimer = window.setTimeout(() => {
    delete runtime.stallTimer;
    if (!runtime.desired || runtime.attempt !== attempt) return;
    if (
      !audio.paused &&
      runtime.stallPosition !== undefined &&
      audio.currentTime > runtime.stallPosition + 0.25
    ) {
      delete runtime.stallPosition;
      setPhase(audio, "live");
      armStablePlaybackTimer(audio);
      syncListenUi();
      return;
    }
    scheduleReconnect(audio);
  }, STALL_TIMEOUT_MS);
}

function armStablePlaybackTimer(audio: HTMLAudioElement): void {
  const runtime = runtimeFor(audio);
  clearTimer(runtime, "stableTimer");
  const attempt = runtime.attempt;
  runtime.stableTimer = window.setTimeout(() => {
    delete runtime.stableTimer;
    if (
      !runtime.desired ||
      runtime.attempt !== attempt ||
      runtime.phase !== "live"
    )
      return;
    runtime.retryCount = 0;
  }, STABLE_PLAYBACK_MS);
}

function handlePlayFailure(
  audio: HTMLAudioElement,
  attempt: number,
  error: unknown,
): void {
  const runtime = runtimeFor(audio);
  if (!runtime.desired || runtime.attempt !== attempt) return;

  if (error instanceof DOMException && error.name === "AbortError") return;
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    deactivatePlayer(audio, "offline");
    return;
  }

  scheduleReconnect(audio);
}

function connectPlayer(audio: HTMLAudioElement, reconnecting: boolean): void {
  const runtime = runtimeFor(audio);
  if (!runtime.desired) return;

  clearTimer(runtime, "retryTimer");
  clearTimer(runtime, "connectTimer");
  clearTimer(runtime, "stallTimer");
  clearTimer(runtime, "stableTimer");
  delete runtime.stallPosition;

  runtime.attempt += 1;
  const attempt = runtime.attempt;
  setPhase(audio, reconnecting ? "reconnecting" : "connecting");
  setToggle(audio, true);
  syncListenUi();

  if (!loadFreshStream(audio)) {
    deactivatePlayer(audio, "offline");
    return;
  }

  armConnectTimeout(audio, attempt);
  void audio.play().catch((error: unknown) => {
    handlePlayFailure(audio, attempt, error);
  });
}

function scheduleReconnect(audio: HTMLAudioElement): void {
  const runtime = runtimeFor(audio);
  if (!runtime.desired || runtime.retryTimer !== undefined) return;

  runtime.attempt += 1;
  clearTimer(runtime, "connectTimer");
  clearTimer(runtime, "stallTimer");
  clearTimer(runtime, "stableTimer");
  delete runtime.stallPosition;
  unloadPlayer(audio);

  if (!navigator.onLine) {
    setPhase(audio, "offline");
    setToggle(audio, true);
    syncListenUi();
    return;
  }

  runtime.retryCount += 1;
  setPhase(audio, "reconnecting");
  setToggle(audio, true);
  syncListenUi();

  runtime.retryTimer = window.setTimeout(() => {
    delete runtime.retryTimer;
    if (!runtime.desired) return;
    connectPlayer(audio, true);
  }, retryDelay(runtime.retryCount));
}

function startPlayer(audio: HTMLAudioElement): void {
  const runtime = runtimeFor(audio);
  runtime.desired = true;
  runtime.retryCount = 0;
  listening = audio;

  if (!navigator.onLine) {
    setPhase(audio, "offline");
    setToggle(audio, true);
    syncListenUi();
    return;
  }

  connectPlayer(audio, false);
}

function handleBuffering(audio: HTMLAudioElement): void {
  const runtime = runtimeFor(audio);
  if (!runtime.desired) return;

  if (runtime.phase === "live" || runtime.phase === "buffering") {
    setPhase(audio, "buffering");
    clearTimer(runtime, "stableTimer");
    armStallTimeout(audio);
    syncListenUi();
  }
}

function handlePlaybackProgress(audio: HTMLAudioElement): void {
  const runtime = runtimeFor(audio);
  if (
    runtime.phase !== "buffering" ||
    runtime.stallPosition === undefined ||
    audio.currentTime <= runtime.stallPosition + 0.25
  ) {
    return;
  }

  clearTimer(runtime, "stallTimer");
  delete runtime.stallPosition;
  setPhase(audio, "live");
  armStablePlaybackTimer(audio);
  syncListenUi();
}

function handleNetworkOffline(): void {
  for (const audio of players()) {
    const runtime = runtimeFor(audio);
    if (!runtime.desired) continue;

    runtime.attempt += 1;
    clearAllTimers(runtime);
    setPhase(audio, "offline");
    setToggle(audio, true);
    unloadPlayer(audio);
  }
  syncListenUi();
}

function handleNetworkOnline(): void {
  for (const audio of players()) {
    const runtime = runtimeFor(audio);
    if (!runtime.desired || runtime.retryTimer !== undefined) continue;
    connectPlayer(audio, true);
  }
}

function bindNetworkEvents(): void {
  if (networkEventsBound) return;
  networkEventsBound = true;
  window.addEventListener("offline", handleNetworkOffline);
  window.addEventListener("online", handleNetworkOnline);
}

export function stopAllAtcPlayers(): void {
  listening = null;
  for (const audio of players()) deactivatePlayer(audio, "idle");
}

export function bindAtcPlayers(): void {
  bindNetworkEvents();

  for (const audio of players()) {
    if (boundPlayers.has(audio)) continue;
    boundPlayers.add(audio);

    audio.muted = true;
    audio.volume = 1;

    const toggle = toggleFor(audio);
    const listen = listenFor(audio);
    if (!indicatorFor(audio) || !toggle || !listen) continue;

    runtimeFor(audio);

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (runtimeFor(audio).desired) deactivatePlayer(audio, "idle");
      else startPlayer(audio);
    });

    listen.addEventListener("click", (event) => {
      event.stopPropagation();
      listenTo(audio);
    });

    feedRoot(audio)?.addEventListener("click", () => {
      listenTo(audio);
    });

    audio.addEventListener("waiting", () => handleBuffering(audio));
    audio.addEventListener("stalled", () => handleBuffering(audio));
    audio.addEventListener("timeupdate", () => handlePlaybackProgress(audio));

    audio.addEventListener("playing", () => {
      const runtime = runtimeFor(audio);
      if (!runtime.desired) return;

      clearTimer(runtime, "connectTimer");
      clearTimer(runtime, "stallTimer");
      delete runtime.stallPosition;
      setPhase(audio, "live");
      setToggle(audio, true);
      if (!listening) listening = audio;
      armStablePlaybackTimer(audio);
      syncListenUi();
    });

    audio.addEventListener("pause", () => {
      const runtime = runtimeFor(audio);
      if (!runtime.desired) return;
      if (runtime.phase === "live" || runtime.phase === "buffering") {
        deactivatePlayer(audio, "idle");
      }
    });

    audio.addEventListener("ended", () => {
      if (runtimeFor(audio).desired) scheduleReconnect(audio);
    });

    audio.addEventListener("error", () => {
      const runtime = runtimeFor(audio);
      if (!runtime.desired) return;

      const errorCode = audio.error?.code;
      if (errorCode === MediaError.MEDIA_ERR_ABORTED) return;
      scheduleReconnect(audio);
    });
  }

  syncListenUi();
}
