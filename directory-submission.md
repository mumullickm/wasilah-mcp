# Wasilah Connector: Anthropic Directory Submission

A ready-to-paste dossier for applying to list Wasilah in Anthropic's public connector directory. Every field is filled; logo, privacy URL, and terms URL are all in place. Paste these values into the application form and upload `assets/icon.png`.

## Where to submit
Anthropic reviews public-directory connectors through their connector application (linked from the connectors documentation and the support center). This is a manual review; a working, publicly reachable MCP server is a prerequisite, which we have. Self-adding by URL already works today and does not require this step; submission is only to appear in the browsable gallery for all users.

---

## Listing fields

**Connector name:** Wasilah

**Tagline:** Prayer times, Qibla, Hijri date, and Quran audio for Muslims.

**Category:** Lifestyle / Reference

**Short description:**
Wasilah brings the core of an Islamic prayer companion into Claude. Ask for accurate prayer times for any city, the Qibla direction, today's Hijri date, or a Quran recitation link. Prayer times are computed with the same astronomy engine as the Wasilah app, so answers match the app to the minute.

**MCP server URL:** `https://wasilah-mcp.aykiz.workers.dev/mcp`

**Transport:** Streamable HTTP

**Authentication:** None. The connector exposes only public reference data. It holds no user accounts and stores no personal information.

**Developer / owner:** Aykiz Intelligence (Miraz Mullick)
**Contact email:** mumullickm@gmail.com
**Homepage:** https://wasilah.site
**Connector landing page:** https://wasilah-mcp.aykiz.workers.dev

**Logo / icon:** `assets/icon.png` in this repo (512x512 PNG, the Wasilah store-listing app icon). Upload this file in the form.

**Privacy policy URL:** https://wasilah-mcp.aykiz.workers.dev/privacy (connector-specific; states plainly that it collects nothing). The Wasilah app's own policy is at https://wasilah.site/privacy/.

**Terms URL:** https://wasilah-mcp.aykiz.workers.dev/terms (connector-specific). The Wasilah app's own terms are at https://wasilah.site/terms/.

---

## Tools

| Tool | Description | Example prompt |
| --- | --- | --- |
| `get_prayer_times` | Five daily prayers plus sunrise for a city or coordinates. Marks Dhuhr as Jumu'ah on Fridays. | "What are today's prayer times in Dhaka?" |
| `get_next_prayer` | The next upcoming prayer and time remaining. | "How long until the next prayer in Madinah?" |
| `get_qibla` | Compass bearing to the Kaaba. | "Which way is the Qibla from London?" |
| `get_hijri_date` | Islamic date for a Gregorian date or today. | "What is today's Hijri date?" |
| `get_quran_audio` | Full-surah recitation stream URL plus surah name and ayah count. | "Give me the audio for Surah Ya-Sin." |

---

## Data handling and security (for review)

- **Read-only.** No tool has side effects. Nothing is created, modified, or deleted.
- **Stateless.** No sessions, no database, no logs of user input. Each request is independent.
- **No personal data.** No accounts, no location history, no tracking. The on-device prayer tracker in the Wasilah app is deliberately out of scope.
- **External calls:** city names are resolved through the Open-Meteo geocoding API (no key, anonymous). Quran audio links point to the islamic.network CDN. Passing coordinates directly avoids any external call.
- **Hosting:** Cloudflare Workers. Source: github (private/public per your choice).
- **Calculation provenance:** prayer-time geometry is ported from the Wasilah app's own engine (PrayTimes.org canonical algorithm, cross-verified against Adhan), so the connector and the app agree.

## Target users
Muslims who use Claude and want quick, accurate prayer times and Islamic reference data in conversation. Strong fit for the Bangla diaspora and MENA audiences Wasilah already serves.

## Suggested review test
Ask: "Using Wasilah, what time is Maghrib in Dhaka today and which way is the Qibla?" Expect a Maghrib time near 18:47 and a Qibla bearing near 278 degrees.
