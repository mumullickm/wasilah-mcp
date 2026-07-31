// Parity tests with real assertions. These pin the engine to values verified
// against the Islamic Foundation Bangladesh published timetable on 2026-07-30.
// If any of these fail, the engine has drifted from the authority Bangladesh
// actually prays by. Do not "fix" a test by changing the expected value.
import assert from 'node:assert/strict';
import worker from './src/index.js';

let failed = 0;
async function call(name, args) {
  const req = new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  const res = await worker.fetch(req);
  const body = await res.json();
  return body.result ?? body;
}
async function test(label, fn) {
  try { await fn(); console.log(`  PASS  ${label}`); }
  catch (e) { failed++; console.log(`  FAIL  ${label}\n        ${e.message.split('\n')[0]}`); }
}

const DHAKA = { latitude: 23.8103, longitude: 90.4125, timezone: 'Asia/Dhaka' };

console.log('\nIFB parity (Dhaka, 2026-07-30, Karachi angles + Hanafi Asr)');

await test('Asr = 16:43, matching IFB exactly', async () => {
  const r = await call('get_prayer_times', { ...DHAKA, date: '2026-07-30', method: 'karachi', asr: 'hanafi' });
  const text = r.content[0].text;
  assert.match(text, /16:43/, `IFB publishes Asr 4:43 pm for Dhaka on this date.\n${text}`);
});

await test('Fajr = 04:04, matching IFB exactly', async () => {
  const r = await call('get_prayer_times', { ...DHAKA, date: '2026-07-30', method: 'karachi', asr: 'hanafi' });
  assert.match(r.content[0].text, /04:04/);
});

await test('Hanafi Asr is materially later than Shafii (the 75-minute gap)', async () => {
  const h = await call('get_prayer_times', { ...DHAKA, date: '2026-07-30', method: 'karachi', asr: 'hanafi' });
  const s = await call('get_prayer_times', { ...DHAKA, date: '2026-07-30', method: 'karachi', asr: 'shafii' });
  assert.notEqual(h.content[0].text, s.content[0].text, 'asr setting had no effect');
  assert.match(s.content[0].text, /15:2[0-9]/, 'Shafii Asr should land near 15:28');
});

console.log('\nError handling');

await test('unknown timezone fails cleanly and names the offending zone', async () => {
  // NOTE: the guard in prayer.js utcOffsetHours() produces "Unknown timezone: X".
  // The MCP tool path throws earlier, inside Intl, so callers see Intl's own
  // "Invalid time zone specified: X". Both are caught and returned as a tool
  // error naming the zone. Worth unifying the wording; not worth a crash risk.
  const r = await call('get_prayer_times', { latitude: 23.8, longitude: 90.4, timezone: 'Not/AZone' });
  assert.equal(r.isError, true, 'a bad timezone must surface as a tool error');
  const text = r.content[0].text;
  assert.match(text, /Not\/AZone/, `the error should name the zone, got: ${text}`);
  assert.match(text, /time ?zone/i, `the error should say what was wrong, got: ${text}`);
  assert.doesNotMatch(text, /\bat .*\.js:\d+/, 'a stack trace leaked to the caller');
});

// Was: assert a WARNING. The warning was a mitigation for returning UTC; 1.4.0
// removes the cause instead, so the guard now pins the times themselves.
await test('coordinates without a timezone are resolved, not returned as UTC', async () => {
  const r = await call('get_prayer_times', { latitude: 23.8103, longitude: 90.4125, date: '2026-07-30' });
  const t = r.content[0].text;
  assert.match(t, /Asia\/Dhaka/, 'a silent 6-hour error is the worst failure mode here');
  assert.doesNotMatch(t, /UTC\+0\)/, 'UTC for Dhaka coordinates is the defect this replaced');
});

await test('coordinates with a timezone do not warn', async () => {
  const r = await call('get_prayer_times', { ...DHAKA, date: '2026-07-30' });
  assert.doesNotMatch(r.content[0].text, /WARNING/, 'false alarm on a correct call');
});

await test('serverInfo version matches server.json and the MCP registry', async () => {
  const { readFileSync } = await import('node:fs');
  const declared = JSON.parse(readFileSync('./server.json', 'utf8')).version;
  const res = await worker.fetch(new Request('http://localhost/mcp', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } }),
  }));
  const live = (await res.json()).result.serverInfo.version;
  assert.equal(live, declared, `registry says ${declared}, server reports ${live}`);
});

await test('get_next_prayer resolves bare coordinates the same way', async () => {
  const r = await call('get_next_prayer', { latitude: 23.8103, longitude: 90.4125 });
  assert.match(r.content[0].text, /Asia\/Dhaka/, 'a wrong countdown is worse than a wrong table');
});

console.log('\nBangladesh coverage (the IFB dataset is district-keyed, so every district must resolve)');

await test('all 64 IFB districts resolve to a Bangladesh location', async () => {
  const { readFileSync } = await import('node:fs');
  const { geocodeCity } = await import('./src/geocode.js');
  const d = JSON.parse(readFileSync('./data/ifb-district-offsets/ifb-district-offsets.json', 'utf8'));
  const all = [...d.districts, ...d.unresolved];
  assert.equal(all.length, 64, 'the offset table should cover all 64 districts');
  const missing = all.filter((x) => {
    try { const r = geocodeCity(x.en); return !r || r.country !== 'Bangladesh'; }
    catch { return true; }
  }).map((x) => x.en);
  assert.deepEqual(missing, [], `unresolvable districts: ${missing.join(', ')}`);
});

await test('renamed districts resolve under the name people actually type', async () => {
  const { geocodeCity } = await import('./src/geocode.js');
  for (const old of ['Comilla', 'Jessore', 'Bogra', 'Chittagong', 'Barishal']) {
    const r = geocodeCity(old);
    assert.ok(r && r.country === 'Bangladesh', `${old} should resolve`);
  }
});

console.log('\nAsma ul Husna');

await test('lookup by number returns the right name, trilingual', async () => {
  const r = await call('get_asma_ul_husna', { number: 1 });
  const t = r.content[0].text;
  assert.match(t, /Ar-Rahman/);
  assert.match(t, /\u0627\u0644\u0631/, 'Arabic script missing');
  assert.match(t, /\u09aa\u09b0\u09ae/, 'Bengali missing, which is the coverage the incumbents lack');
});

await test('search matches on English meaning', async () => {
  const r = await call('get_asma_ul_husna', { search: 'merciful' });
  assert.match(r.content[0].text, /Ar-Raheem/);
});

await test('no argument returns all 99', async () => {
  const r = await call('get_asma_ul_husna', {});
  const nums = (r.content[0].text.match(/^\d+\. /gm) || []).length;
  assert.equal(nums, 99, `expected 99 names, rendered ${nums}`);
});

await test('out-of-range number fails cleanly', async () => {
  const r = await call('get_asma_ul_husna', { number: 200 });
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /between 1 and 99/);
});

console.log('\nHijri calendar');

await test('returns a full month mapped to Gregorian dates', async () => {
  const r = await call('get_hijri_calendar', { year: 1448, month: 10 });
  const t = r.content[0].text;
  assert.match(t, /Shawwal 1448 AH \(\d+ days\)/);
  assert.equal((t.match(/^\s*\d+\s+\d{4}-\d{2}-\d{2}/gm) || []).length >= 29, true, 'month grid too short');
});

await test('never asserts Eid as settled, and defers to local sighting', async () => {
  const t = (await call('get_hijri_calendar', { year: 1448, month: 10 })).content[0].text;
  assert.match(t, /EXPECTED/, 'significant days must be labelled expected');
  assert.match(t, /local moon-sighting authority/, 'must defer to the local authority');
});

await test('calendar method is a parameter, and the two disagree', async () => {
  const u = (await call('get_hijri_calendar', { year: 1448, month: 10, method: 'umm_al_qura' })).content[0].text;
  const b = (await call('get_hijri_calendar', { year: 1448, month: 10, method: 'tabular' })).content[0].text;
  assert.match(u, /2027-03-09/, 'Umm al-Qura puts 1 Shawwal 1448 on 2027-03-09');
  assert.match(b, /2027-03-10/, 'tabular puts it a day later');
  assert.notEqual(u, b, 'method had no effect');
});

await test('Bengali significant-day notes are available', async () => {
  const t = (await call('get_hijri_calendar', { year: 1448, month: 9, language: 'bn' })).content[0].text;
  assert.match(t, /\u09b0\u09ae\u099c\u09be\u09a8/, 'Bengali title missing');
  assert.match(t, /\u099a\u09be\u0981\u09a6/, 'Bengali sighting deferral missing');
});

console.log('\nIFB district offsets');

await test('returns IFB published values, not a computation', async () => {
  const t = (await call('get_ifb_district_offset', { district: 'Sylhet' })).content[0].text;
  assert.match(t, /-6 minutes/);
  assert.match(t, /Islamic Foundation Bangladesh/);
});

await test('Bengali district names work', async () => {
  const t = (await call('get_ifb_district_offset', { district: '\u09b8\u09bf\u09b2\u09c7\u099f' })).content[0].text;
  assert.match(t, /Sylhet/);
});

await test('Joypurhat is reported as not published, estimate marked evidence only', async () => {
  const t = (await call('get_ifb_district_offset', { district: 'Joypurhat' })).content[0].text;
  assert.match(t, /NOT PUBLISHED/);
  assert.match(t, /Evidence only/i, 'the estimate must never read as IFB\'s value');
});

await test('every response carries the northern-Asr and margin caveats', async () => {
  const t = (await call('get_ifb_district_offset', { district: 'Panchagarh' })).content[0].text;
  assert.match(t, /Asr offset may need to be LARGER/);
  assert.match(t, /IFB is correct/);
});

console.log('\nTimezone inference for bare coordinates');

await test('Dhaka coordinates without a timezone are no longer six hours wrong', async () => {
  const withTz = (await call('get_prayer_times', { ...DHAKA, date: '2026-07-30' })).content[0].text;
  const without = (await call('get_prayer_times', {
    latitude: DHAKA.latitude, longitude: DHAKA.longitude, date: '2026-07-30',
  })).content[0].text;
  const times = (t) => t.match(/\d{2}:\d{2}/g).join(',');
  assert.equal(times(without), times(withTz), 'inferred zone must reproduce the explicit one');
  assert.match(without, /Asia\/Dhaka was inferred|inferred from the nearest known city/);
});

await test('an inferred zone is always disclosed, never silent', async () => {
  const t = (await call('get_prayer_times', { latitude: 51.5074, longitude: -0.1278 })).content[0].text;
  assert.match(t, /No timezone was given/, 'the caller must be able to tell inferred from supplied');
  assert.match(t, /Europe\/London/);
});

await test('mid-ocean coordinates still warn rather than assert a zone', async () => {
  const t = (await call('get_prayer_times', { latitude: -35, longitude: -140 })).content[0].text;
  assert.match(t, /WARNING/, 'no city is close enough to infer from');
});

console.log('\nUser offset minutes (parity with the app _applyOffsets)');

await test('offsets shift only the named prayer', async () => {
  const base = (await call('get_prayer_times', { ...DHAKA, date: '2026-07-30' })).content[0].text;
  const off = (await call('get_prayer_times', {
    ...DHAKA, date: '2026-07-30', offset_minutes: { maghrib: 3 },
  })).content[0].text;
  const maghrib = (t) => /Maghrib\s+(\d{2}:\d{2})/.exec(t)[1];
  const fajr = (t) => /Fajr\s+(\d{2}:\d{2})/.exec(t)[1];
  const [bh, bm] = maghrib(base).split(':').map(Number);
  const [oh, om] = maghrib(off).split(':').map(Number);
  assert.equal(oh * 60 + om - (bh * 60 + bm), 3, 'Maghrib must move by exactly 3 minutes');
  assert.equal(fajr(off), fajr(base), 'an unnamed prayer must not move');
});

await test('Sunrise is never offset, matching offsetMinFor', async () => {
  const base = (await call('get_prayer_times', { ...DHAKA, date: '2026-07-30' })).content[0].text;
  const sunrise = (t) => /Sunrise\s+(\d{2}:\d{2})/.exec(t)[1];
  const off = (await call('get_prayer_times', {
    ...DHAKA, date: '2026-07-30', offset_minutes: { fajr: 10 },
  })).content[0].text;
  assert.equal(sunrise(off), sunrise(base));
  const rejected = await call('get_prayer_times', { ...DHAKA, offset_minutes: { sunrise: 5 } });
  assert.match(JSON.stringify(rejected), /reference-only/, 'offsetting sunrise must be refused');
});

await test('applied offsets are stated, not folded in silently', async () => {
  const t = (await call('get_prayer_times', {
    ...DHAKA, date: '2026-07-30', offset_minutes: { isha: -5 },
  })).content[0].text;
  assert.match(t, /Your offsets applied/);
  assert.match(t, /isha -5 min/);
});

console.log('\nTasbeeh');

await test('every dhikr carries both an English and a Bengali meaning', async () => {
  const t = (await call('get_tasbeeh', {})).content[0].text;
  for (const phrase of ['SubhanAllah', 'Alhamdulillah', 'Allahu Akbar', 'La ilaha illa Allah',
                        'Astaghfirullah', 'Salawat']) {
    assert.match(t, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${phrase} missing`);
  }
  const bn = (await call('get_tasbeeh', { language: 'bn' })).content[0].text;
  assert.match(bn, /\u0986\u09b2\u09cd\u09b2\u09be\u09b9/, 'Bengali meanings missing');
});

await test('counts are presented as customary, and rulings are deferred', async () => {
  const t = (await call('get_tasbeeh', {})).content[0].text;
  assert.match(t, /not a condition/, 'a count must not read as obligatory');
  assert.match(t, /qualified scholar/, 'ruling questions must be deferred');
});

console.log('\nAttribution (CC BY 4.0 compliance for the bundled GeoNames data)');

await test('/api index serves the GeoNames attribution', async () => {
  const res = await worker.fetch(new Request('http://localhost/api'));
  const body = await res.json();
  assert.match(JSON.stringify(body), /GeoNames/, 'CC BY requires attribution to reach the recipient');
});

console.log(failed ? `\n${failed} FAILED\n` : '\nAll parity tests passed.\n');
process.exit(failed ? 1 : 0);
