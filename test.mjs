// Local exercise of the MCP endpoint without Wrangler. Node 20+ provides the
// global Request/Response used by the Worker handler. City lookups need
// network; the coordinate path here runs fully offline.
import worker from './src/index.js';

async function rpc(method, params) {
  const req = new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const res = await worker.fetch(req);
  return res.json();
}

function show(title, body) {
  console.log(`\n=== ${title} ===`);
  console.log(body);
}

const init = await rpc('initialize', { protocolVersion: '2025-06-18' });
show('initialize', JSON.stringify(init.result.serverInfo) + ' proto ' + init.result.protocolVersion);

const list = await rpc('tools/list', {});
show('tools/list', list.result.tools.map((t) => t.name).join(', '));

// Dhaka, Karachi method (app default -> Hanafi Asr), fixed date for repeatability.
const times = await rpc('tools/call', {
  name: 'get_prayer_times',
  arguments: { latitude: 23.8103, longitude: 90.4125, timezone: 'Asia/Dhaka', date: '2026-06-15' },
});
show('get_prayer_times (Dhaka, 2026-06-15)', times.result.content[0].text);

// Madinah qibla should point roughly south-southwest toward Makkah.
const qibla = await rpc('tools/call', {
  name: 'get_qibla',
  arguments: { latitude: 24.4686, longitude: 39.6142, timezone: 'Asia/Riyadh', label: 'Madinah' },
});
show('get_qibla (Madinah)', qibla.result.content[0].text);

const hijri = await rpc('tools/call', { name: 'get_hijri_date', arguments: { date: '2026-06-15' } });
show('get_hijri_date (2026-06-15)', hijri.result.content[0].text);

const audio = await rpc('tools/call', { name: 'get_quran_audio', arguments: { surah: 36 } });
show('get_quran_audio (36)', audio.result.content[0].text);

// Error path: invalid surah should return isError without throwing.
const bad = await rpc('tools/call', { name: 'get_quran_audio', arguments: { surah: 200 } });
show('error path (surah 200)', `isError=${bad.result.isError} :: ${bad.result.content[0].text}`);
