import { SURAHS } from './surahs.js';

// Full-surah recitation audio served by the islamic.network CDN, the same
// source the Wasilah app credits for adhan and Quran audio.
export const RECITERS = {
  'ar.alafasy': { name: 'Mishary Rashid Alafasy', bitrate: 128 },
  'ar.abdulbasitmurattal': { name: 'Abdul Basit (Murattal)', bitrate: 128 },
  'ar.husary': { name: 'Mahmoud Khalil Al-Husary', bitrate: 128 },
  'ar.minshawi': { name: 'Mohamed Siddiq El-Minshawi', bitrate: 128 },
  'ar.muhammadayyoub': { name: 'Muhammad Ayyoub', bitrate: 128 },
};

export function quranAudio(surahNumber, reciter = 'ar.alafasy') {
  const n = Number(surahNumber);
  if (!Number.isInteger(n) || n < 1 || n > 114) {
    throw new Error('Surah number must be an integer between 1 and 114.');
  }
  const edition = RECITERS[reciter] ? reciter : 'ar.alafasy';
  const meta = RECITERS[edition];
  const surah = SURAHS[n - 1];
  const url = `https://cdn.islamic.network/quran/audio-surah/${meta.bitrate}/${edition}/${n}.mp3`;
  return {
    surahNumber: n,
    name: surah.name,
    arabic: surah.arabic,
    ayahs: surah.ayahs,
    reciter: meta.name,
    edition,
    audioUrl: url,
  };
}
