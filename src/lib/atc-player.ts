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

let listening: HTMLAudioElement | null = null;

function setIndicator(el: HTMLElement, state: IndicatorState): void {
  el.dataset.state = state;
  const label = el.querySelector("[data-atc-indicator-label]");
  if (label) label.textContent = STATE_LABEL[state];
  else el.textContent = STATE_LABEL[state];
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

function setToggle(audio: HTMLAudioElement, active: boolean): void {
  const button = toggleFor(audio);
  if (!button) return;
  button.setAttribute("aria-pressed", String(active));
  button.setAttribute("aria-label", `${active ? "Stop" : "Play"} ${feedTitle(audio)}`);
}

function players(): HTMLAudioElement[] {
  return [...document.querySelectorAll<HTMLAudioElement>("[data-atc-audio]")];
}

function isArmed(audio: HTMLAudioElement): boolean {
  if (!audio.paused) return true;
  const state = indicatorFor(audio)?.dataset.state;
  return state === "connecting" || state === "live";
}

function isLive(audio: HTMLAudioElement): boolean {
  return indicatorFor(audio)?.dataset.state === "live";
}

function syncListenUi(): void {
  if (listening && !isArmed(listening)) listening = null;

  for (const audio of players()) {
    const live = isLive(audio);
    const audible = live && audio === listening;
    audio.muted = !audible;
    audio.volume = 1;

    const feed = feedRoot(audio);
    if (feed) {
      feed.dataset.listening = String(audible);
      feed.dataset.live = String(live);
    }

    const listen = listenFor(audio);
    if (!listen) continue;
    listen.hidden = !live;
    listen.disabled = !live;
    listen.setAttribute("aria-pressed", String(audible));
    listen.setAttribute(
      "aria-label",
      audible
        ? `Listening to ${feedTitle(audio)}`
        : `Listen to ${feedTitle(audio)}`,
    );
  }
}

function listenTo(audio: HTMLAudioElement): void {
  if (!isLive(audio)) return;
  listening = audio;
  syncListenUi();
}

function streamSrc(audio: HTMLAudioElement): string {
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
  const url = streamSrc(audio);
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
  const wasListening = listening === audio;
  stopping.add(audio);
  clearConnectTimer(audio);
  if (!audio.paused) audio.pause();
  resetSrc(audio);
  setIndicator(indicator, state);
  setToggle(audio, false);

  if (wasListening) {
    listening = players().find((player) => player !== audio && isArmed(player)) ?? null;
  }
  stopping.delete(audio);
  syncListenUi();
}

function startPlayer(audio: HTMLAudioElement, indicator: HTMLElement): void {
  const url = streamSrc(audio);
  const source = audio.querySelector("source");
  if (source && url && !source.getAttribute("src")) source.src = url;

  listening = audio;
  setIndicator(indicator, "connecting");
  setToggle(audio, true);
  armConnectTimer(audio, indicator);
  syncListenUi();

  void audio.play().catch(() => {
    stopPlayer(audio, indicator, "offline");
  });
}

export function stopAllAtcPlayers(): void {
  listening = null;
  const list = players();
  for (const audio of list) {
    const indicator = indicatorFor(audio);
    if (!indicator) continue;
    stopPlayer(audio, indicator, "idle");
  }
}

export function bindAtcPlayers(): void {
  for (const audio of players()) {
    audio.muted = true;
    audio.volume = 1;

    const indicator = indicatorFor(audio);
    const toggle = toggleFor(audio);
    const listen = listenFor(audio);
    if (!indicator || !toggle || !listen) continue;

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (audio.paused) startPlayer(audio, indicator);
      else stopPlayer(audio, indicator, "idle");
    });

    listen.addEventListener("click", (event) => {
      event.stopPropagation();
      listenTo(audio);
    });

    feedRoot(audio)?.addEventListener("click", () => {
      listenTo(audio);
    });

    audio.addEventListener("play", () => {
      if (indicator.dataset.state === "live") return;
      setIndicator(indicator, "connecting");
      setToggle(audio, true);
      armConnectTimer(audio, indicator);
      syncListenUi();
    });
    audio.addEventListener("waiting", () => {
      if (indicator.dataset.state === "live") return;
      setIndicator(indicator, "connecting");
      armConnectTimer(audio, indicator);
    });
    audio.addEventListener("stalled", () => {
      if (indicator.dataset.state === "live") return;
      setIndicator(indicator, "connecting");
      armConnectTimer(audio, indicator);
    });
    audio.addEventListener("playing", () => {
      clearConnectTimer(audio);
      setIndicator(indicator, "live");
      setToggle(audio, true);
      if (!listening) listening = audio;
      syncListenUi();
    });
    audio.addEventListener("pause", () => {
      if (resetting.has(audio) || stopping.has(audio)) return;
      clearConnectTimer(audio);
      setToggle(audio, false);
      setIndicator(indicator, audio.error ? "offline" : "idle");
      if (listening === audio) {
        listening = players().find((player) => player !== audio && isArmed(player)) ?? null;
      }
      syncListenUi();
    });
    audio.addEventListener("error", () => {
      if (resetting.has(audio)) return;
      stopPlayer(audio, indicator, "offline");
    });
  }

  syncListenUi();
}
