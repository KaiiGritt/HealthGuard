# Physician Validation Report: Triage Rules, Lexicon, and Guidance

**System:** IronGuard Health Assessment System  
**Document status:** Draft for physician and MHO review  
**Prepared on:** 2026-09-10  
**Clinical use status:** Not clinically approved until the signatories at the end of this document have completed their review  
**Source of truth reviewed:** `backend/app/nlp/rules.py`, `backend/app/nlp/lexicon.py`, `backend/app/seed.py`, `backend/app/nlp/engine.py`

> **Important:** This document describes the software's current behavior. It is a decision-support validation record, not a medical guideline and not a substitute for clinical judgment. A physician must verify every threshold, translation, escalation action, and medication statement before production use.

## 1. Review Scope

This report is intended for review by a physician, Municipal Health Officer (MHO), or other authorized clinical governance group. It covers:

- symptom recognition and bilingual English/Tagalog lexicon entries;
- score weights and risk thresholds;
- emergency, duration, wording, demographic, symptom-count, and vital-sign rules;
- medication and supportive-care guidance;
- the end-to-end analysis path and stored audit fields;
- test coverage and known gaps;
- approval, rejection, revision, and signatory records.

## 2. Executive Inventory

| Area | Current implementation | Clinical review required |
|---|---|---|
| Supported symptom lexicon | 31 entries mapping 7 medical terms, with English and Tagalog variants | Validate wording, meaning, spelling, dialect coverage, and false-positive risk |
| Selectable symptom chips | Fever, cough, headache, abdominal pain, vomiting, diarrhea, difficulty breathing | Confirm the list is appropriate for the intended population and workflow |
| Severity weights | 1 mild, 2 moderate, 4 high/urgent; difficulty breathing is seeded at 6 in the canonical lexicon | Confirm weight scale and whether weights should be calibrated using local data |
| Score thresholds | GREEN below 3; YELLOW at 3 or above; RED at 6 or above, with overrides | Confirm thresholds, exclusions, and boundary behavior |
| Rule outputs | Risk level, score, triggered rule names/descriptions, reason, recommendation, message | Confirm explanations are clinically accurate and understandable |
| Medication guidance | OTC-style symptom mappings for GREEN/YELLOW; blocked for RED and red flags | Physician/pharmacist review is mandatory before enabling or retaining medication content |
| Resident intake boundary | Symptom text or the seven symptom chips, with existing profile age/sex context | No vitals or pregnancy status are collected or used in the resident flow; adding them requires a separately approved BHW workflow |

## 3. Intended Clinical Boundary

The engine performs symptom triage and escalation support. It does **not** diagnose a disease, prescribe treatment, replace a consultation, or establish that a patient is safe. The application must continue to display a clear disclaimer and urgent-care instruction where appropriate.

The following decisions require explicit clinical governance:

1. whether the system is permitted to provide any medication-related guidance;
2. whether the terms and translations are sufficiently specific for the local population;
3. whether the RED/YELLOW/GREEN labels and actions are acceptable for community screening;
4. how a health worker should resolve conflicting, incomplete, or unreliable inputs;
5. how frequently the rules must be reviewed and who owns the next review.

## 4. Analysis and Audit Trail

The current processing path is:

1. Free text is normalized and matched against multi-word phrases and single-word tokens.
2. Selected symptom chips are resolved against canonical medical terms.
3. Duplicate medical terms are collapsed to one match.
4. Each match retains the medical term, matched text, language, category, and severity weight.
5. Optional scispaCy normalization is checked when available; the current classifier still uses the rule-based matches.
6. Negated symptom phrases are excluded from the active match set when a supported short negation immediately precedes the matched phrase.
7. The classifier evaluates the fixed precedence below and stores the risk level, score, reason, recommendation, and triggered rule names/descriptions.

### Fixed rule precedence

1. Remove directly negated symptom and severity/worsening phrases from active inputs.
2. Record closed-list red-flag matches and apply the difficulty-breathing emergency combination rule.
3. Calculate the weighted symptom score from active matches.
4. Apply duration and active severity/worsening language modifiers.
5. Apply the three-symptom escalation and four-symptom RED override.
6. Apply the age modifier and the no-supported-symptom YELLOW floor.
7. Resolve the final level: RED overrides YELLOW/GREEN, then YELLOW overrides GREEN; append explanation-only rules after classification.

The resident classifier has no vital-sign or pregnancy rule. Those inputs are intentionally rejected by the resident request schema because the current workflow does not collect them.

For every reviewed case, the physician should be able to answer: **What was entered? What was recognized? Which rules fired? What score and level resulted? Why was the recommendation shown?**

## 5. Lexicon Validation Register

Each entry below must be reviewed for semantic equivalence to the medical term, spelling, local usage, and unintended matches. `Weight` is the value used in scoring.

| # | Medical term | Local term | Language | Category | Weight | Physician decision / comment |
|---:|---|---|---|---|---:|---|
| 1 | fever | fever | en | general | 2 | |
| 2 | fever | lagnat | tl | general | 2 | |
| 3 | fever | may lagnat | tl | general | 2 | |
| 4 | fever | lumagnat | tl | general | 2 | |
| 5 | cough | cough | en | respiratory | 1 | |
| 6 | cough | ubo | tl | respiratory | 1 | |
| 7 | cough | may ubo | tl | respiratory | 1 | |
| 8 | cough | nakakaubo | tl | respiratory | 1 | |
| 9 | headache | headache | en | neurological | 1 | |
| 10 | headache | sakit ng ulo | tl | neurological | 1 | |
| 11 | headache | masakit ang ulo | tl | neurological | 1 | |
| 12 | headache | sakit ulo | tl | neurological | 1 | |
| 13 | abdominal pain | abdominal pain | en | gastrointestinal | 2 | |
| 14 | abdominal pain | sakit ng tiyan | tl | gastrointestinal | 2 | |
| 15 | abdominal pain | masakit ang tiyan | tl | gastrointestinal | 2 | |
| 16 | abdominal pain | sakit sa tiyan | tl | gastrointestinal | 2 | |
| 17 | abdominal pain | stomach ache | en | gastrointestinal | 2 | |
| 18 | vomiting | vomiting | en | gastrointestinal | 2 | |
| 19 | vomiting | pagsusuka | tl | gastrointestinal | 2 | |
| 20 | vomiting | nagsusuka | tl | gastrointestinal | 2 | |
| 21 | vomiting | sumusuka | tl | gastrointestinal | 2 | |
| 22 | vomiting | sumuka | tl | gastrointestinal | 2 | |
| 23 | diarrhea | diarrhea | en | gastrointestinal | 2 | |
| 24 | diarrhea | pagtatae | tl | gastrointestinal | 2 | |
| 25 | diarrhea | may pagtatae | tl | gastrointestinal | 2 | |
| 26 | difficulty breathing | difficulty breathing | en | respiratory | 6 | |
| 27 | difficulty breathing | shortness of breath | en | respiratory | 6 | |
| 28 | difficulty breathing | hirap huminga | tl | respiratory | 6 | |
| 29 | difficulty breathing | nahihirapang huminga | tl | respiratory | 6 | |
| 30 | difficulty breathing | hindi makahinga | tl | respiratory | 6 | |
| 31 | difficulty breathing | sumisikip ang paghinga | tl | respiratory | 6 | |

### Lexicon review questions

- Are all Tagalog terms clinically equivalent to the English canonical term?
- Are there terms that are too broad, ambiguous, colloquial, or likely to match harmless text?
- Are additional local languages or common spelling variants required?
- Should severity depend on age, pregnancy, duration, or context instead of a fixed term weight?
- Are the categories suitable for reporting and downstream analysis?

## 6. Triage Rule Validation Register

The rule names below are the current executable rule identifiers. Reviewers should test both the positive case and a nearby negative/boundary case.

| Rule ID / condition | Current behavior | Output effect | Physician decision / comment |
|---|---|---|---|
| `critical:<red-flag>` | A term from the closed list below is recognized in active (not negated) resident text | RED override, except the single-symptom breathing special case | |
| `difficulty-breathing-override` | Difficulty breathing alone is at least YELLOW; with another symptom it is RED | Escalates breathing combinations | |
| `high-severity-score` | Final score at least 6 | RED unless the single-breathing exception applies | |
| `moderate-severity-score` | Final score at least 3 and below RED conditions | YELLOW | |
| `mild-severity-score` | Final score below 3 | GREEN | |
| `weighted-symptom-score` | Adds each active matched symptom's severity weight | Changes the score and therefore can change the level | |
| `symptom-count-escalation` | Three or more distinct terms | Raises score-based level by one level | |
| `four-symptom-override` | Four or more distinct terms | RED regardless of score | |
| `unclear-symptoms-floor` | No supported symptom recognized | YELLOW, not GREEN | |
| `severe-or-worsening-language` | Text includes severe, worst, unbearable, cannot, unable, or sudden | Adds review rule; with selected critical terms can force emergency | |
| `worsening-symptoms` | Text includes worsening, getting worse, lumalala, or lumubha | Adds review score and explanation | |
| `persistent-diarrhea` | Diarrhea for at least 14 days | Adds review score | |
| `persistent-cough` | Cough for more than 30 days | Adds review score | |
| `persistent-fever` | Fever for more than 3 days | Adds review score | |
| `age-risk-modifier` | Age below 5 or above 65 | Adds 1 point | |

### Closed red-flag vocabulary

`critical:<red-flag>` can only be generated for the supported `difficulty breathing` term and its lexicon variants: `shortness of breath`, `hirap huminga`, `nahihirapang huminga`, `hindi makahinga`, and `sumisikip ang paghinga`. Unsupported terms such as chest pain, fainting, bloody stool, and severe dehydration are not recognized by the resident flow.

### Explanation-only rules

These rules do not change `risk_level` or `score`: `symptom-combination-score` records that two or more active medical terms were assessed together; `weighted-symptom-score` is classification-affecting because it reports the score that drives thresholds, while its text is explanatory.

### Threshold and conflict cases requiring explicit sign-off

| Case | Current behavior | Physician ruling |
|---|---|---|
| Single difficulty-breathing match with weight 6 | Classified YELLOW because the single-breathing exception prevents score RED | |
| Difficulty breathing plus any other recognized term | Classified RED | |
| Three symptoms with score below 3 | Score-based level is raised by one level | |
| Four symptoms with low weights | Classified RED | |
| No recognized symptom but text was submitted | Classified YELLOW | |
| Age exactly 5 or 65 | Does not trigger the age modifier | |
| Duration exactly 14 days for diarrhea | Triggers persistent diarrhea | |
| Duration exactly 30 days for cough | Does not trigger persistent cough; more than 30 is required | |
| Duration exactly 3 days for fever | Does not trigger persistent fever; more than 3 is required | |
| `I do not have severe pain` / `hindi na lumalala` | Negated severity/worsening wording is not escalated | |

## 7. Risk-Level Messages and Actions

| Level | Current message | Current recommendation | Physician validation |
|---|---|---|---|
| GREEN | Symptoms appear mild; continue monitoring | Rest, hydration, self-monitoring, and seek help if worsening | Confirm wording and whether GREEN is appropriate for the selected symptoms |
| YELLOW | Consultation may be needed | Contact Barangay Health Worker or visit RHU | Confirm response time and referral destination |
| RED | Seek immediate medical attention | Go to nearest hospital or call emergency services; do not delay | Confirm emergency wording, local emergency number, and transport guidance |

## 8. Medication and Supportive Guidance Review

Medication guidance is generated only for GREEN and YELLOW risk levels and is blocked for RED cases or recognized red-flag symptoms. The current mappings are:

| Trigger pattern | Current guidance | Required clinical review |
|---|---|---|
| Fever, optionally body ache/body pain/weakness | Paracetamol brands and adult dose wording | Verify age limits, maximum daily dose, liver disease/alcohol warnings, pregnancy, local product labeling, and whether brand names should be shown |
| Cough, optionally sore throat/throat pain/irritation | Cough Relief Support | Identify the exact permitted product or remove medicine implication; validate asthma, age, pregnancy, and drowsiness warnings |
| Nasal congestion/runny nose/stuffy nose/sneezing | Decongestant with mild pain relief | Verify hypertension, heart disease, thyroid disease, drug interactions, age limits, and the 3–7 day duration |
| Diarrhea, optionally cramps/discomfort | Oral Rehydration Salts + Symptom Relief | Verify whether anti-motility advice is appropriate, especially for children, fever, blood, dehydration, pregnancy, and suspected infection |
| Rash/itching/skin itch/allergic reaction | Antihistamine or topical soothing agent | Validate allergy severity screening, age and pregnancy restrictions, and whether “allergic reaction” is too broad |
| Muscle pain/body pain/joint pain, optionally weakness/soreness | Paracetamol or NSAID | Verify kidney, gastrointestinal, anticoagulant, pregnancy, age, and dose safety; determine whether NSAIDs may be mentioned at all |
| No specific OTC match | General Symptom Support | Confirm that this does not imply a medicine and that escalation advice is sufficient |

**Required medication approval fields:** approving physician/pharmacist, reference guideline or formulary, version/date, permitted population, contraindications, maximum duration, escalation criteria, and review expiry date.

## 9. Data Quality, Privacy, and Operational Controls

Physician reviewers should also verify:

- the system does not imply that resident users supplied measured vital signs;
- assessment date/time, method, and source are retained for audit;
- reports minimize personally identifiable information and use purpose-limited access;
- RED cases cannot be hidden by sorting, pagination, or export behavior;
- all rule changes have a version, author, reviewer, effective date, and rollback record;
- clinical content is reviewed after adverse events, guideline changes, or material model changes;
- the disclaimer is present in the user result, staff view, and exported report.

## 10. Verification Evidence

The current automated tests cover supported-input rejection, common symptom combinations, red-flag override, duration and worsening language, negated wording, scoring, symptom-count escalation, medication gating, and several medication mappings. The principal test locations are:

- `backend/tests/test_assessment_validation.py`
- `backend/tests/test_premedication_rules.py`
- `backend/tests/test_database_path.py`

Automated tests do not establish clinical validity. Before approval, the clinical review team should add or execute:

1. a complete lexicon phrase/negative-phrase test set reviewed by a Tagalog-speaking clinician;
2. boundary tests for every active threshold in Section 6;
3. age-, pediatric-, and comorbidity-specific medication tests; pregnancy-specific handling is out of scope until a privacy-reviewed field and workflow are approved;
4. conflicting-input tests, including free text versus selected chips;
5. representative retrospective cases with physician-adjudicated expected outcomes;
6. usability review of explanations and emergency instructions;
7. regression testing after every rule, lexicon, or medication change.

## 11. Findings Before Approval

| Finding | Severity for review | Owner | Resolution / reference |
|---|---|---|---|
| Rule thresholds are marked as draft in source comments | High: clinical calibration pending | MHO/physician | |
| Medication guidance includes product categories and adult dosing language | High: medication safety approval required | Physician + pharmacist | |
| Duration phrases are parsed from text and may be ambiguous | Medium: validate extraction examples | Engineering + physician | |
| No clinical gold-standard dataset is defined in the repository | High: sensitivity/specificity unknown | Clinical governance | |
| A signatory does not replace local regulatory, privacy, or emergency-service review | High: governance requirement | System owner | |
| Resident flow previously exposed uncollected vital-sign and pregnancy rule inputs | Blocking: removed from the resident API and classifier; a BHW/device workflow would require a separate scope decision | Engineering + adviser/MHO | |
| Red-flag vocabulary was not previously explicit | Blocking: closed vocabulary and free-text boundary are now documented in Section 6 | Engineering + physician | |
| Negation handling was not previously defined | Medium: short direct negation is handled; broader bilingual negation remains a stated limitation | Engineering + physician | |

## 12. Approval Decision

Select one decision for the current version:

- [ ] Approved for production clinical decision-support use
- [ ] Approved only for supervised pilot / shadow mode
- [ ] Conditionally approved pending listed actions
- [ ] Rejected; revision and repeat review required

**Conditions, required changes, or exclusions:**

______________________________________________________________________________

______________________________________________________________________________

______________________________________________________________________________

**Approved rule/lexicon version:** ____________________  
**Next mandatory review date:** ____________________  
**Incident or change-triggered review required:** Yes / No

## 13. Physician and Clinical Governance Signatories

At least one authorized physician must sign. Three signatories are provided for independent clinical review, MHO approval, and pharmacy/medication review where applicable.

### Signatory 1: Reviewing Physician

**Name:** _________________________________________________________________  
**Professional title / specialty:** ________________________________________  
**License / registration no.:** ____________________________________________  
**Organization / facility:** _______________________________________________  
**Decision:** Approved / Conditional / Rejected  
**Signature:** ____________________________________________________________  
**Date:** ____________________

### Signatory 2: Municipal Health Officer or Clinical Governance Lead

**Name:** _________________________________________________________________  
**Professional title:** ___________________________________________________  
**License / registration no. (if applicable):** _____________________________  
**Organization / facility:** _______________________________________________  
**Decision:** Approved / Conditional / Rejected  
**Signature:** ____________________________________________________________  
**Date:** ____________________

### Signatory 3: Pharmacist or Second Physician Reviewer

**Name:** _________________________________________________________________  
**Professional title / specialty:** ________________________________________  
**License / registration no.:** ____________________________________________  
**Organization / facility:** _______________________________________________  
**Medication/rule review scope:** _________________________________________  
**Decision:** Approved / Conditional / Rejected / Not applicable  
**Signature:** ____________________________________________________________  
**Date:** ____________________

## 14. Change Log

| Version | Date | Change summary | Prepared by | Clinical reviewer |
|---|---|---|---|---|
| 1.0-draft | 2026-09-10 | Initial inventory and physician validation template | Engineering | Pending |
