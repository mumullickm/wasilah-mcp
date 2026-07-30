// Display translations for the widget and the API's labelled output.
// English, Bangla and Arabic. Bangla is here because Wasilah's largest audience
// is Bangladeshi; Arabic because the widget should be usable in the Gulf.
//
// Times are rendered 24-hour for bn and ar and 12-hour for en by default, which
// avoids inventing awkward AM/PM equivalents. `format=12|24` overrides either.

export const LANGS = ['en', 'bn', 'ar'];

const PRAYER_NAMES = {
  en: {
    fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr',
    maghrib: 'Maghrib', isha: 'Isha', jumuah: "Jumu'ah",
  },
  bn: {
    fajr: 'ফজর', sunrise: 'সূর্যোদয়', dhuhr: 'যোহর', asr: 'আসর',
    maghrib: 'মাগরিব', isha: 'এশা', jumuah: "জুমু'আ",
  },
  ar: {
    fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر',
    maghrib: 'المغرب', isha: 'العشاء', jumuah: 'الجمعة',
  },
};

const HIJRI_MONTHS = {
  en: [
    'Muharram', 'Safar', "Rabi' al-awwal", "Rabi' al-thani", 'Jumada al-awwal',
    'Jumada al-thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
  ],
  bn: [
    'মুহাররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি', 'জমাদিউল আউয়াল',
    'জমাদিউস সানি', 'রজব', 'শাবান', 'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ',
  ],
  ar: [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى',
    'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
  ],
};

// `hour`/`minute` are unit suffixes. English joins them tight ("3h 20m");
// Bangla and Arabic read as separate words, so each locale carries its own
// separator rather than assuming the English convention.
const STRINGS = {
  en: { ah: 'AH', poweredBy: 'Powered by Wasilah', hour: 'h', minute: 'm', unitGap: '', title: 'Prayer times' },
  bn: { ah: 'হিজরি', poweredBy: 'ওয়াসিলাহ থেকে', hour: 'ঘ', minute: 'মি', unitGap: ' ', title: 'নামাজের সময়' },
  ar: { ah: 'هـ', poweredBy: 'بدعم من وسيلة', hour: 'س', minute: 'د', unitGap: ' ', title: 'مواقيت الصلاة' },
};

// Exported so the widget can ship the same table to its client-side countdown
// instead of keeping a second copy in sync by hand.
export const DIGIT_SETS = {
  en: null,
  bn: ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'],
  ar: ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'],
};

const DIGITS = DIGIT_SETS;

export function normaliseLang(v) {
  const s = String(v || '').toLowerCase().slice(0, 2);
  return LANGS.includes(s) ? s : 'en';
}

export function isRtl(lang) {
  return lang === 'ar';
}

// Default clock: 12-hour reads naturally in English, 24-hour avoids fabricating
// AM/PM wording in Bangla and Arabic.
export function resolveHourFormat(lang, override) {
  if (override === '12' || override === '24') return override;
  return lang === 'en' ? '12' : '24';
}

export function digits(lang, value) {
  const set = DIGITS[lang];
  if (!set) return String(value);
  return String(value).replace(/[0-9]/g, (d) => set[+d]);
}

export function prayerName(lang, key, isJumuah = false) {
  const table = PRAYER_NAMES[lang] || PRAYER_NAMES.en;
  if (key === 'dhuhr' && isJumuah) return table.jumuah;
  return table[key] || key;
}

export function hijriMonth(lang, monthNumber) {
  const table = HIJRI_MONTHS[lang] || HIJRI_MONTHS.en;
  return table[monthNumber - 1] || '';
}

export function hijriLabel(lang, h) {
  const s = STRINGS[lang] || STRINGS.en;
  return `${digits(lang, h.day)} ${hijriMonth(lang, h.monthNumber)} ${digits(lang, h.year)} ${s.ah}`;
}

export function formatClock(lang, clock, hourFormat) {
  if (!clock) return '--:--';
  const pad = (n) => String(n).padStart(2, '0');
  if (hourFormat === '24') {
    return `${digits(lang, pad(clock.hh))}:${digits(lang, pad(clock.mm))}`;
  }
  const h12 = clock.hh % 12 === 0 ? 12 : clock.hh % 12;
  const suffix = clock.hh < 12 ? 'AM' : 'PM';
  return `${digits(lang, h12)}:${digits(lang, pad(clock.mm))} ${suffix}`;
}

export function strings(lang) {
  return STRINGS[lang] || STRINGS.en;
}

// Countdown phrasing differs by language word order, so each locale owns its
// own template rather than slotting words into an English sentence.
export function countdownTemplate(lang) {
  if (lang === 'bn') return '{time} পর {name}';
  if (lang === 'ar') return '{name} بعد {time}';
  return '{name} in {time}';
}
