import type { Airport } from "../data/airports";
import { prefersDark } from "./dom";

const METAR_TARGET = "atcDash";
const METAR_HOST_ID = "metar-widget";

export const metarSiteUrl = (icao: string): string =>
  `https://metar-taf.com/${icao}`;

export const metarLivestreamUrl = (icao: string): string =>
  `https://metar-taf.com/livestream/${icao}?zoom=85`;

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

function setLink(
  id: string,
  href: string,
  text: string,
): void {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLAnchorElement)) return;
  el.href = href;
  el.textContent = text;
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
  link.className = "block h-67.5 w-75 text-lg font-medium text-black sm:w-125 md:w-92.5";
  link.textContent = `METAR ${airport.name}`;
  host.appendChild(link);

  injectMetarEmbed(airport.icao, METAR_TARGET, host);

  setLink(
    "metar-livestream",
    metarLivestreamUrl(airport.icao),
    `Livestream METAR for ${airport.iata} / ${airport.icao}`,
  );
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
