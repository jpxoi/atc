type IndicatorState = "idle" | "connecting" | "live" | "offline";

const STATE_LABEL: Record<IndicatorState, string> = {
  idle: "Idle",
  connecting: "Connecting",
  live: "Live",
  offline: "Offline",
};

function setIndicator(el: HTMLElement, state: IndicatorState): void {
  el.dataset.state = state;
  el.textContent = STATE_LABEL[state];
}

export function bindAtcPlayers(): void {
  const players = document.querySelectorAll<HTMLAudioElement>("[data-atc-audio]");

  for (const audio of players) {
    const indicator = audio
      .closest("[data-atc-feed]")
      ?.querySelector<HTMLElement>("[data-atc-indicator]");
    if (!indicator) continue;

    audio.addEventListener("play", () => setIndicator(indicator, "connecting"));
    audio.addEventListener("waiting", () => setIndicator(indicator, "connecting"));
    audio.addEventListener("stalled", () => setIndicator(indicator, "connecting"));
    audio.addEventListener("playing", () => setIndicator(indicator, "live"));
    audio.addEventListener("pause", () => {
      setIndicator(indicator, audio.error ? "offline" : "idle");
    });
    audio.addEventListener("error", () => setIndicator(indicator, "offline"));
  }
}
