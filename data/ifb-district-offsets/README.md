# IFB district time offsets

A machine-readable transcription of the district offset tables from the Islamic Foundation
Bangladesh permanent prayer and fasting timetable.

## Why this exists

Nobody publishes this. Aladhan and IslamicFinder both serve Bangladesh with generic regional
settings, and Aladhan explicitly disclaims matching local authorities. The IFB schedule itself
is distributed as a scanned PDF and as images on aggregator sites. Verified 2026-07-30: there
is no open, citable, machine-readable version of the district offsets.

It is a small artifact. That is the point. It is the difference between computing prayer times
that are astronomically correct and computing the times Bangladesh actually prays by.

## What it is

`ifb-district-offsets.json` holds one entry per district: English name, Bengali name, division,
and the minute offset from Dhaka for sehri end and for iftar. Dhaka is the base at zero.
Offsets run from **+10/+11** (Panchagarh, Thakurgaon, Dinajpur in the far north-west) to
**-7** (Bandarban, Rangamati, Khagrachhari in the south-east hills).

63 of 64 districts. **Joypurhat is absent from the source's own tables** and is recorded in an
`unresolved` block with a null value rather than an estimate.

## What it is not

Read the `caveats` array in the JSON before using this. The three that matter most:

1. **These are sehri and iftar offsets.** They are the two columns the source publishes. The
   source's own footnote warns that deriving other prayers this way can vary, and that in the
   **northern districts the Asr offset may need to be larger** than the table gives. Do not
   silently apply these to Asr in the north.
2. **IFB builds in safety margins.** Sehri end carries a 3-minute precautionary margin, and
   iftar is set 3 minutes after true sunset. So IFB's published times are deliberately
   conservative relative to raw astronomy, in both directions. This is a feature of their
   schedule, not an error in yours.
3. **The source document was last updated 2015-11-18.** Confirm against a current IFB
   publication before treating any single value as authoritative.

## Verification record, 2026-07-30

IFB-published Dhaka times for 30 July 2026, against Wasilah's engine (Karachi angles, Hanafi
Asr) and against Tarteel's MCP on its ISNA default:

| | Fajr | Asr | Maghrib | Isha |
|---|---|---|---|---|
| IFB | 4:04 | **4:43 pm** | 6:47 | 8:07 |
| Wasilah | 04:04 | **16:43** | 18:43 | 20:06 |
| Tarteel (ISNA default) | 04:19 | **15:28** | | 19:50 |

Fajr matches exactly. **Asr matches exactly.** Isha is within a minute. Maghrib is 4 minutes
early, which the IFB iftar margin above accounts for.

**IFB uses Hanafi Asr.** This settles a question that several aggregators get wrong: "Karachi
method" describes the twilight angles (18°/18°) and is *independent* of the Asr madhhab
setting. At least one Bangladeshi site advertises the Karachi method and then serves a
Standard Asr, producing 15:28 for a country that prays at 16:43.

## Open decisions

- ~~**Licence.**~~ **Set 2026-07-30: CC BY 4.0 on the compilation**, with the underlying facts
  attributed to IFB and not claimed. See `LICENSE.md`. Still open: writing to IFB to tell them
  this exists. Not a blocker for publishing, but worth more than the licence itself if they
  acknowledge it.
- **Maghrib margin.** Wasilah currently publishes astronomical sunset, 4 minutes before IFB's
  iftar. Early is the dangerous direction for breaking a fast. Whether to adopt IFB's margin,
  surface both, or leave it is undecided.
- **Joypurhat.** Needs a value from a current IFB source.
- **Northern Asr offsets.** The source flags these as potentially larger without saying by how
  much. Worth measuring against published district timetables.

## Provenance

Islamic Foundation Bangladesh, "সাহরী ও ইফতারসহ (ঢাকা) নামাজের স্থায়ী সময়সূচী".
PDF retrieved 2026-07-30 from `https://kivabe.com/namaz/Calender_permanent_namaz_time.pdf`.
Cross-checked the same day against an IFB-derived per-district daily timetable for Dhaka.
