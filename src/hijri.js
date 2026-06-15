// Hijri date. Prefers the Umm al-Qura calendar through Intl when the runtime's
// ICU supports it; falls back to the tabular (Kuwaiti) algorithm otherwise.
// The tabular result can differ from a moon-sighting announcement by a day.

const MONTHS = [
  'Muharram',
  'Safar',
  "Rabi' al-awwal",
  "Rabi' al-thani",
  'Jumada al-awwal',
  'Jumada al-thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
];

function gregToJD(year, month, day) {
  let y = year;
  let m = month;
  if (m < 3) {
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
    1524
  );
}

function tabularHijri(year, month, day) {
  const jd = gregToJD(year, month, day);
  const l0 = jd - 1948440 + 10632;
  const n = Math.floor((l0 - 1) / 10631);
  let l = l0 - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const monthIndex = Math.floor((24 * l) / 709);
  const dayOut = l - Math.floor((709 * monthIndex) / 24);
  const yearOut = 30 * n + j - 30;
  return { year: yearOut, month: monthIndex, day: dayOut, source: 'tabular' };
}

export function hijriDate(year, month, day) {
  try {
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    const dtf = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const p = {};
    for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
    const hYear = parseInt(p.year, 10);
    const hMonth = parseInt(p.month, 10);
    const hDay = parseInt(p.day, 10);
    if (hYear > 1300 && hYear < 1600 && hMonth >= 1 && hMonth <= 12) {
      return {
        year: hYear,
        monthNumber: hMonth,
        monthName: MONTHS[hMonth - 1],
        day: hDay,
        formatted: `${hDay} ${MONTHS[hMonth - 1]} ${hYear} AH`,
        source: 'umm-al-qura',
      };
    }
  } catch (_) {
    // Runtime ICU lacks the Umm al-Qura calendar; use the tabular fallback.
  }
  const t = tabularHijri(year, month, day);
  return {
    year: t.year,
    monthNumber: t.month,
    monthName: MONTHS[t.month - 1],
    day: t.day,
    formatted: `${t.day} ${MONTHS[t.month - 1]} ${t.year} AH`,
    source: 'tabular',
  };
}
