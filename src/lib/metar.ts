import type { Airport } from "../data/airports";
import { prefersDark } from "./dom";

const METAR_TARGET = "atcDash";
const METAR_HOST_ID = "metar-widget";

export const metarSiteUrl = (icao: string): string =>
  `https://metar-taf.com/${icao}`;

function embedQuery(target: string): string {
  return prefersDark()
    ? `bg_color=1f2937&layout=landscape&qnh=hPa&rh=rh&target=${target}`
    : `layout=landscape&qnh=hPa&rh=rh&target=${target}`;
}

export function injectMetarEmbed(
  icao: string,
  target: string,
  parent: ParentNode,
): void {
  const script = document.createElement("script");
  script.async = true;
  script.defer = true;
  script.crossOrigin = "anonymous";
  script.src = `https://metar-taf.com/embed-js/${icao}?${embedQuery(target)}`;
  parent.appendChild(script);
}

export function loadMetarWidget(airport: Airport): void {
  const host = document.getElementById(METAR_HOST_ID);
  if (!host) return;

  document
    .querySelectorAll('iframe[src*="metar-taf.com"]')
    .forEach((frame) => frame.remove());
  host.replaceChildren();

  const link = document.createElement("a");
  link.href = metarSiteUrl(airport.icao);
  link.id = `metartaf-${METAR_TARGET}`;
  link.className = "block h-67.5 w-75 text-lg font-medium text-black sm:w-125 lg:w-full";
  link.textContent = `METAR ${airport.name}`;
  host.appendChild(link);

  injectMetarEmbed(airport.icao, METAR_TARGET, host);
}

export function initMetarEmbeds(): void {
  const host = document.getElementById(METAR_HOST_ID);
  if (host) {
    const link = host.querySelector<HTMLAnchorElement>('a[id^="metartaf-"]');
    const icao = link?.href.split("/").pop();
    const target = link?.id.replace(/^metartaf-/, "");
    if (icao && target) injectMetarEmbed(icao, target, host);
    return;
  }

  const anchors = [
    ...document.querySelectorAll<HTMLAnchorElement>('a[id^="metartaf-"]'),
  ].slice(0, 2);

  for (const anchor of anchors) {
    const target = anchor.id.replace(/^metartaf-/, "");
    const icao = anchor.href.split("/").pop();
    if (icao && target) injectMetarEmbed(icao, target, document.body);
  }
}
