// Dhikr phrases for the tasbeeh counter.
//
// The Arabic, transliteration and default counts are ported verbatim from the
// Wasilah app (lib/features/tasbeeh/tasbeeh_provider.dart, DhikrPreset.all).
// The app carries no meanings in any language, so the English and Bengali here
// are authored for the connector.
//
// Scope check: these are translations of six fixed phrases, not rulings. Each
// is the standard rendering used across mainstream Bengali and English Islamic
// publishing, and none of them turns on a juristic disagreement. Anything that
// would be a ruling (whether a count is obligatory, what invalidates it, the
// standing of a particular narration) is deliberately absent, and the
// after-salah note below defers rather than asserts.

export const TASBEEH = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ ٱللَّٰهِ',
    transliteration: 'SubhanAllah',
    en: 'Glory be to Allah',
    bn: 'আল্লাহ পবিত্র ও মহান',
    enNote: 'Declaring Allah free of every fault and every likeness.',
    bnNote: 'আল্লাহ সব ত্রুটি ও সাদৃশ্য থেকে মুক্ত, এই ঘোষণা।',
    defaultGoal: 33,
  },
  {
    id: 'alhamdulillah',
    arabic: 'ٱلْحَمْدُ لِلَّٰهِ',
    transliteration: 'Alhamdulillah',
    en: 'All praise is for Allah',
    bn: 'সমস্ত প্রশংসা আল্লাহর',
    enNote: 'Praise and thanks together, for what is given and what is withheld.',
    bnNote: 'প্রশংসা ও শোকর একসাথে, যা দেওয়া হয়েছে এবং যা দেওয়া হয়নি, দুইয়ের জন্যই।',
    defaultGoal: 33,
  },
  {
    id: 'allahuakbar',
    arabic: 'ٱللَّٰهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    en: 'Allah is the Greatest',
    bn: 'আল্লাহ সর্বশ্রেষ্ঠ',
    enNote: 'Greater than anything that could occupy the heart in this moment.',
    bnNote: 'এই মুহূর্তে মনকে যা কিছু দখল করে রাখতে পারে, তার সবকিছুর চেয়ে বড়।',
    defaultGoal: 34,
  },
  {
    id: 'lailaha',
    arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ',
    transliteration: 'La ilaha illa Allah',
    en: 'There is no god but Allah',
    bn: 'আল্লাহ ছাড়া কোনো উপাস্য নেই',
    enNote: 'The first half of the shahadah, and the phrase the whole religion rests on.',
    bnNote: 'কালিমার প্রথম অংশ, যার উপর গোটা দ্বীন দাঁড়িয়ে আছে।',
    defaultGoal: 100,
  },
  {
    id: 'astaghfirullah',
    arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ',
    transliteration: 'Astaghfirullah',
    en: 'I seek forgiveness from Allah',
    bn: 'আমি আল্লাহর কাছে ক্ষমা চাই',
    enNote: 'Asking to be forgiven, and asking to be covered.',
    bnNote: 'ক্ষমা চাওয়া, আর নিজের দোষ ঢেকে রাখার আবেদন।',
    defaultGoal: 100,
  },
  {
    id: 'salawat',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
    transliteration: 'Salawat',
    en: 'O Allah, send blessings upon Muhammad',
    bn: 'হে আল্লাহ, মুহাম্মদ (সা.)-এর উপর রহমত বর্ষণ করুন',
    enNote: 'Sent on the Prophet, peace be upon him.',
    bnNote: 'নবী (সা.)-এর উপর দরুদ।',
    defaultGoal: 100,
  },
];

// The 33/33/34 grouping is the well-known tasbeeh after salah. Stating that it
// is customary practice, and that a count is not a condition of the dhikr
// being accepted, keeps this descriptive. Whether any particular count is
// required is a ruling and is not answered here.
const AFTER_SALAH_EN =
  'The 33 / 33 / 34 grouping of SubhanAllah, Alhamdulillah and Allahu Akbar is the tasbeeh commonly recited after the obligatory prayers, totalling 100. The counts are the customary pattern, not a condition: dhikr said without counting is still dhikr. For which counts are recommended or required in your practice, ask a qualified scholar rather than a calculator.';

const AFTER_SALAH_BN =
  'নামাজের পরের তাসবিহে সুবহানাল্লাহ ৩৩, আলহামদুলিল্লাহ ৩৩ ও আল্লাহু আকবার ৩৪, মোট ১০০। এই সংখ্যাগুলো প্রচলিত নিয়ম, শর্ত নয়। গুনে না পড়লেও জিকির জিকিরই থাকে। কোন সংখ্যা মুস্তাহাব আর কোনটা জরুরি, সেটা কোনো ক্যালকুলেটরের কাছে নয়, যোগ্য আলেমের কাছে জিজ্ঞেস করুন।';

export function tasbeehLookup(query) {
  if (!query) return TASBEEH;
  const q = String(query).trim().toLowerCase();
  const hits = TASBEEH.filter(
    (t) =>
      t.id === q ||
      t.transliteration.toLowerCase().includes(q) ||
      t.en.toLowerCase().includes(q) ||
      t.bn.includes(String(query).trim()) ||
      t.arabic.includes(String(query).trim())
  );
  if (!hits.length) {
    throw new Error(
      `No dhikr matched "${query}". Available: ${TASBEEH.map((t) => t.transliteration).join(', ')}.`
    );
  }
  return hits;
}

export function renderTasbeeh(items, language = 'en') {
  const bn = language === 'bn';
  const lines = [];
  for (const t of items) {
    lines.push(`${t.transliteration}  ${t.arabic}`);
    lines.push(`   ${bn ? 'অর্থ' : 'Meaning'}: ${bn ? t.bn : t.en}`);
    lines.push(`   ${bn ? t.bnNote : t.enNote}`);
    lines.push(`   ${bn ? 'প্রচলিত সংখ্যা' : 'Customary count'}: ${t.defaultGoal}`);
    lines.push('');
  }
  lines.push(bn ? AFTER_SALAH_BN : AFTER_SALAH_EN);
  return lines.join('\n');
}
