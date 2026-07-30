// Free public JSON API over the same offline engine the MCP tools use, so any
// app, website, or bot can take Wasilah's prayer data over plain HTTPS. Read
// only, no key, no external calls.
import { computePrayerTimes, METHOD_LABELS } from './prayer.js';
import { qiblaBearing } from './qibla.js';
import { hijriDate } from './hijri.js';
import { quranAudio } from './quran.js';
import { geocodeCity } from './geocode.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300',
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

function hhmm(clock) {
  if (!clock) return null;
  return `${String(clock.hh).padStart(2, '0')}:${String(clock.mm).padStart(2, '0')}`;
}

function localToday(timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone && timeZone !== 'UTC' ? timeZone : 'UTC',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const p = {};
  for (const part of dtf.formatToParts(new Date())) p[part.type] = part.value;
  return { year: +p.year, month: +p.month, day: +p.day };
}

function localNowMinutes(timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone && timeZone !== 'UTC' ? timeZone : 'UTC',
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
  });
  const p = {};
  for (const part of dtf.formatToParts(new Date())) p[part.type] = part.value;
  return +p.hour * 60 + +p.minute;
}

function weekday(timeZone, y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' }).format(date);
}

async function resolveLocation(q) {
  const lat = q.get('latitude') ?? q.get('lat');
  const lon = q.get('longitude') ?? q.get('lon');
  if (lat != null && lon != null) {
    return {
      name: q.get('label') || 'the given coordinates',
      country: '',
      latitude: Number(lat),
      longitude: Number(lon),
      timezone: q.get('timezone') || q.get('tz') || 'UTC',
    };
  }
  const city = q.get('city');
  if (city) return geocodeCity(city);
  const err = new Error('Provide `city`, or `latitude` and `longitude` (with optional `timezone`).');
  err.status = 400;
  throw err;
}

function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) {
    const e = new Error('`date` must be YYYY-MM-DD.');
    e.status = 400;
    throw e;
  }
  return { year: +m[1], month: +m[2], day: +m[3] };
}

function prayerTimes(loc, q) {
  const date = q.get('date') ? parseDate(q.get('date')) : localToday(loc.timezone);
  const method = METHOD_LABELS[q.get('method')] ? q.get('method') : 'karachi';
  const asrParam = q.get('asr');
  const result = computePrayerTimes({
    latitude: loc.latitude,
    longitude: loc.longitude,
    year: date.year,
    month: date.month,
    day: date.day,
    method,
    asr: asrParam === 'auto' || !asrParam ? undefined : asrParam,
    timezone: loc.timezone,
  });
  const isFriday = weekday(loc.timezone, date.year, date.month, date.day) === 'Friday';
  const timings = {};
  for (const e of result.entries) timings[e.key] = hhmm(e.clock);
  return {
    date: `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
    method: result.methodLabel,
    asr: result.asrLabel,
    result,
    isFriday,
    timings,
  };
}

export async function handleApi(url, request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const q = url.searchParams;
  const path = url.pathname;

  try {
    if (path === '/api' || path === '/api/') {
      return json({
        service: 'Wasilah prayer API',
        docs: 'https://wasilah.site/build/',
        note: 'Free, read-only, no key. Offline engine, no external calls.',
        endpoints: [
          '/api/prayer-times?city=Dhaka[&method=karachi&asr=auto&date=YYYY-MM-DD]',
          '/api/next-prayer?city=Dhaka',
          '/api/qibla?city=London',
          '/api/hijri[?date=YYYY-MM-DD]',
          '/api/quran-audio?surah=36[&reciter=ar.alafasy]',
        ],
        methods: Object.keys(METHOD_LABELS),
      });
    }

    if (path === '/api/prayer-times') {
      const loc = await resolveLocation(q);
      const pt = prayerTimes(loc, q);
      return json({
        location: { name: loc.name, country: loc.country, latitude: loc.latitude, longitude: loc.longitude, timezone: loc.timezone },
        date: pt.date,
        method: pt.method,
        asr: pt.asr,
        jumuah: pt.isFriday,
        timings: pt.timings,
        source: 'Wasilah on-device prayer engine (PrayTimes.org algorithm)',
      });
    }

    if (path === '/api/next-prayer') {
      const loc = await resolveLocation(q);
      const now = localNowMinutes(loc.timezone);
      const today = prayerTimes(loc, q);
      const prayers = today.result.entries.filter((e) => e.isPrayer && e.clock);
      let next = prayers.find((e) => e.clock.minutesOfDay > now);
      let until;
      if (next) {
        until = next.clock.minutesOfDay - now;
      } else {
        const t = localToday(loc.timezone);
        const tomorrow = new Date(Date.UTC(t.year, t.month - 1, t.day + 1));
        const tp = computePrayerTimes({
          latitude: loc.latitude,
          longitude: loc.longitude,
          year: tomorrow.getUTCFullYear(),
          month: tomorrow.getUTCMonth() + 1,
          day: tomorrow.getUTCDate(),
          method: today.result.method,
          timezone: loc.timezone,
        });
        next = tp.entries.find((e) => e.key === 'fajr');
        until = 1440 - now + next.clock.minutesOfDay;
      }
      return json({
        location: { name: loc.name, country: loc.country, timezone: loc.timezone },
        next: next.name,
        time: hhmm(next.clock),
        minutesUntil: until,
        method: today.method,
      });
    }

    if (path === '/api/qibla') {
      const loc = await resolveLocation(q);
      const { bearing, compass } = qiblaBearing(loc.latitude, loc.longitude);
      return json({
        location: { name: loc.name, country: loc.country, latitude: loc.latitude, longitude: loc.longitude },
        bearing,
        compass,
        target: 'Kaaba, Makkah',
      });
    }

    if (path === '/api/hijri') {
      const date = q.get('date')
        ? parseDate(q.get('date'))
        : (() => {
            const n = new Date();
            return { year: n.getUTCFullYear(), month: n.getUTCMonth() + 1, day: n.getUTCDate() };
          })();
      const h = hijriDate(date.year, date.month, date.day);
      return json({
        gregorian: `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
        hijri: { year: h.year, month: h.monthNumber, monthName: h.monthName, day: h.day, formatted: h.formatted },
        calendar: h.source,
      });
    }

    if (path === '/api/quran-audio') {
      const r = quranAudio(q.get('surah'), q.get('reciter') || undefined);
      return json({
        surah: r.surahNumber,
        name: r.name,
        arabic: r.arabic,
        ayahs: r.ayahs,
        reciter: r.reciter,
        edition: r.edition,
        audioUrl: r.audioUrl,
      });
    }

    return json({ error: 'Unknown endpoint. See /api for the list.' }, 404);
  } catch (err) {
    return json({ error: err.message }, err.status || 400);
  }
}
