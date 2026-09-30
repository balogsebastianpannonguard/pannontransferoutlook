export interface Place {
  short: string;
  lat?: number;
  lon?: number;
}

interface KnownPlace extends Required<Place> {
  keys: string[];
}

const CITIES: KnownPlace[] = [
  { keys: ["budapest"], short: "Bp", lat: 47.4979, lon: 19.0402 },
  { keys: ["debrecen"], short: "Db", lat: 47.5316, lon: 21.6273 },
  { keys: ["tiszaujvaros", "tiszaujv"], short: "T.újv", lat: 47.9167, lon: 21.0833 },
  { keys: ["nyiregyhaza"], short: "Nyh", lat: 47.9554, lon: 21.7167 },
  { keys: ["miskolc"], short: "Msc", lat: 48.1035, lon: 20.7784 },
  { keys: ["szeged"], short: "Szeged", lat: 46.253, lon: 20.1414 },
  { keys: ["gyor"], short: "Győr", lat: 47.6875, lon: 17.6504 },
  { keys: ["pecs"], short: "Pécs", lat: 46.0727, lon: 18.2323 },
  { keys: ["eger"], short: "Eger", lat: 47.9025, lon: 20.3772 },
  { keys: ["kecskemet"], short: "Kecs", lat: 46.8964, lon: 19.6897 },
  { keys: ["szolnok"], short: "Szolnok", lat: 47.1743, lon: 20.1957 },
  { keys: ["szekesfehervar"], short: "Székesf", lat: 47.186, lon: 18.4221 },
  { keys: ["veszprem"], short: "Veszprém", lat: 47.0933, lon: 17.9115 },
  { keys: ["zalaegerszeg"], short: "Zeg", lat: 46.8417, lon: 16.8416 },
  { keys: ["szombathely"], short: "Szhely", lat: 47.2307, lon: 16.6218 },
  { keys: ["sopron"], short: "Sopron", lat: 47.6817, lon: 16.5845 },
  { keys: ["kaposvar"], short: "Kaposvár", lat: 46.3594, lon: 17.7968 },
  { keys: ["hajduszoboszlo"], short: "Hszo", lat: 47.4436, lon: 21.3959 },
  { keys: ["berettyoujfalu"], short: "Berettyó", lat: 47.2196, lon: 21.5405 },
  { keys: ["gyongyos"], short: "Gyöngyös", lat: 47.7817, lon: 19.9281 },
  { keys: ["mezokovesd"], short: "Mezőkövesd", lat: 47.8117, lon: 20.5714 },
  { keys: ["tokaj"], short: "Tokaj", lat: 48.1167, lon: 21.4167 },
  { keys: ["vac"], short: "Vác", lat: 47.7759, lon: 19.1352 },
  { keys: ["wien", "bécs", "becs", "vienna"], short: "Wien", lat: 48.2082, lon: 16.3738 },
  { keys: ["bratislava", "pozsony"], short: "Pozsony", lat: 48.1486, lon: 17.1077 },
  { keys: ["kosice", "kassa"], short: "Kassa", lat: 48.7164, lon: 21.2611 },
  { keys: ["oradea", "nagyvarad"], short: "Nagyvárad", lat: 47.0465, lon: 21.9189 },
];

const AIRPORTS = {
  bud: { short: "BUD", lat: 47.4369, lon: 19.2556 },
  deb: { short: "DEB", lat: 47.4889, lon: 21.6153 },
};

export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function fallbackShort(address: string): string {
  const head = address.split(",")[0].replace(/^\d{4}\s*/, "").trim();
  if (!head) return "?";
  if (head.length <= 10) return head;
  const word = head.split(/\s+/).find((w) => w.length >= 3) || head;
  return word.slice(0, 9);
}

export function resolvePlace(address: string): Place {
  const text = normalizeText(address || "");
  if (!text.trim()) return { short: "?" };

  if (/airport|repuloter|repter|liszt ferenc|ferihegy|\bbud\b|\bdeb\b/.test(text)) {
    if (/debrecen|\bdeb\b/.test(text)) return AIRPORTS.deb;
    if (/budapest|\bbud\b|ferihegy|liszt/.test(text)) return AIRPORTS.bud;
  }

  let best: KnownPlace | null = null;
  let bestIndex = Infinity;
  for (const city of CITIES) {
    for (const key of city.keys) {
      const idx = text.indexOf(normalizeText(key));
      if (idx === -1) continue;
      const boundary = idx === 0 || !/[a-z]/.test(text[idx - 1]);
      if (boundary && idx < bestIndex) {
        best = city;
        bestIndex = idx;
      }
    }
  }
  if (best) return best;
  return { short: fallbackShort(address) };
}

function haversineKm(a: Required<Place>, b: Required<Place>): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Rough door-to-door estimate (minutes) so events get a sensible length on the timeline. */
export function estimateTripMinutes(from: Place, to: Place): number {
  if (from.lat == null || from.lon == null || to.lat == null || to.lon == null) return 60;
  const km = haversineKm(from as Required<Place>, to as Required<Place>);
  const minutes = ((km * 1.25) / 95) * 60 + 10;
  return Math.max(30, Math.round(minutes / 5) * 5);
}
