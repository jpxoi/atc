type IndicatorState = "offline" | "buffering" | "live" | "paused";

const STATE_CLASS: Record<IndicatorState, string> = {
  offline: "bg-gray-500 dark:bg-gray-700",
  buffering: "bg-yellow-500 dark:bg-yellow-700",
  live: "bg-red-500 dark:bg-red-700",
  paused: "bg-gray-500 dark:bg-gray-700",
};

const STATE_LABEL: Record<IndicatorState, string> = {
  offline: "Offline",
  buffering: "Buffering",
  live: "Live",
  paused: "Paused",
};

function setIndicator(el: HTMLElement, state: IndicatorState): void {
  el.classList.remove(...Object.values(STATE_CLASS).flatMap((value) => value.split(" ")));
  el.classList.add(...STATE_CLASS[state].split(" "));
  el.textContent = STATE_LABEL[state];
}

export function bindAtcPlayers(): void {
  const players = document.querySelectorAll<HTMLAudioElement>("[data-atc-audio]");

  for (const audio of players) {
    const indicator = audio
      .closest("[data-atc-feed]")
      ?.querySelector<HTMLElement>("[data-atc-indicator]");
    if (!indicator) continue;

    audio.addEventListener("play", () => setIndicator(indicator, "buffering"));
    audio.addEventListener("playing", () => setIndicator(indicator, "live"));
    audio.addEventListener("pause", () => setIndicator(indicator, "paused"));
    audio.addEventListener("error", () => setIndicator(indicator, "offline"));
  }
}
