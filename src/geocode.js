// Resolve a free-text city name to coordinates and an IANA timezone via the
// Open-Meteo geocoding API (no key required). Callers may skip this entirely by
// passing latitude, longitude, and timezone directly.
export async function geocodeCity(name) {
  const url =
    'https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' +
    encodeURIComponent(name);
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Geocoding lookup failed (HTTP ${res.status}).`);
  }
  const body = await res.json();
  const hit = body.results && body.results[0];
  if (!hit) {
    throw new Error(
      `No location found for "${name}". Try a more specific name, or pass latitude, longitude, and timezone.`
    );
  }
  return {
    name: hit.name,
    country: hit.country || '',
    admin1: hit.admin1 || '',
    latitude: hit.latitude,
    longitude: hit.longitude,
    timezone: hit.timezone || 'UTC',
  };
}
