import { CITY_DB } from './cities.js';

// Resolve a city name to coordinates and an IANA timezone against a bundled
// offline database. The connector makes no outbound network calls. Callers may
// also pass latitude, longitude, and timezone directly to skip the lookup.

const { countries, tz, cities } = CITY_DB;

function fold(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

let foldedNames = null;
function buildIndex() {
  if (!foldedNames) foldedNames = cities.map((c) => fold(c[0]));
}

function record(i) {
  const [name, latitude, longitude, cIdx, tzIdx] = cities[i];
  return {
    name,
    country: countries[cIdx],
    admin1: '',
    latitude,
    longitude,
    timezone: tz[tzIdx],
  };
}

// Nearest bundled city to a coordinate pair, by great-circle distance.
//
// The app falls back to a hard-coded Bangladesh bounding box when the device
// reports UTC (lib/features/prayer_times/providers.dart `_ianaTimezoneFromCoords`).
// Here the same city database that answers `city` lookups is already in memory,
// so the connector can resolve a zone anywhere in the world instead, still with
// no outbound call. Returns the city plus the distance so a caller can judge
// how much to trust an inferred zone.
export function nearestCity(latitude, longitude) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const lat1 = toRad(latitude);
  const cosLat1 = Math.cos(lat1);
  let bestIdx = -1;
  let bestKm = Infinity;
  for (let i = 0; i < cities.length; i++) {
    const dLat = toRad(cities[i][1] - latitude);
    const dLon = toRad(cities[i][2] - longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      cosLat1 * Math.cos(toRad(cities[i][1])) * Math.sin(dLon / 2) ** 2;
    const km = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
    if (km < bestKm) {
      bestKm = km;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return null;
  return { ...record(bestIdx), distanceKm: Math.round(bestKm) };
}

// How far the nearest bundled city may be before an inferred zone stops being
// trustworthy. Zones are wide, so this is generous; beyond it we say so rather
// than assert a zone.
export const TZ_INFERENCE_LIMIT_KM = 500;

export function geocodeCity(query) {
  buildIndex();
  const q = fold(query);
  let cityPart = q;
  let countryPart = '';
  const comma = q.indexOf(',');
  if (comma !== -1) {
    cityPart = q.slice(0, comma).trim();
    countryPart = q.slice(comma + 1).trim();
  }

  // Exact name match, preferring one whose country also matches when given.
  let nameOnly = -1;
  for (let i = 0; i < cities.length; i++) {
    if (foldedNames[i] === cityPart) {
      if (!countryPart) return record(i);
      const cn = fold(countries[cities[i][3]]);
      if (cn.includes(countryPart) || countryPart.includes(cn)) return record(i);
      if (nameOnly === -1) nameOnly = i;
    }
  }
  if (nameOnly !== -1) return record(nameOnly);

  // Prefix, then substring.
  for (let i = 0; i < cities.length; i++) {
    if (foldedNames[i].startsWith(cityPart)) return record(i);
  }
  for (let i = 0; i < cities.length; i++) {
    if (foldedNames[i].includes(cityPart)) return record(i);
  }

  throw new Error(
    `No city found for "${query}". Try a larger nearby city, or pass latitude, longitude, and timezone directly.`
  );
}
