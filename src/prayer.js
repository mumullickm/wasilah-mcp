// On-device prayer-time astronomy, ported from the Wasilah app
// (lib/features/prayer_times/prayer_astronomy.dart) so this connector returns
// the same times the app shows rather than a third-party approximation.
//
// Julian date -> solar position (declination + equation of time) -> hour angle
// per twilight threshold. Reference: PrayTimes.org canonical algorithm
// (Hamid Zarrabi-Zadeh, public domain), cross-verified against Adhan.

const DEG = Math.PI / 180;
const sinDeg = (d) => Math.sin(d * DEG);
const cosDeg = (d) => Math.cos(d * DEG);
const tanDeg = (d) => Math.tan(d * DEG);
const asinDeg = (v) => Math.asin(v) / DEG;
const acosDeg = (v) => Math.acos(v) / DEG;
const atanDeg = (v) => Math.atan(v) / DEG;
const atan2Deg = (y, x) => Math.atan2(y, x) / DEG;

function normalizeDegrees(d) {
  const r = d % 360;
  return r < 0 ? r + 360 : r;
}

// Twilight depression angles and Isha intervals as published by each
// authority. Karachi is the app default. Mirrors CalculationMethod in
// lib/features/prayer_times/calculation_method.dart.
const METHOD_PARAMS = {
  karachi: { fajrAngle: 18.0, ishaAngle: 18.0 },
  isna: { fajrAngle: 15.0, ishaAngle: 15.0 },
  mwl: { fajrAngle: 18.0, ishaAngle: 17.0 },
  makkah: { fajrAngle: 18.5, ishaIntervalMinutes: 90 },
  egypt: { fajrAngle: 19.5, ishaAngle: 17.5 },
  tehran: { fajrAngle: 17.7, ishaAngle: 14.0 },
  gulf: { fajrAngle: 19.5, ishaIntervalMinutes: 90 },
  kuwait: { fajrAngle: 18.0, ishaAngle: 17.5 },
  qatar: { fajrAngle: 18.0, ishaIntervalMinutes: 90 },
  singapore: { fajrAngle: 20.0, ishaAngle: 18.0 },
  france: { fajrAngle: 12.0, ishaAngle: 12.0 },
  turkey: { fajrAngle: 18.0, ishaAngle: 17.0 },
  russia: { fajrAngle: 16.0, ishaAngle: 15.0 },
};

export const METHOD_LABELS = {
  karachi: 'Karachi',
  isna: 'ISNA',
  mwl: 'Muslim World League',
  makkah: 'Umm al-Qura',
  egypt: 'Egyptian General Authority',
  tehran: 'Tehran',
  gulf: 'Gulf Region',
  kuwait: 'Kuwait',
  qatar: 'Qatar',
  singapore: 'Singapore',
  france: 'France',
  turkey: 'Turkey (Diyanet)',
  russia: 'Russia',
};

// Shafii/Maliki/Hanbali use shadow factor 1, Hanafi uses 2. Karachi defaults to
// Hanafi for South Asia; every other method defaults to Shafii. Same resolution
// the app uses so the time and its label never disagree.
export function resolveAsr(method, override) {
  if (override === 'hanafi') return { shadowFactor: 2, label: 'Hanafi' };
  if (override === 'shafii') return { shadowFactor: 1, label: "Shafi'i" };
  return method === 'karachi'
    ? { shadowFactor: 2, label: 'Hanafi' }
    : { shadowFactor: 1, label: "Shafi'i" };
}

// Julian Date for a Gregorian date at 00:00 UTC (Meeus, ch. 7).
function julianDate(year, month, day) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5
  );
}

function solarPosition(jd) {
  const d = jd - 2451545.0;
  const g = normalizeDegrees(357.529 + 0.98560028 * d);
  const q = normalizeDegrees(280.459 + 0.98564736 * d);
  const l = normalizeDegrees(q + 1.915 * sinDeg(g) + 0.02 * sinDeg(2 * g));
  const e = 23.439 - 0.00000036 * d;
  const raHours = atan2Deg(cosDeg(e) * sinDeg(l), cosDeg(l)) / 15.0;
  const declination = asinDeg(sinDeg(e) * sinDeg(l));
  const equationOfTime = (q / 15.0 - raHours) * 60.0;
  return { declination, equationOfTime };
}

function hourAngle(angle, latitude, declination) {
  const cosH =
    (-sinDeg(angle) - sinDeg(latitude) * sinDeg(declination)) /
    (cosDeg(latitude) * cosDeg(declination));
  if (cosH > 1) return 0;
  if (cosH < -1) return 180;
  return acosDeg(cosH);
}

function asrHourAngle(latitude, declination, shadowFactor) {
  const asrAngle = atanDeg(
    1.0 / (shadowFactor + tanDeg(Math.abs(latitude - declination)))
  );
  return hourAngle(-asrAngle, latitude, declination);
}

// UTC offset in hours for an IANA zone on a given calendar day, DST-correct.
// Two passes anchor the lookup near local noon, matching the app's TZDateTime
// evaluation. Uses only Intl.formatToParts, which runs the same on Node and the
// Workers runtime, so no timezone dependency is bundled.
export function utcOffsetHours(timeZone, year, month, day) {
  if (!timeZone || timeZone === 'UTC') return 0;
  const offsetAt = (instant) => {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    const p = {};
    for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;
    const asUTC = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
      +p.second
    );
    return (asUTC - instant.getTime()) / 3600000;
  };
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12));
  const first = offsetAt(utcNoon);
  const localNoon = new Date(utcNoon.getTime() - first * 3600000);
  return offsetAt(localNoon);
}

function clockFromHours(hours) {
  if (!Number.isFinite(hours)) return null;
  let h = hours % 24;
  if (h < 0) h += 24;
  const totalMinutes = Math.round(h * 60);
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  return { hh, mm, minutesOfDay: hh * 60 + mm };
}

// Compute one day's prayer times. latitude north-positive, longitude
// east-positive. Returns an ordered list plus the raw minutes-of-day for
// scheduling. Times carry no zone metadata; they are the local wall clock.
export function computePrayerTimes({
  latitude,
  longitude,
  year,
  month,
  day,
  method = 'karachi',
  asr,
  timezone = 'UTC',
}) {
  const params = METHOD_PARAMS[method] || METHOD_PARAMS.karachi;
  const asrInfo = resolveAsr(method, asr);
  const tzOffsetHours = utcOffsetHours(timezone, year, month, day);

  const jd =
    julianDate(year, month, day) +
    (12.0 - longitude / 15.0) / 24.0 -
    tzOffsetHours / 24.0;

  const { declination: decl, equationOfTime: eqt } = solarPosition(jd);
  const dhuhrHours = 12.0 + tzOffsetHours - longitude / 15.0 - eqt / 60.0;
  const sunriseSunsetAngle = 0.833;

  const fajrHours = dhuhrHours - hourAngle(params.fajrAngle, latitude, decl) / 15.0;
  const sunriseHours =
    dhuhrHours - hourAngle(sunriseSunsetAngle, latitude, decl) / 15.0;
  const asrHours =
    dhuhrHours + asrHourAngle(latitude, decl, asrInfo.shadowFactor) / 15.0;
  const maghribHours =
    dhuhrHours + hourAngle(sunriseSunsetAngle, latitude, decl) / 15.0;

  let ishaHours;
  if (params.ishaIntervalMinutes != null) {
    ishaHours = maghribHours + params.ishaIntervalMinutes / 60.0;
  } else {
    ishaHours = dhuhrHours + hourAngle(params.ishaAngle, latitude, decl) / 15.0;
  }

  const entries = [
    { key: 'fajr', name: 'Fajr', arabic: 'الفجر', isPrayer: true, clock: clockFromHours(fajrHours) },
    { key: 'sunrise', name: 'Sunrise', arabic: 'الشروق', isPrayer: false, clock: clockFromHours(sunriseHours) },
    { key: 'dhuhr', name: 'Dhuhr', arabic: 'الظهر', isPrayer: true, clock: clockFromHours(dhuhrHours) },
    { key: 'asr', name: 'Asr', arabic: 'العصر', isPrayer: true, clock: clockFromHours(asrHours) },
    { key: 'maghrib', name: 'Maghrib', arabic: 'المغرب', isPrayer: true, clock: clockFromHours(maghribHours) },
    { key: 'isha', name: "Isha", arabic: 'العشاء', isPrayer: true, clock: clockFromHours(ishaHours) },
  ];

  return {
    entries,
    method,
    methodLabel: METHOD_LABELS[method] || METHOD_LABELS.karachi,
    asrLabel: asrInfo.label,
    tzOffsetHours,
  };
}

export function formatClock(clock) {
  if (!clock) return 'n/a (no twilight crossing at this latitude)';
  const { hh, mm } = clock;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const suffix = hh < 12 ? 'AM' : 'PM';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)} (${h12}:${pad(mm)} ${suffix})`;
}
