import { computePrayerTimes, formatClock, METHOD_LABELS } from './prayer.js';
import { qiblaBearing } from './qibla.js';
import { hijriDate } from './hijri.js';
import { geocodeCity } from './geocode.js';
import { quranAudio, RECITERS } from './quran.js';

const METHOD_KEYS = Object.keys(METHOD_LABELS);

const LOCATION_PROPS = {
  city: {
    type: 'string',
    description:
      'City name to resolve, e.g. "Dhaka" or "Madinah". Ignored when latitude and longitude are given.',
  },
  latitude: { type: 'number', description: 'Latitude in degrees, north positive.' },
  longitude: { type: 'number', description: 'Longitude in degrees, east positive.' },
  timezone: {
    type: 'string',
    description:
      'IANA timezone, e.g. "Asia/Dhaka". Used with explicit latitude/longitude. Defaults to UTC if omitted.',
  },
};

export const TOOLS = [
  {
    name: 'get_prayer_times',
    description:
      'Get the five daily prayer times plus sunrise for a city or coordinates, computed with the same engine as the Wasilah app. On Fridays, Dhuhr is marked as Jumu’ah.',
    inputSchema: {
      type: 'object',
      properties: {
        ...LOCATION_PROPS,
        date: {
          type: 'string',
          description: 'Date as YYYY-MM-DD. Defaults to today in the location’s timezone.',
        },
        method: {
          type: 'string',
          enum: METHOD_KEYS,
          description: 'Calculation method. Defaults to "karachi" (the app default).',
        },
        asr: {
          type: 'string',
          enum: ['auto', 'shafii', 'hanafi'],
          description:
            'Asr juristic method. "auto" follows the calculation method’s regional default.',
        },
      },
    },
  },
  {
    name: 'get_next_prayer',
    description:
      'Get the next upcoming prayer and how long until it begins, for a city or coordinates.',
    inputSchema: {
      type: 'object',
      properties: {
        ...LOCATION_PROPS,
        method: { type: 'string', enum: METHOD_KEYS },
        asr: { type: 'string', enum: ['auto', 'shafii', 'hanafi'] },
      },
    },
  },
  {
    name: 'get_qibla',
    description: 'Get the Qibla direction (compass bearing to the Kaaba) for a city or coordinates.',
    inputSchema: { type: 'object', properties: { ...LOCATION_PROPS } },
  },
  {
    name: 'get_hijri_date',
    description: 'Get the Islamic (Hijri) date for a given Gregorian date, or today.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Gregorian date as YYYY-MM-DD. Defaults to today (UTC).' },
      },
    },
  },
  {
    name: 'get_quran_audio',
    description:
      'Get a streaming audio URL for full-surah Quran recitation, plus the surah name and ayah count.',
    inputSchema: {
      type: 'object',
      properties: {
        surah: { type: 'integer', minimum: 1, maximum: 114, description: 'Surah number, 1 to 114.' },
        reciter: {
          type: 'string',
          enum: Object.keys(RECITERS),
          description: 'Reciter edition. Defaults to "ar.alafasy" (Mishary Rashid Alafasy).',
        },
      },
      required: ['surah'],
    },
  },
];

function localNow(timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone && timeZone !== 'UTC' ? timeZone : 'UTC',
    hourCycle: 'h23',
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
  const p = {};
  for (const part of dtf.formatToParts(new Date())) p[part.type] = part.value;
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +p.hour,
    minute: +p.minute,
    weekday: p.weekday,
    minutesOfDay: +p.hour * 60 + +p.minute,
  };
}

function weekdayFor(timeZone, year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' }).format(date);
}

function parseDate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str).trim());
  if (!m) throw new Error('Date must be in YYYY-MM-DD format.');
  return { year: +m[1], month: +m[2], day: +m[3] };
}

async function resolveLocation(args) {
  if (args.latitude != null && args.longitude != null) {
    return {
      name: args.label || 'the given coordinates',
      country: '',
      latitude: Number(args.latitude),
      longitude: Number(args.longitude),
      timezone: args.timezone || 'UTC',
    };
  }
  if (args.city) return geocodeCity(args.city);
  throw new Error('Provide a `city`, or `latitude` and `longitude` (with optional `timezone`).');
}

function placeLabel(loc) {
  const parts = [loc.name, loc.admin1, loc.country].filter(Boolean);
  return parts.join(', ');
}

function minutesToText(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

async function callPrayerTimes(args) {
  const loc = await resolveLocation(args);
  const date = args.date ? parseDate(args.date) : (() => {
    const now = localNow(loc.timezone);
    return { year: now.year, month: now.month, day: now.day };
  })();

  const result = computePrayerTimes({
    latitude: loc.latitude,
    longitude: loc.longitude,
    year: date.year,
    month: date.month,
    day: date.day,
    method: args.method || 'karachi',
    asr: args.asr === 'auto' ? undefined : args.asr,
    timezone: loc.timezone,
  });

  const isFriday = weekdayFor(loc.timezone, date.year, date.month, date.day) === 'Friday';
  const dateStr = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;

  const lines = result.entries.map((e) => {
    let label = e.name;
    if (e.key === 'dhuhr' && isFriday) label = "Jumu'ah (Dhuhr)";
    const tag = e.isPrayer ? '' : '  [not a prayer]';
    return `  ${label.padEnd(16)} ${formatClock(e.clock)}${tag}`;
  });

  const header = `Prayer times for ${placeLabel(loc) || loc.name} on ${dateStr}`;
  const meta = `Method: ${result.methodLabel} · Asr: ${result.asrLabel} · Timezone: ${loc.timezone} (UTC${result.tzOffsetHours >= 0 ? '+' : ''}${result.tzOffsetHours})`;
  const fridayNote = isFriday
    ? '\nFriday: the congregation prays Jumu’ah in place of Dhuhr.'
    : '';

  return `${header}\n${meta}\n\n${lines.join('\n')}${fridayNote}`;
}

async function callNextPrayer(args) {
  const loc = await resolveLocation(args);
  const now = localNow(loc.timezone);

  const today = computePrayerTimes({
    latitude: loc.latitude,
    longitude: loc.longitude,
    year: now.year,
    month: now.month,
    day: now.day,
    method: args.method || 'karachi',
    asr: args.asr === 'auto' ? undefined : args.asr,
    timezone: loc.timezone,
  });

  const prayers = today.entries.filter((e) => e.isPrayer && e.clock);
  let next = prayers.find((e) => e.clock.minutesOfDay > now.minutesOfDay);
  let until;

  if (next) {
    until = next.clock.minutesOfDay - now.minutesOfDay;
  } else {
    const tomorrow = new Date(Date.UTC(now.year, now.month - 1, now.day + 1));
    const t = computePrayerTimes({
      latitude: loc.latitude,
      longitude: loc.longitude,
      year: tomorrow.getUTCFullYear(),
      month: tomorrow.getUTCMonth() + 1,
      day: tomorrow.getUTCDate(),
      method: args.method || 'karachi',
      asr: args.asr === 'auto' ? undefined : args.asr,
      timezone: loc.timezone,
    });
    next = t.entries.find((e) => e.key === 'fajr');
    until = 1440 - now.minutesOfDay + next.clock.minutesOfDay;
  }

  return `Next prayer in ${placeLabel(loc) || loc.name}: ${next.name} at ${formatClock(next.clock)}, in ${minutesToText(until)} (method ${today.methodLabel}).`;
}

async function callQibla(args) {
  const loc = await resolveLocation(args);
  const { bearing, compass } = qiblaBearing(loc.latitude, loc.longitude);
  return `Qibla from ${placeLabel(loc) || loc.name} (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}): ${bearing}° from true north (${compass}). Face this bearing to pray toward the Kaaba in Makkah.`;
}

function callHijri(args) {
  const date = args.date
    ? parseDate(args.date)
    : (() => {
        const n = new Date();
        return { year: n.getUTCFullYear(), month: n.getUTCMonth() + 1, day: n.getUTCDate() };
      })();
  const h = hijriDate(date.year, date.month, date.day);
  const note = h.source === 'tabular'
    ? ' (tabular calculation; a sighting-based date may differ by a day)'
    : ' (Umm al-Qura)';
  const g = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  return `${g} corresponds to ${h.formatted}${note}.`;
}

function callQuranAudio(args) {
  const r = quranAudio(args.surah, args.reciter);
  return `Surah ${r.surahNumber}: ${r.name} (${r.arabic}), ${r.ayahs} ayahs.\nReciter: ${r.reciter}\nAudio: ${r.audioUrl}`;
}

export async function callTool(name, args = {}) {
  switch (name) {
    case 'get_prayer_times':
      return callPrayerTimes(args);
    case 'get_next_prayer':
      return callNextPrayer(args);
    case 'get_qibla':
      return callQibla(args);
    case 'get_hijri_date':
      return callHijri(args);
    case 'get_quran_audio':
      return callQuranAudio(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
