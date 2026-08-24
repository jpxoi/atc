type IndicatorState = "idle" | "connecting" | "live" | "offline";

const STATE_LABEL: Record<IndicatorState, string> = {
  idle: "Idle",
  connecting: "Connecting",
  live: "Live",
  offline: "Offline",
};

const CONNECT_TIMEOUT_MS = 5 * 60 * 1000;

const connectTimers = new WeakMap<HTMLAudioElement, number>();
const resetting = new WeakSet<HTMLAudioElement>();
const stopping = new WeakSet<HTMLAudioElement>();

function setIndicator(el: HTMLElement, state: IndicatorState): void {
  el.dataset.state = state;
  el.textContent = STATE_LABEL[state];
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

function setToggle(audio: HTMLAudioElement, active: boolean): void {
  const button = toggleFor(audio);
  if (!button) return;
  button.setAttribute("aria-pressed", String(active));
  const title = feedRoot(audio)?.querySelector("h3")?.textContent?.trim() ?? "feed";
  button.setAttribute("aria-label", `${active ? "Stop" : "Play"} ${title}`);
}

function streamUrl(audio: HTMLAudioElement): string {
  return audio.dataset.src ?? "";
}

function clearConnectTimer(audio: HTMLAudioElement): void {
  const timer = connectTimers.get(audio);
  if (timer === undefined) return;
  window.clearTimeout(timer);
  connectTimers.delete(audio);
}

function armConnectTimer(audio: HTMLAudioElement, indicator: HTMLElement): void {
  if (connectTimers.has(audio)) return;
  const timer = window.setTimeout(() => {
    stopPlayer(audio, indicator, "offline");
  }, CONNECT_TIMEOUT_MS);
  connectTimers.set(audio, timer);
}

function resetSrc(audio: HTMLAudioElement): void {
  const url = streamUrl(audio);
  const source = audio.querySelector("source");

  resetting.add(audio);
  audio.removeAttribute("src");
  if (source) source.removeAttribute("src");
  audio.load();
  if (source && url) source.src = url;
  resetting.delete(audio);
}

function stopPlayer(
  audio: HTMLAudioElement,
  indicator: HTMLElement,
  state: "idle" | "offline",
): void {
  stopping.add(audio);
  clearConnectTimer(audio);
  if (!audio.paused) audio.pause();
  resetSrc(audio);
  setIndicator(indicator, state);
  setToggle(audio, false);
  stopping.delete(audio);
}

function startPlayer(audio: HTMLAudioElement, indicator: HTMLElement): void {
  const url = streamUrl(audio);
  const source = audio.querySelector("source");
  if (source && url && !source.getAttribute("src")) source.src = url;

  setIndicator(indicator, "connecting");
  setToggle(audio, true);
  armConnectTimer(audio, indicator);

  void audio.play().catch(() => {
    stopPlayer(audio, indicator, "offline");
  });
}

export function stopAllAtcPlayers(): void {
  const players = document.querySelectorAll<HTMLAudioElement>("[data-atc-audio]");
  for (const audio of players) {
    const indicator = indicatorFor(audio);
    if (!indicator) continue;
    stopPlayer(audio, indicator, "idle");
  }
}

export function bindAtcPlayers(): void {
  const players = document.querySelectorAll<HTMLAudioElement>("[data-atc-audio]");

  for (const audio of players) {
    const indicator = indicatorFor(audio);
    const toggle = toggleFor(audio);
    if (!indicator || !toggle) continue;

    toggle.addEventListener("click", () => {
      if (audio.paused) startPlayer(audio, indicator);
      else stopPlayer(audio, indicator, "idle");
    });

    audio.addEventListener("play", () => {
      setIndicator(indicator, "connecting");
      setToggle(audio, true);
      armConnectTimer(audio, indicator);
    });
    audio.addEventListener("waiting", () => {
      setIndicator(indicator, "connecting");
      armConnectTimer(audio, indicator);
    });
    audio.addEventListener("stalled", () => {
      setIndicator(indicator, "connecting");
      armConnectTimer(audio, indicator);
    });
    audio.addEventListener("playing", () => {
      clearConnectTimer(audio);
      setIndicator(indicator, "live");
      setToggle(audio, true);
    });
    audio.addEventListener("pause", () => {
      if (resetting.has(audio) || stopping.has(audio)) return;
      clearConnectTimer(audio);
      setToggle(audio, false);
      setIndicator(indicator, audio.error ? "offline" : "idle");
    });
    audio.addEventListener("error", () => {
      if (resetting.has(audio)) return;
      stopPlayer(audio, indicator, "offline");
    });
  }
}
