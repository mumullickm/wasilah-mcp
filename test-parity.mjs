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

await test('coordinates without a timezone warn loudly instead of silently returning UTC', async () => {
  const r = await call('get_prayer_times', { latitude: 23.8103, longitude: 90.4125 });
  assert.match(r.content[0].text, /WARNING/, 'a silent 6-hour error is the worst failure mode here');
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

await test('get_next_prayer also warns on coordinates without a timezone', async () => {
  const r = await call('get_next_prayer', { latitude: 23.8103, longitude: 90.4125 });
  assert.match(r.content[0].text, /WARNING/, 'a wrong countdown is worse than a wrong table');
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

console.log('\nAttribution (CC BY 4.0 compliance for the bundled GeoNames data)');

await test('/api index serves the GeoNames attribution', async () => {
  const res = await worker.fetch(new Request('http://localhost/api'));
  const body = await res.json();
  assert.match(JSON.stringify(body), /GeoNames/, 'CC BY requires attribution to reach the recipient');
});

console.log(failed ? `\n${failed} FAILED\n` : '\nAll parity tests passed.\n');
process.exit(failed ? 1 : 0);
