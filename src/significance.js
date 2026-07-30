// Significant days in the Hijri calendar, ported verbatim from the Wasilah
// app's lib/core/data/hijri_significance.dart so the two cannot diverge.
//
// These are CIVIL-CALENDAR positions, not announcements. Local moon sighting
// moves them, commonly by a day, and Bangladesh routinely confirms later than
// Saudi Arabia. Never present any of these as a settled date: they are what
// the calendar expects, and the local authority decides.
export const SIGNIFICANCE = [
  { month: 1,  day: 10,          key: 'ashura',           title: 'Yawm Ashura',                arabic: 'يوم عاشوراء',       titleBn: 'আশুরা',
    note: 'The Prophet ﷺ encouraged fasting today, paired with the 9th or the 11th.',
    noteBn: 'নবী ﷺ আজ রোজা রাখতে উৎসাহ দিয়েছেন, সঙ্গে ৯ বা ১১ তারিখ মিলিয়ে।' },
  { month: 3,  day: 12,          key: 'mawlid',           title: 'Rabi al-Awwal 12',           arabic: 'ربيع الأول',        titleBn: '১২ রবিউল আউয়াল',
    note: 'A day many Muslims associate with the Prophet ﷺ. Send abundant salawat upon him.',
    noteBn: 'এই দিনটি অনেক মুসলিম নবী ﷺ এর সঙ্গে যুক্ত করেন। আজ তাঁর উপর বেশি করে দরুদ পড়ুন।' },
  { month: 7,  day: 27,          key: 'isra',             title: 'Laylat al-Isra wa al-Miraj', arabic: 'الإسراء والمعراج', titleBn: 'লাইলাতুল ইসরা ওয়াল মিরাজ',
    note: 'The night of the ascension. Reflect on Salah, the gift from that night.',
    noteBn: 'মিরাজের রাত। সেই রাতের উপহার, নামাজ নিয়ে ভাবুন।' },
  { month: 8,  day: 15,          key: 'baraah',           title: 'Laylat al-Baraah',           arabic: 'ليلة البراءة',      titleBn: 'লাইলাতুল বরাত',
    note: 'Many narrations describe Allah turning to His servants tonight. Make sincere dua.',
    noteBn: 'বহু বর্ণনায় এসেছে, আজ রাতে আল্লাহ তাঁর বান্দাদের দিকে ফিরে তাকান। আন্তরিকভাবে দোয়া করুন।' },
  { month: 9,  day: 1,           key: 'firstOfRamadan',   title: 'Ramadan Mubarak',            arabic: 'رمضان كريم',        titleBn: 'রমজান মোবারক',
    note: 'Renew niyyah for the month. The gates of Jannah are opened.',
    noteBn: 'পুরো মাসের নিয়ত নতুন করে নিন। জান্নাতের দরজা খুলে দেওয়া হয়েছে।' },
  { month: 9,  dayFrom: 21, dayTo: 29, key: 'lastTenOfRamadan', title: 'Last 10 Nights',      arabic: 'العشر الأواخر',     titleBn: 'শেষ দশ রাত',
    note: 'Seek Laylat al-Qadr in the odd nights. Increase Quran, dua, and qiyam.',
    noteBn: 'বেজোড় রাতগুলোতে লাইলাতুল কদর খুঁজুন। কুরআন, দোয়া আর কিয়াম বাড়িয়ে দিন।' },
  { month: 10, day: 1,           key: 'eidAlFitr',        title: 'Eid al-Fitr',                arabic: 'عيد الفطر',         titleBn: 'ঈদুল ফিতর',
    note: 'Pay Zakat al-Fitr before the Eid prayer if you have not already.',
    noteBn: 'ঈদের নামাজের আগে সদকাতুল ফিতর আদায় করে নিন, যদি এখনো না করে থাকেন।' },
  { month: 12, day: 9,           key: 'arafah',           title: 'Day of Arafah',              arabic: 'يوم عرفة',          titleBn: 'আরাফার দিন',
    note: 'The Prophet ﷺ said fasting today expiates the sins of two years. Non-pilgrims fast; pilgrims do not.',
    noteBn: 'নবী ﷺ বলেছেন, আজকের রোজা দুই বছরের গুনাহ মাফ করায়। হাজীরা এই রোজা রাখেন না, বাকিরা রাখেন।' },
  { month: 12, day: 10,          key: 'eidAlAdha',        title: 'Eid al-Adha',                arabic: 'عيد الأضحى',        titleBn: 'ঈদুল আজহা',
    note: 'Takbir, Eid prayer, and Qurbani for those it is due upon.',
    noteBn: 'তাকবির, ঈদের নামাজ, আর যার উপর ওয়াজিব তার কোরবানি।' },
];

export function significanceFor(month, day) {
  return SIGNIFICANCE.find((s) =>
    s.month === month && (s.day === day || (s.dayFrom != null && day >= s.dayFrom && day <= s.dayTo)));
}
