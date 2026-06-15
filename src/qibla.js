// Initial great-circle bearing from a point to the Kaaba in Makkah.
const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

const DEG = Math.PI / 180;

const COMPASS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function qiblaBearing(latitude, longitude) {
  const phi1 = latitude * DEG;
  const phi2 = KAABA_LAT * DEG;
  const dLon = (KAABA_LON - longitude) * DEG;

  const y = Math.sin(dLon);
  const x =
    Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(dLon);
  let bearing = Math.atan2(y, x) / DEG;
  bearing = (bearing + 360) % 360;

  const compass = COMPASS[Math.round(bearing / 22.5) % 16];
  return { bearing: Math.round(bearing * 10) / 10, compass };
}
