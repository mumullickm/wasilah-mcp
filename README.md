# Wasilah MCP

A remote [Model Context Protocol](https://modelcontextprotocol.io) server that exposes Wasilah's Islamic reference data to Claude as a custom connector. Add the URL in Claude and it can answer prayer-time, Qibla, Hijri-date, and Quran-audio questions directly.

Prayer times are computed with the **same astronomy engine as the Wasilah app** (ported from `lib/features/prayer_times/prayer_astronomy.dart`), so the connector and the app agree to the minute for the same location, date, method, and madhab.

## Tools

| Tool | What it returns |
| --- | --- |
| `get_prayer_times` | The five daily prayers plus sunrise for a city or coordinates. Marks Dhuhr as Jumu'ah on Fridays. |
| `get_next_prayer` | The next upcoming prayer and time remaining. |
| `get_qibla` | Compass bearing to the Kaaba. |
| `get_hijri_date` | Islamic date for a given Gregorian date (Umm al-Qura, with a tabular fallback). |
| `get_quran_audio` | A streaming full-surah recitation URL plus surah name and ayah count. |

Every location tool accepts either a `city` name (resolved against a bundled offline database) or explicit `latitude` + `longitude` + `timezone`. Prayer tools also accept `method` (Karachi, ISNA, MWL, Umm al-Qura, and others) and `asr` (`auto`, `shafii`, `hanafi`). The connector makes no external network calls.

## Run locally

```bash
npm install
npm test        # exercises every tool through the MCP endpoint, no server needed
npm run dev     # serves the worker on http://localhost:8787
```

With the dev server running, point the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) at `http://localhost:8787/mcp` to browse and call the tools interactively.

## Deploy (Cloudflare Workers)

```bash
npx wrangler login
npm run deploy
```

Wrangler prints the deployed URL, for example `https://wasilah-mcp.<subdomain>.workers.dev`. The connector endpoint is that URL plus `/mcp`. Visiting the root URL serves a short landing page with the connector URL and setup steps.

## Add to Claude

1. Settings, then Connectors.
2. Add custom connector.
3. Paste `https://<your-worker-url>/mcp`.
4. Ask something like "What time is Maghrib in Dhaka today?" or "Which way is the Qibla from Madinah?"

This server is authless and stateless. It exposes only public reference data; it holds no personal information and needs no sign-in.

## Notes

- **Prayer parity.** Calculation-method angles, the Asr shadow factors, and the solar geometry mirror the app exactly. The app's default is Karachi method with Hanafi Asr.
- **Hijri source.** Uses the Umm al-Qura calendar where the runtime's ICU supports it, and a tabular calculation otherwise. A tabular date can differ from a moon-sighting announcement by a day.
- **Fully offline.** The connector makes no external API calls. City lookups use a bundled offline database (a subset of GeoNames, CC BY 4.0: top cities per country plus every capital); prayer times, Qibla, and Hijri date are computed on the server. Pass coordinates directly for places not in the database.
- **Personal data is out of scope.** This server does not touch the on-device Salah tracker. Exposing per-user history would require a Wasilah backend with accounts and OAuth.
