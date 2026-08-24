import type { Airport } from "../data/airports";
import { bindAtcPlayers } from "./atc-player";
import { loadMetarWidget } from "./metar";

function setPressed(button: HTMLButtonElement, pressed: boolean): void {
  button.setAttribute("aria-pressed", String(pressed));
}

export function initDashboard(airports: readonly Airport[]): void {
  const selectors = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-airport-selector]"),
  ];
  const atcPanels = [
    ...document.querySelectorAll<HTMLElement>("[data-airport-atc]"),
  ];
  const atcEmpty = document.getElementById("atc-empty");

  bindAtcPlayers();

  const selectAirport = (icao: string): void => {
    for (const button of selectors) {
      setPressed(button, button.dataset.icao === icao);
    }

    const airport = airports.find((item) => item.icao === icao);
    if (airport) loadMetarWidget(airport);

    let hasAtc = false;
    for (const panel of atcPanels) {
      const active = panel.dataset.airportAtc === icao;
      panel.hidden = !active;
      if (active) hasAtc = true;
    }

    if (atcEmpty) atcEmpty.hidden = hasAtc;
  };

  for (const button of selectors) {
    button.addEventListener("click", () => {
      const icao = button.dataset.icao;
      if (icao) selectAirport(icao);
    });
  }
}
