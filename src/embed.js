// Self-contained, iframe-able prayer-times card any website can paste in.
// Server-rendered from the offline engine; a small script keeps the next-prayer
// countdown live. No external fonts or scripts, so it loads instantly anywhere.
import { computePrayerTimes, METHOD_LABELS } from './prayer.js';
import { hijriDate } from './hijri.js';
import { geocodeCity } from './geocode.js';
import { locationFromRequest, isAuto } from './geo.js';
import {
  normaliseLang, isRtl, resolveHourFormat, prayerName, DIGIT_SETS,
  hijriLabel, formatClock, strings, countdownTemplate,
} from './i18n.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function localToday(tz) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz && tz !== 'UTC' ? tz : 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
  const p = {};
  for (const part of dtf.formatToParts(new Date())) p[part.type] = part.value;
  return { year: +p.year, month: +p.month, day: +p.day };
}

export function renderEmbed(url, request) {
  const q = url.searchParams;
  const lang = normaliseLang(q.get('lang'));
  const rtl = isRtl(lang);
  const hourFormat = resolveHourFormat(lang, q.get('format'));
  const s = strings(lang);

  let loc;
  try {
    const lat = q.get('latitude') ?? q.get('lat');
    const lon = q.get('longitude') ?? q.get('lon');
    if (lat != null && lon != null) {
      loc = { name: q.get('label') || 'Your location', country: '', latitude: +lat, longitude: +lon, timezone: q.get('timezone') || q.get('tz') || 'UTC' };
    } else if (isAuto(q.get('city'))) {
      // One iframe, and each visitor sees their own city. Falls back to Makkah
      // when the edge cannot place the request.
      loc = locationFromRequest(request) || geocodeCity('Makkah');
    } else if (q.get('city')) {
      loc = geocodeCity(q.get('city'));
    } else {
      loc = geocodeCity('Makkah');
    }
  } catch (_) {
    loc = geocodeCity('Makkah');
  }

  const method = METHOD_LABELS[q.get('method')] ? q.get('method') : 'karachi';
  const asrParam = q.get('asr');
  const light = q.get('theme') === 'light';
  const today = localToday(loc.timezone);
  const r = computePrayerTimes({
    latitude: loc.latitude,
    longitude: loc.longitude,
    year: today.year,
    month: today.month,
    day: today.day,
    method,
    asr: asrParam === 'auto' || !asrParam ? undefined : asrParam,
    timezone: loc.timezone,
  });
  const h = hijriDate(today.year, today.month, today.day);
  const isFriday = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' })
    .format(new Date(Date.UTC(today.year, today.month - 1, today.day, 12))) === 'Friday';

  const prayers = r.entries.filter((e) => e.isPrayer);
  const rows = r.entries
    .map((e) => {
      const label = prayerName(lang, e.key, isFriday);
      const dim = e.isPrayer ? '' : ' w-dim';
      const mins = e.clock ? e.clock.minutesOfDay : -1;
      // Arabic already reads as the primary name in ar, so the secondary
      // Arabic column would just repeat itself.
      const secondary = lang === 'ar' ? '' : `<span class="w-ar" dir="rtl">${e.arabic}</span>`;
      return `<div class="w-row${dim}" data-prayer="${e.isPrayer ? 1 : 0}" data-min="${mins}" data-name="${esc(label)}">
        <span class="w-name">${esc(label)}</span>
        ${secondary}
        <span class="w-time">${formatClock(lang, e.clock, hourFormat)}</span>
      </div>`;
    })
    .join('');

  const data = {
    tz: loc.timezone,
    lang,
    tpl: countdownTemplate(lang),
    hourWord: s.hour,
    minuteWord: s.minute,
    unitGap: s.unitGap,
    digits: DIGIT_SETS[lang] || null,
    prayers: prayers.map((e) => ({ name: prayerName(lang, e.key, isFriday), min: e.clock ? e.clock.minutesOfDay : -1 })),
    fajr: (r.entries.find((e) => e.key === 'fajr')?.clock?.minutesOfDay) ?? 0,
    fajrName: prayerName(lang, 'fajr'),
  };

  const script =
    '(function(){' +
    'var D=' + JSON.stringify(data) + ';' +
    'function num(v){if(!D.digits)return String(v);return String(v).replace(/[0-9]/g,function(d){return D.digits[+d];});}' +
    'function nowMin(){var p={};new Intl.DateTimeFormat("en-US",{timeZone:D.tz==="UTC"?"UTC":D.tz,hourCycle:"h23",hour:"numeric",minute:"numeric"}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});return (+p.hour)*60+(+p.minute);}' +
    'function tick(){var n=nowMin();var nx=null;for(var i=0;i<D.prayers.length;i++){if(D.prayers[i].min>n){nx=D.prayers[i];break;}}var until;if(nx){until=nx.min-n;}else{nx={name:D.fajrName,min:D.fajr};until=1440-n+D.fajr;}' +
    'var rows=document.querySelectorAll(".w-row");rows.forEach(function(el){el.classList.toggle("w-next",el.dataset.prayer==="1"&&el.dataset.name===nx.name);});' +
    'var h=Math.floor(until/60),m=until%60;var g=D.unitGap;' +
    'var t=(h>0?num(h)+g+D.hourWord+" ":"")+num(m)+g+D.minuteWord;' +
    'var c=document.getElementById("w-count");if(c)c.textContent=D.tpl.replace("{name}",nx.name).replace("{time}",t);}' +
    'tick();setInterval(tick,30000);})();';

  const bg = light ? '#F4F0E0' : '#00302F';
  const surface = light ? '#FAF6EA' : '#004B49';
  const ink = light ? '#103632' : '#EEF1EA';
  const inkDim = light ? '#4F6F66' : 'rgba(238,241,234,0.66)';
  const gold = '#F1D592';
  const line = light ? 'rgba(16,54,50,0.1)' : 'rgba(241,213,146,0.14)';
  const cols = lang === 'ar' ? '1fr auto' : '1fr auto auto';

  return `<!doctype html>
<html lang="${lang}"${rtl ? ' dir="rtl"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(s.title)} — ${esc(loc.name)}</title>
<style>
  :root { color-scheme: ${light ? 'light' : 'dark'}; }
  * { box-sizing: border-box; margin: 0; }
  html,body { background: ${bg}; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: ${ink}; padding: 14px; }
  .w-card { background: ${surface}; border: 1px solid ${line}; border-radius: 18px; padding: 18px 18px 14px; max-width: 360px; margin: 0 auto; }
  .w-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 2px; }
  .w-city { font-size: 1.15rem; font-weight: 700; color: ${gold}; }
  .w-hijri { font-size: 0.78rem; color: ${inkDim}; text-align: ${rtl ? 'left' : 'right'}; }
  .w-count { font-size: 0.85rem; color: ${ink}; opacity: 0.9; margin: 2px 0 12px; }
  .w-row { display: grid; grid-template-columns: ${cols}; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; }
  .w-row + .w-row { margin-top: 2px; }
  .w-name { font-weight: 600; font-size: 0.98rem; }
  .w-ar { font-size: 0.95rem; color: ${inkDim}; font-family: "Amiri", "Times New Roman", serif; }
  .w-time { font-variant-numeric: tabular-nums; font-weight: 600; font-size: 0.95rem; }
  .w-dim { opacity: 0.55; }
  .w-dim .w-name { font-weight: 500; }
  .w-next { background: ${light ? 'rgba(241,213,146,0.28)' : 'rgba(241,213,146,0.16)'}; }
  .w-next .w-time, .w-next .w-name { color: ${gold}; }
  .w-foot { margin-top: 12px; text-align: center; font-size: 0.72rem; }
  .w-foot a { color: ${inkDim}; text-decoration: none; }
  .w-foot a:hover { color: ${gold}; }
</style>
</head>
<body>
  <div class="w-card">
    <div class="w-head">
      <span class="w-city">${esc(loc.name)}</span>
      <span class="w-hijri">${esc(hijriLabel(lang, h))}<br>${esc(r.methodLabel)}</span>
    </div>
    <div class="w-count" id="w-count">&nbsp;</div>
    ${rows}
    <p class="w-foot"><a href="https://wasilah.site/build/" target="_blank" rel="noopener">${esc(s.poweredBy)}</a></p>
  </div>
  <script>${script}</script>
</body>
</html>`;
}
