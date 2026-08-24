export type AtcFacility = {
  name: string;
  frequency: string;
};

export type AtcStream = {
  id: string;
  title: string;
  mount: string;
  facilities: AtcFacility[];
};

export type Airport = {
  icao: string;
  iata: string;
  city: string;
  name: string;
  feeds: AtcStream[];
};

export const airports: Airport[] = [
  {
    icao: "SPJC",
    iata: "LIM",
    city: "Lima",
    name: "Jorge Chávez International Airport",
    feeds: [
      {
        id: "app",
        title: "Approach",
        mount: "spjc1_app",
        facilities: [{ name: "Lima Approach", frequency: "119.700" }],
      },
      {
        id: "twre",
        title: "Tower (East)",
        mount: "spjc1_twr_east",
        facilities: [
          { name: "Lima Tower (East 16L/34R)", frequency: "118.100" },
        ],
      },
      {
        id: "twrw",
        title: "Tower (West)",
        mount: "spjc1_twr_west",
        facilities: [
          { name: "Lima Tower (West 16R/34L)", frequency: "118.750" },
        ],
      },
      {
        id: "gnd",
        title: "Ground",
        mount: "spjc1_gnd",
        facilities: [{ name: "Lima Ground", frequency: "121.900" }],
      },
    ],
  },
  {
    icao: "SPQU",
    iata: "AQP",
    city: "Arequipa",
    name: "Rodríguez Ballón International Airport",
    feeds: [
      {
        id: "twr",
        title: "Tower / Guard",
        mount: "spqu2_twr",
        facilities: [
          { name: "Arequipa Tower", frequency: "118.700" },
          { name: "Arequipa Tower (Alt)", frequency: "118.200" },
          { name: "Emergency / Guard", frequency: "121.500" },
        ],
      },
      {
        id: "gnd",
        title: "Ground",
        mount: "spqu2_gnd",
        facilities: [
          { name: "Ala Aérea 3", frequency: "122.600" },
          { name: "Arequipa Ground", frequency: "121.900" },
        ],
      },
      {
        id: "misc",
        title: "Misc",
        mount: "spqu2_rdr",
        facilities: [
          { name: "Ilo", frequency: "126.900" },
          { name: "Iquique ACC", frequency: "128.700" },
          { name: "Radar Sur 2", frequency: "128.800" },
          { name: "Tacna", frequency: "118.400" },
        ],
      },
    ],
  },
  {
    icao: "SPZO",
    iata: "CUZ",
    city: "Cusco",
    name: "Alejandro Velasco Astete International Airport",
    feeds: [
      {
        id: "twr",
        title: "Tower",
        mount: "spzo1_twr",
        facilities: [{ name: "Cusco Tower", frequency: "118.100" }],
      },
      {
        id: "gnd",
        title: "Ground",
        mount: "spzo1_gnd",
        facilities: [{ name: "Cusco Ground", frequency: "121.900" }],
      },
      {
        id: "misc",
        title: "Misc",
        mount: "spzo1_rdr",
        facilities: [
          { name: "Cusco Approach", frequency: "120.600" },
          { name: "Emergency / Guard", frequency: "121.500" },
        ],
      },
    ],
  },
  {
    icao: "SPRU",
    iata: "TRU",
    city: "Trujillo",
    name: "Capitan FAP Carlos Martinez De Pinillos International Airport",
    feeds: [],
  },
];

export type AirportIcao = (typeof airports)[number]["icao"];

export const DEFAULT_ICAO: AirportIcao = "SPJC";

export const getAirport = (icao: string): Airport | undefined =>
  airports.find((airport) => airport.icao === icao);

export const streamUrl = (mount: string): string =>
  `https://d.liveatc.net/${mount}`;

export const liveAtcSearchUrl = (icao: string): string =>
  `https://www.liveatc.net/search/?icao=${icao}`;
