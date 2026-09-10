import type { Airport } from "../data/airports";
import { bindAtcPlayers, stopAllAtcPlayers } from "./atc-player";
import { loadMetarWidget } from "./metar";

function setPressed(button: HTMLButtonElement, pressed: boolean): void {
  button.setAttribute("aria-pressed", String(pressed));
}

function airportMeta(airport: Airport): string {
  return `${airport.iata} / ${airport.icao} · ${airport.city}`;
}

function updateHeading(airport: Airport): void {
  const name = document.getElementById("airport-name");
  const meta = document.getElementById("airport-meta");
  if (name) name.textContent = airport.name;
  if (meta) meta.textContent = airportMeta(airport);
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

  const selected = selectors.find(
    (button) => button.getAttribute("aria-pressed") === "true",
  );
  let selectedIcao = selected?.dataset.icao;

  const selectAirport = (icao: string): void => {
    if (icao !== selectedIcao) {
      stopAllAtcPlayers();
      selectedIcao = icao;
    }

    for (const button of selectors) {
      setPressed(button, button.dataset.icao === icao);
    }

    const airport = airports.find((item) => item.icao === icao);
    if (airport) {
      updateHeading(airport);
      loadMetarWidget(airport);
    }

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
