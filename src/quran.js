import { SURAHS } from './surahs.js';

// Recitation audio served by the islamic.network CDN, the same source the
// Wasilah app credits for adhan and Quran audio.
//
// The CDN carries two independent sets, and they are NOT interchangeable:
//   audio-surah/<bitrate>/<edition>/<surah>.mp3  one file per surah
//   audio/<bitrate>/<edition>/<globalAyah>.mp3   one file per ayah (1..6236)
// Only ar.alafasy exists in both. Every edition below was probed against the
// live CDN on 2026-07-30 and only the ones that returned audio are listed; an
// earlier list shipped three editions (husary, minshawi, muhammadayyoub) that
// have no full-surah files at any bitrate and returned 403 for every surah.
// If you add a reciter, probe both paths first and set the flags honestly,
// otherwise the tool hands out dead links.
export const RECITERS = {
  'ar.alafasy': { name: 'Mishary Rashid Alafasy', bitrate: 128, surah: true, ayah: true },
  'ar.abdulbasitmurattal': { name: 'Abdul Basit (Murattal)', bitrate: 128, surah: true, ayah: false },
  'ar.abdullahbasfar': { name: 'Abdullah Basfar', bitrate: 128, surah: true, ayah: false },
  'ar.husary': { name: 'Mahmoud Khalil Al-Husary', bitrate: 128, surah: false, ayah: true },
  'ar.husarymujawwad': { name: 'Al-Husary (Mujawwad)', bitrate: 128, surah: false, ayah: true },
  'ar.minshawi': { name: 'Mohamed Siddiq El-Minshawi', bitrate: 128, surah: false, ayah: true },
  'ar.muhammadayyoub': { name: 'Muhammad Ayyoub', bitrate: 128, surah: false, ayah: true },
  'ar.muhammadjibreel': { name: 'Muhammad Jibreel', bitrate: 128, surah: false, ayah: true },
  'ar.hudhaify': { name: 'Ali Al-Hudhaify', bitrate: 128, surah: false, ayah: true },
  'ar.mahermuaiqly': { name: 'Maher Al Muaiqly', bitrate: 128, surah: false, ayah: true },
  'ar.shaatree': { name: 'Abu Bakr Ash-Shaatree', bitrate: 128, surah: false, ayah: true },
  'ar.ahmedajamy': { name: 'Ahmed ibn Ali al-Ajamy', bitrate: 128, surah: false, ayah: true },
};

export const DEFAULT_RECITER = 'ar.alafasy';

// Editions that can return a single play-the-whole-surah URL.
export const SURAH_RECITERS = Object.keys(RECITERS).filter((k) => RECITERS[k].surah);

const CDN = 'https://cdn.islamic.network/quran';

// Global ayah index (1..6236) of the first ayah of a surah. Derived from the
// bundled ayah counts, which sum to 6236, and spot-checked against the
// canonical numbering (36:1 = 3706, 114:6 = 6236). Kept offline on purpose:
// the server must make zero outbound calls.
function firstGlobalAyah(surahNumber) {
  let n = 1;
  for (let i = 0; i < surahNumber - 1; i += 1) n += SURAHS[i].ayahs;
  return n;
}

export function quranAudio(surahNumber, reciter = DEFAULT_RECITER) {
  const n = Number(surahNumber);
  if (!Number.isInteger(n) || n < 1 || n > 114) {
    throw new Error('Surah number must be an integer between 1 and 114.');
  }
  const edition = RECITERS[reciter] ? reciter : DEFAULT_RECITER;
  const meta = RECITERS[edition];
  const surah = SURAHS[n - 1];

  const result = {
    surahNumber: n,
    name: surah.name,
    arabic: surah.arabic,
    ayahs: surah.ayahs,
    reciter: meta.name,
    edition,
    audioUrl: null,
    ayahAudio: null,
  };

  if (meta.surah) {
    result.audioUrl = `${CDN}/audio-surah/${meta.bitrate}/${edition}/${n}.mp3`;
  }

  // Reciters without a single-file surah still have per-ayah audio. Hand back
  // the numbering so a client can build the playlist itself rather than
  // returning nothing playable.
  if (meta.ayah) {
    const first = firstGlobalAyah(n);
    result.ayahAudio = {
      urlTemplate: `${CDN}/audio/${meta.bitrate}/${edition}/{ayah}.mp3`,
      firstAyah: first,
      lastAyah: first + surah.ayahs - 1,
      count: surah.ayahs,
      note: 'Substitute {ayah} with each number from firstAyah to lastAyah, in order, to play the surah.',
    };
  }

  return result;
}
