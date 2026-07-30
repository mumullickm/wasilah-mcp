import { computePrayerTimes, formatClock, METHOD_LABELS } from './prayer.js';
import { qiblaBearing } from './qibla.js';
import { IFB_OFFSETS } from './ifb.js';
import { ASMA_UL_HUSNA } from './names.js';
import { hijriMonth, HIJRI_METHODS, HIJRI_MONTHS } from './hijri.js';
import { significanceFor } from './significance.js';
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
    annotations: { title: 'Prayer times', readOnlyHint: true, openWorldHint: true },
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
    annotations: { title: 'Next prayer', readOnlyHint: true, openWorldHint: true },
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
    annotations: { title: 'Qibla direction', readOnlyHint: true, openWorldHint: true },
    description: 'Get the Qibla direction (compass bearing to the Kaaba) for a city or coordinates.',
    inputSchema: { type: 'object', properties: { ...LOCATION_PROPS } },
  },
  {
    name: 'get_hijri_date',
    annotations: { title: 'Hijri date', readOnlyHint: true, openWorldHint: false },
    description: 'Get the Islamic (Hijri) date for a given Gregorian date, or today.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Gregorian date as YYYY-MM-DD. Defaults to today (UTC).' },
      },
    },
  },
  {
    name: 'get_ifb_district_offset',
    annotations: { title: 'IFB district offset (Bangladesh)', readOnlyHint: true, openWorldHint: false },
    description:
      'Get the Islamic Foundation Bangladesh published time offset from Dhaka for a Bangladeshi district, for sehri end and iftar. Omit the district to list all 64. These are IFB\'s own published values, not a computation.',
    inputSchema: {
      type: 'object',
      properties: {
        district: { type: 'string', description: 'District name in English or Bengali, e.g. Sylhet or সিলেট.' },
      },
    },
  },
  {
    name: 'get_hijri_calendar',
    annotations: { title: 'Hijri month calendar', readOnlyHint: true, openWorldHint: false },
    description:
      'Get a full Hijri month mapped to Gregorian dates, with the significant days that fall in it. Give a Hijri year and month, or a Gregorian date to get the month containing it. Dates are calendar positions, not sighting announcements.',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Hijri year, e.g. 1448.' },
        month: { type: 'integer', minimum: 1, maximum: 12, description: 'Hijri month number, 1 = Muharram.' },
        date: { type: 'string', description: 'Gregorian date YYYY-MM-DD; returns the Hijri month containing it. Defaults to today.' },
        method: { type: 'string', enum: HIJRI_METHODS, description: 'umm_al_qura (default, the Saudi civil calendar) or tabular (Kuwaiti arithmetic).' },
        language: { type: 'string', enum: ['en', 'bn'], description: 'Language for significant-day notes. Defaults to en.' },
      },
    },
  },
  {
    name: 'get_asma_ul_husna',
    annotations: { title: 'Names of Allah', readOnlyHint: true, openWorldHint: false },
    description:
      'Look up the 99 Names of Allah (Asma ul Husna). Returns Arabic, transliteration, English and Bengali. Give a number for one name, a search term to match by meaning or transliteration, or neither to get all 99.',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'integer', minimum: 1, maximum: 99, description: 'Name number, 1 to 99.' },
        search: { type: 'string', description: 'Match against transliteration, English meaning, Bengali or Arabic.' },
      },
    },
  },
  {
    name: 'get_quran_audio',
    annotations: { title: 'Quran audio', readOnlyHint: true, openWorldHint: false },
    description:
      'Get streaming audio for a surah, plus the surah name and ayah count. Most reciters return a single full-surah URL; the rest return per-ayah numbering to build a playlist from.',
    inputSchema: {
      type: 'object',
      properties: {
        surah: { type: 'integer', minimum: 1, maximum: 114, description: 'Surah number, 1 to 114.' },
        reciter: {
          type: 'string',
          enum: Object.keys(RECITERS),
          description:
            'Reciter edition. Defaults to "ar.alafasy" (Mishary Rashid Alafasy). Only ar.alafasy, ar.abdulbasitmurattal and ar.abdullahbasfar have single-file surah audio; the others are per-ayah.',
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
      tzAssumed: !args.timezone,
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
  const tzWarning = loc.tzAssumed ? TZ_WARNING : '';
  const fridayNote = isFriday
    ? '\nFriday: the congregation prays Jumu’ah in place of Dhuhr.'
    : '';

  return `${header}\n${meta}${tzWarning}\n\n${lines.join('\n')}${fridayNote}`;
}

const TZ_WARNING =
  '\n\nWARNING: no `timezone` was given with these coordinates, so times are UTC and are almost certainly wrong for this location. Pass an IANA zone such as Asia/Dhaka.';

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

  return `Next prayer in ${placeLabel(loc) || loc.name}: ${next.name} at ${formatClock(next.clock)}, in ${minutesToText(until)} (method ${today.methodLabel}).${loc.tzAssumed ? TZ_WARNING : ''}`;
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
  const lines = [
    `Surah ${r.surahNumber}: ${r.name} (${r.arabic}), ${r.ayahs} ayahs.`,
    `Reciter: ${r.reciter}`,
  ];
  if (r.audioUrl) {
    lines.push(`Audio (full surah): ${r.audioUrl}`);
  }
  if (r.ayahAudio) {
    const a = r.ayahAudio;
    lines.push(
      `Audio (per ayah): ${a.urlTemplate} for {ayah} = ${a.firstAyah} to ${a.lastAyah} (${a.count} files, in order).`
    );
  }
  if (!r.audioUrl && !r.ayahAudio) {
    lines.push('No audio is available for this reciter.');
  }
  return lines.join('\n');
}

function callIfbOffset(args) {
  const all = IFB_OFFSETS.districts;
  const head = `${IFB_OFFSETS.source}\n${IFB_OFFSETS.document}\nPublished for sehri end and iftar. Base: Dhaka = 0. Source document last updated ${IFB_OFFSETS.documentUpdated}.`;
  const caveat =
    '\nIFB adds margins on purpose: roughly 3 minutes to sehri end, and iftar is set after true sunset, so IFB times are more conservative than raw astronomy.' +
    '\nIFB\'s own footnote warns that in the northern districts the Asr offset may need to be LARGER than these values. Do not apply these to Asr in the north.' +
    '\nThis is a transcription, not an official IFB publication. Where they differ, IFB is correct.';

  if (!args.district) {
    const rows = all.map((d) => `  ${d.en.padEnd(18)} ${d.bn.padEnd(14)} ${d.division.padEnd(11)} sehri ${d.sehri >= 0 ? '+' : ''}${d.sehri}  iftar ${d.iftar >= 0 ? '+' : ''}${d.iftar}`);
    const un = IFB_OFFSETS.unresolved.map((d) => `  ${d.en.padEnd(18)} ${d.bn.padEnd(14)} ${d.division.padEnd(11)} NOT PUBLISHED by IFB${d.estimate != null ? ` (astronomical estimate ${d.estimate >= 0 ? '+' : ''}${d.estimate}, evidence only)` : ''}`);
    return `${head}\n\n${rows.join('\n')}\n${un.join('\n')}\n${caveat}`;
  }

  const q = String(args.district).trim().toLowerCase();
  const hit = all.find((d) => d.en.toLowerCase() === q || d.bn === String(args.district).trim())
    || all.find((d) => d.en.toLowerCase().includes(q));
  if (hit) {
    const mins = (n) => `${n >= 0 ? '+' : ''}${n} minute${Math.abs(n) === 1 ? '' : 's'}`;
    return `${hit.en} (${hit.bn}), ${hit.division} division\n  sehri end: ${mins(hit.sehri)} from Dhaka\n  iftar:     ${mins(hit.iftar)} from Dhaka\n\n${head}${caveat}`;
  }
  const miss = IFB_OFFSETS.unresolved.find((d) => d.en.toLowerCase() === q || d.bn === String(args.district).trim());
  if (miss) {
    return `${miss.en} (${miss.bn}), ${miss.division} division\n  NOT PUBLISHED in the IFB offset table.\n` +
      (miss.estimate != null ? `  An astronomical computation gives ${miss.estimate >= 0 ? '+' : ''}${miss.estimate} minutes, consistent with its neighbours. Evidence only, not IFB's value.\n` : '') +
      `\n${head}${caveat}`;
  }
  throw new Error(`No Bangladeshi district matched "${args.district}". Call this tool with no argument to list all 64.`);
}

function callHijriCalendar(args) {
  const method = args.method || 'umm_al_qura';
  if (!HIJRI_METHODS.includes(method)) throw new Error(`\`method\` must be one of: ${HIJRI_METHODS.join(', ')}.`);
  const bn = args.language === 'bn';

  let hy = args.year;
  let hm = args.month;
  if (hy == null || hm == null) {
    const n = new Date();
    const g = args.date ? parseDate(args.date) : { year: n.getUTCFullYear(), month: n.getUTCMonth() + 1, day: n.getUTCDate() };
    const h = hijriDate(g.year, g.month, g.day, method);
    hy = hy ?? h.year;
    hm = hm ?? h.monthNumber;
  }
  if (!Number.isInteger(hy) || !Number.isInteger(hm) || hm < 1 || hm > 12)
    throw new Error('Provide a Hijri `year` and a `month` between 1 and 12, or a Gregorian `date`.');

  const m = hijriMonth(hy, hm, method);
  if (!m.days.length) throw new Error(`Could not build ${HIJRI_MONTHS[hm - 1]} ${hy} AH. Check the year.`);

  const iso = (g) => `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
  const first = m.days[0], last = m.days[m.days.length - 1];
  const lines = [
    `${m.monthName} ${hy} AH (${m.length} days), ${method === 'tabular' ? 'Kuwaiti tabular' : 'Umm al-Qura'} calendar`,
    `${iso(first.gregorian)} to ${iso(last.gregorian)}`,
    '',
  ];

  const marked = [];
  for (const d of m.days) {
    const sig = significanceFor(hm, d.hijriDay);
    if (sig && !marked.some((x) => x.key === sig.key)) marked.push({ ...sig, day: d.hijriDay, gregorian: d.gregorian });
  }
  if (marked.length) {
    lines.push('Significant days EXPECTED this month:');
    for (const sig of marked) {
      lines.push(`  ${sig.day} ${m.monthName} = ${iso(sig.gregorian)}  ${bn ? sig.titleBn : sig.title} (${sig.arabic})`);
      lines.push(`    ${bn ? sig.noteBn : sig.note}`);
    }
    lines.push('');
    lines.push(
      bn
        ? 'দ্রষ্টব্য: এগুলো ক্যালেন্ডার অনুযায়ী প্রত্যাশিত তারিখ, ঘোষণা নয়। স্থানীয় চাঁদ দেখা এক দিন আগ-পিছ করতে পারে। রোজা, ঈদ বা কোরবানির চূড়ান্ত তারিখের জন্য আপনার দেশের চাঁদ দেখা কমিটির ঘোষণা অনুসরণ করুন।'
        : 'NOTE: these are the dates the calendar expects, not announcements. Local moon sighting commonly shifts them by a day. For Ramadan, Eid or Hajj, follow your local moon-sighting authority, which decides.'
    );
    lines.push('');
  }

  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  lines.push('Hijri  Gregorian    Day');
  for (const d of m.days) {
    const sig = significanceFor(hm, d.hijriDay);
    lines.push(`${String(d.hijriDay).padStart(5)}  ${iso(d.gregorian)}   ${WD[d.weekday]}${sig ? '   * ' + (bn ? sig.titleBn : sig.title) : ''}`);
  }
  return lines.join('\n');
}

function renderName(x) {
  return `${x.n}. ${x.ar}  ${x.tr}\n   English: ${x.en}\n   Bengali: ${x.bn}`;
}

function callAsmaUlHusna(args) {
  if (args.number != null) {
    const n = Number(args.number);
    if (!Number.isInteger(n) || n < 1 || n > 99) throw new Error('`number` must be an integer between 1 and 99.');
    return renderName(ASMA_UL_HUSNA[n - 1]);
  }
  if (args.search) {
    const q = String(args.search).trim().toLowerCase();
    const hits = ASMA_UL_HUSNA.filter((x) =>
      x.tr.toLowerCase().includes(q) || x.en.toLowerCase().includes(q) || x.bn.includes(args.search.trim()) || x.ar.includes(args.search.trim()));
    if (!hits.length) throw new Error(`No name matched "${args.search}". Try an English meaning such as "merciful", or a transliteration such as "Rahman".`);
    return `${hits.length} name${hits.length > 1 ? 's' : ''} matching "${args.search}":\n\n` + hits.map(renderName).join('\n\n');
  }
  return 'The 99 Names of Allah (Asma ul Husna):\n\n' + ASMA_UL_HUSNA.map(renderName).join('\n\n');
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
    case 'get_ifb_district_offset':
      return callIfbOffset(args);
    case 'get_hijri_calendar':
      return callHijriCalendar(args);
    case 'get_asma_ul_husna':
      return callAsmaUlHusna(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
