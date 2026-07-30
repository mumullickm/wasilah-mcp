# Licence

## What is licensed

This dataset is a **compilation**. The licence below covers the compilation only:

- the transcription of the offset tables into structured, machine-readable form
- the English and Bengali name pairing for each district
- the division mapping
- the schema, field naming and structure
- the caveats, the scope notes and the recorded verification
- the decision to record Joypurhat as unresolved rather than estimated

**Compilation © 2026 Miraz Mullick (Aykiz Intelligence), released under
[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).**

You may share and adapt it, including commercially, provided you give attribution.

## What is NOT licensed here

The underlying prayer time offsets are facts published by the **Islamic Foundation Bangladesh**
in its permanent prayer and fasting timetable. Those facts are not claimed by this compilation
and are not licensed by it. They are attributed to IFB, which remains the authority for them.

Whether and how Bangladeshi copyright law applies to material published by a statutory
government foundation has not been resolved and is not asserted either way here. If IFB objects
to this transcription, it will be withdrawn.

## Attribution

Please use:

> Islamic Foundation Bangladesh district time offsets. Compiled by Miraz Mullick
> (Aykiz Intelligence), 2026. CC BY 4.0. Underlying data: Islamic Foundation Bangladesh,
> "সাহরী ও ইফতারসহ (ঢাকা) নামাজের স্থায়ী সময়সূচী".

Machine-readable form:

```json
{
  "title": "Islamic Foundation Bangladesh district time offsets",
  "compiler": "Miraz Mullick (Aykiz Intelligence)",
  "year": 2026,
  "license": "CC-BY-4.0",
  "source_authority": "Islamic Foundation Bangladesh"
}
```

## Accuracy notice, which matters more than the licence

This is reference data about religious observance. **A wrong value here means someone prays or
breaks a fast at the wrong time.** That is the real risk in this dataset, not a licensing
dispute.

- This is **not** an official IFB publication and carries no IFB endorsement.
- It is **not** a substitute for the Islamic Foundation Bangladesh's own timetable. Where the
  two differ, IFB is correct and this is wrong.
- The source document was last updated **2015-11-18**. Confirm against current IFB material
  before relying on any single value.
- The offsets are published by IFB for **sehri end and iftar**. IFB's own footnote warns that
  deriving other prayers this way varies, and that northern districts may need a larger Asr
  offset than the table gives.
- IFB deliberately builds in margins: roughly 3 minutes added to sehri end, and iftar set after
  true sunset. Their published times are intentionally conservative relative to raw astronomy.
- **Joypurhat is absent from the source and is recorded as null.** It has not been estimated.
  Do not fill it in by interpolation.

No warranty is given, express or implied. Verify before relying on this for worship.
