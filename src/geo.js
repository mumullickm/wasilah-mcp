// Visitor location for `city=auto`.
//
// Cloudflare attaches approximate geo to the incoming request (request.cf), so
// resolving "where is this visitor" costs no outbound call and keeps the
// zero-external-calls guarantee the directory compliance answer depends on.
// It is edge-derived and approximate: good enough to pick a city's prayer
// times, not a substitute for the device GPS the Wasilah app itself uses.

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Returns a location object, or null when the edge gave us nothing usable so
// the caller can fall back rather than render a silently wrong city.
export function locationFromRequest(request) {
  const cf = request && request.cf;
  if (!cf) return null;
  const latitude = num(cf.latitude);
  const longitude = num(cf.longitude);
  if (latitude === null || longitude === null) return null;
  return {
    name: cf.city || cf.region || 'Your location',
    country: cf.country || '',
    latitude,
    longitude,
    timezone: cf.timezone || 'UTC',
    approximate: true,
  };
}

export function isAuto(value) {
  return String(value || '').trim().toLowerCase() === 'auto';
}
