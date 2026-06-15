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
