# HealthGuard Triage Literature Review and Provisional Rulings

**Reviewed:** 2026-11-05
**Status:** Engineering evidence review; **not clinical approval**
**Scope:** Symptom recognition, escalation behavior, and the standalone smoke test. This review does not diagnose, prescribe, or establish that a patient is safe.

## Summary ruling

The current triage rules cannot yet be described as clinically accurate. Published guidance supports particular danger signs and care actions, but it does not validate HealthGuard's additive symptom weights or its GREEN/YELLOW/RED score cutoffs. The sources below also describe different populations and health systems; the final local disposition must be approved by the Irosin Municipal Health Office or another authorized clinician.

The engine smoke test is intentionally a **gap detector**: it compares selected engine outcomes with provisional color mappings of source-directed actions. It exits nonzero when a case differs. A passing run would establish only software behavior against this test table, not clinical validity, sensitivity, or safety.

There are also conflicting project records: the current code sets the RED score cutoff to 8, while the physician-validation report describes a cutoff of 6 and a four-symptom RED override that the final classifier does not currently enforce. Treat neither threshold as clinically approved; reconcile the executable behavior and review document with the MHO before use.

## Evidence and provisional rulings

| ID | Evidence | Provisional ruling for HealthGuard | Limit |
|---|---|---|---|
| R1 | [CDC, Clinical Care of Dengue](https://www.cdc.gov/dengue/hcp/clinical-care/index.html) says dengue warning signs include severe abdominal pain/tenderness, persistent vomiting (at least 3 episodes in 1 hour or 4 in 6 hours), mucosal bleeding, and altered mental status; patients with warning signs should be managed as inpatients. [CDC's WHO 2009 classification summary](https://www.cdc.gov/dengue/hcp/clinical-signs/guidelines.html) explains the dengue context. | For suspected/confirmed dengue, encode these warning signs as explicit escalation rules instead of expecting a generic score to reach RED. Test the stated vomiting frequency boundaries. | Do not infer dengue from a symptom or imply that the source makes every isolated symptom an automatic admission. Clinician-approved intake/context and local disposition mapping are needed. |
| R2 | [NHS cough guidance](https://www.nhs.uk/symptoms/cough/) recommends urgent advice for breathing difficulty, chest pain, coughing blood, or a very bad/rapidly worsening cough. [NHS diarrhoea and vomiting guidance](https://www.nhs.uk/conditions/diarrhoea-and-vomiting/) treats severe breathing difficulty, sudden severe headache or tummy pain, confusion/not responding, blood or green vomit as emergency signs. | Distinguish immediate emergency signs from symptoms that need prompt same-day clinical review; do not make a single undifferentiated “severe wording” rule stand in for clinical context. | NHS call numbers and care pathways are UK-specific. The exact Irosin destination and RED/YELLOW wording need local approval. |
| R3 | [NHS diarrhoea and vomiting guidance](https://www.nhs.uk/conditions/diarrhoea-and-vomiting/) advises urgent contact for inability to keep fluids down, dehydration signs, bloody diarrhoea, diarrhoea over 7 days, or vomiting over 2 days. [WHO, The Treatment of Diarrhoea](https://www.who.int/publications/i/item/9241593180) supports ORS and child-diarrhoea management, including bloody diarrhoea. | Add duration/frequency and hydration review cases, and route them to a health worker at minimum. Treat RED versus YELLOW as a local policy decision, not a threshold stated by WHO/NHS. | Age, hydration status, blood, fever, and ability to drink affect care. The current intake does not collect all those clinical details. |
| R4 | [NHS cough guidance](https://www.nhs.uk/symptoms/cough/) recommends review for a cough lasting more than 3 weeks. | Replace or supplement the current >30-day cough review threshold with a >21-day review trigger after clinician approval. | The NHS recommendation is a primary-care review, not an automatic emergency referral or a Philippine protocol. |
| R5 | [NHS child fever guidance](https://www.nhs.uk/conditions/fever-in-children/) identifies fever lasting 5 days or more as a reason for urgent advice and defines a high temperature as 38°C or more. It separately lists emergency warning signs. [WHO/UNICEF's 2019 sick-young-infant chart booklet](https://www.who.int/publications/i/item/9789241516365) supersedes its 2014 young-infant section. | Do not use “fever for 5 days” as an all-age RED rule. Separate urgent review from emergency signs, and collect a measured temperature before implementing temperature-based infant thresholds. | NHS guidance is not Philippine policy. WHO's chart requires trained assessment; the product currently has no temperature field. |
| R6 | The cited CDC, WHO, and NHS sources provide symptom-specific clinical actions, but none validates HealthGuard's sum of severity weights or its score thresholds. The physician review report remains a draft. | Keep weights/score bands labeled as unvalidated engineering heuristics. Do not call them literature-derived or clinically accurate until they are calibrated and evaluated on clinician-adjudicated local cases. | Threshold calibration requires a defined target population, gold-standard outcomes, false-negative/false-positive analysis, and change control. |
| R7 | WHO/IMCI materials address trained health-worker classification of children, including danger signs; the [WHO IMCI chart-booklet page](https://www.who.int/publications/i/item/9789241506823) describes modules for general danger signs, breathing, diarrhoea, and fever. | Do not claim this general adult/child symptom score is WHO/IMCI-compliant. For a child workflow, use an approved local IMCI protocol and capture the inputs that protocol requires. | A general publication page is not a substitute for the applicable chart booklet, staff training, or Philippine adaptation. |

## Current-code checks for the smoke test

The symptom cases are implemented in [`backend/run_engine_smoketest.py`](./backend/run_engine_smoketest.py). Provisional mappings are stated in the test labels and above; they are not labels supplied by the cited sources.

Run on 2026-11-05 against the current engine: **6 of 12 cases differed** from the provisional targets.

| Symptom scenario | Provisional target | Current engine | Finding |
|---|---|---|---|
| Fever with severe abdominal pain | RED in suspected/confirmed dengue warning-sign context | YELLOW | Below the proposed warning-sign disposition |
| Fever with vomiting 3 times in 1 hour | RED in suspected/confirmed dengue warning-sign context | YELLOW | Frequency is not recognized as a warning-sign override |
| Fever with vomiting 4 times in 6 hours | RED in suspected/confirmed dengue warning-sign context | YELLOW | Frequency is not recognized as a warning-sign override |
| Inability to keep fluids down | YELLOW prompt review | YELLOW | Matches provisional routing |
| Child fever for 5 days (age 6) | YELLOW urgent review, not automatic emergency | RED | Likely over-escalated versus cited child-fever advice |
| Cough for 4 weeks | YELLOW clinical review | YELLOW | Review occurs through accumulated duration score; explicit >3-week rule is absent |
| Cough with chest pain | YELLOW urgent review | RED | May over-escalate an urgent appointment to emergency care |
| Diarrhoea for 8 days | YELLOW urgent review | RED | Likely over-escalated versus cited duration advice |
| Bleeding gums / confusion | RED escalation | RED | Matches provisional danger-sign routing |

Run it from `backend/`:

```powershell
python run_engine_smoketest.py
```

Nonzero exit is expected while any provisional case differs. Do not weaken the expected cases merely to make the smoke test pass.

## Actions required before changing production thresholds

1. Ask the MHO/physician to approve local urgency bands and referral destinations for each source-backed danger sign.
2. Resolve suspected-dengue context: define how the workflow identifies the population to which dengue warning-sign rules apply without diagnosing from symptoms alone.
3. Decide whether to implement the missing severe-abdominal-pain and persistent-vomiting escalation rules, then test exact boundaries and negated/near-match inputs.
4. Review whether existing fever and diarrhoea duration rules over-escalate; keep pediatric and adult rules distinct.
5. Add measured temperature, age in days/months, ability to drink, vomiting frequency, stool frequency, and relevant danger-sign questions only through an approved and privacy-reviewed workflow.
6. Validate all language aliases, especially new Bikol phrases, with local speakers and a clinician.
7. Build a retrospective, clinician-adjudicated Irosin test set and report false-negative and false-positive rates before any clinical deployment claim.

## Related project records

- [HealthGuard triage rule snapshot](./HEALTHGUARD_TRIAGE_RULES.md)
- [Physician rule validation report](./PHYSICIAN_RULE_VALIDATION_REPORT.md)
- [Source-backed assessment cases](./HEALTHGUARD_SOURCE_BACKED_TEST_CASES.md)
- [Source guide](./HEALTHGUARD_SOURCE_GUIDE.md)
