# HealthGuard Local QA and Safety Test Report

**Target:** `http://localhost:3000/assessment` (local workspace build)  
**Run date:** 2026-09-30  
**Scope:** 61 requested items: A1–A14, B1–B17, C1–C25, N1–N5. This records observed UI behavior only and is not medical advice.

**Follow-up change:** After this matrix was run, the adult form gained optional sex and pregnancy selectors. The new request fields and confirmed-pregnancy-with-fever review path were verified separately; the full 61-item matrix has not been rerun against that follow-up change.

**Follow-up change:** The child form now distinguishes ordinary vomiting from the S3 danger sign “vomits everything / cannot keep anything down.” Ordinary vomiting alone retains the symptom-only GREEN baseline; selecting the danger sign is RED. The C10 and C14 rows below record the pre-change behavior and have not been rerun.

**Follow-up change:** `matamlay` is now recognized as generalized weakness. Fever with generalized weakness in a patient older than 65 escalates to RED, preventing medication guidance. B10 records the pre-change behavior and has not been rerun as a browser case.

**Follow-up change:** An isolated cough lasting three days or less no longer reaches YELLOW from duration points alone. The B6 row records the pre-change behavior; the updated English and Tagalog engine cases return GREEN, while a seven-day cough remains YELLOW.

**Follow-up change:** Contradictory fever input now remains visible as an inline clarification until the user edits the text. The N2 row records the pre-change behavior; the exact Tagalog phrase was verified in the browser after five seconds.

**Follow-up change:** The child danger-sign chips for convulsions and very sleepy/difficult to wake now submit their canonical symptom terms. Both assessment endpoint cases return RED; C11 and C12 below record the pre-change 422 behavior.

## Method and limits

Each case began at a fresh assessment route. Adult free-text cases used age 30 where no numeric age was supplied because the adult form requires age to submit; explicit ages 70 and 78 were used when given. This is a test assumption, not a case-provided fact. At the time of this run there were no adult sex, pregnancy, or co-existing-condition fields. Child cases used the supplied age in years. There is no months field, so age 0 could not distinguish 2, 3, or 4 months. There is no child “vomits everything” chip.

Adult result timings below are elapsed time from fresh route navigation through result rendering. Child result timings are typically shorter. Unsupported inputs were recorded when the page showed its fallback or stayed on the form; an automation wait-for-navigation timeout is not counted as an app hang if a fallback appeared promptly. Browser zoom itself was not directly controllable, so N3 was approximated by testing a 683 CSS-pixel viewport (half of 1366 px). 1366, 1440, and 1920 px widths were separately checked.

Status definitions: `PASS`; `FAIL-DEFECT` for source-backed mismatches; `FAIL-DESIGN` for design-choice mismatches; `NEEDS REVIEW` for pending-physician mismatches; `NOT TESTABLE` where the requested control does not exist. The † sources below are excerpt-only; verify source before citing.

## Table 1: Triage and quality cases

Recommendation keys quote repeated result text verbatim: **R-RED:** “Go to the nearest hospital now / Pumunta agad sa pinakamalapit na ospital.” **R-YELLOW:** “Kumonsulta sa health worker.” Other fallback and bite wording is quoted in the row.

| ID | Flow / exact input | Returned / expected | Status | Basis / source | Detected; rules or score shown | Recommendation text / timing / notes |
|---|---|---|---|---|---|---|
| A1 | Adult: `lagnat 5 araw na hindi bumababa` | RED / RED | PASS | DESIGN CHOICE; none located | Fever; 5 days +3, score 5; prolonged-fever emergency rule | R-RED; 7.1s |
| A2 | Adult: `nagsusuka ng dugo` | RED / RED | PASS | DESIGN CHOICE; none located | Blood in vomit + vomiting; score 9; emergency warning | R-RED; 7.6s |
| A3 | Adult: `fever with stiff neck and severe headache` | RED / RED | PASS | DESIGN CHOICE; none located | Neurologic emergency, headache, fever; score 10; severe/sudden wording rule | R-RED; 7.6s |
| A4 | Adult: `lagnat 3 araw, may pasa at dumudugo ang gilagid` | RED / RED | PASS | DESIGN CHOICE; none located | Active bleeding + fever; duration 3 days +2, score 10 | R-RED; 7.9s; first attempt briefly showed “Assessment summary unavailable”; retry rendered the result |
| A5 | Child age 0 (3 months): Fever chip | RED / RED | PASS | PENDING PHYSICIAN; none located | Fever; age-risk modifier; no infant-specific explanation | R-RED; 1.1s; months unavailable; age entered as 0 years |
| A6 | Child age 2: Diarrhea + Unable to drink | RED / RED | PASS | SOURCE-BACKED; S3† | Diarrhea + unable to drink; emergency warning; score 11 | R-RED; 1.2s |
| A7 | Adult: `buntis ako 30 weeks, sumasakit ulo at nanlalabo paningin` | RED / RED | PASS | DESIGN CHOICE; none located | Pregnancy warning sign + headache; weeks not read as symptom duration; blurred vision not separately listed | R-RED; 7.9s; no pregnancy field |
| A8 | Adult: `may lagnt at ubu ako` | YELLOW / YELLOW | PASS | DESIGN CHOICE; S2 | Fever + cough | “visit the RHU / Kumonsulta sa BHW o pumunta sa RHU.”; 7.9s, under 10s |
| A9 | Adult: `nag-LBM ako at nasusuka` | YELLOW / YELLOW | PASS | DESIGN CHOICE; none located | Vomiting + diarrhea | R-YELLOW; 7.6s; loperamide/ORS category appeared |
| A10 | Adult: `hirap huminga pag umaakyat lang ng hagdan` | RED / YELLOW or RED | PASS | PENDING PHYSICIAN; none located | Difficulty breathing; emergency warning | R-RED; 7.6s |
| A11 | Adult: `masakit ang paa ko` | No level; fallback alert / visible fallback message | PASS | DESIGN CHOICE; S2 | No symptom recognized | “Hindi namin naintindihan ang sintomas. Pumili sa listahan o kumonsulta sa BHW. Kung may hirap huminga, sakit ng dibdib, o matinding pagdurugo, pumunta agad sa ospital o tumawag sa 911/117.”; about 2.1s |
| A12 | Adult: `nakagat ako ng aso kanina` | No level; bite referral message | PASS | SOURCE-BACKED; S6† | Bite intent detected by specialized fallback | “Hugasan ang kagat gamit ang sabon at umaagos na tubig nang hindi bababa sa 15 minuto. Pumunta sa Animal Bite Treatment Center o RHU ngayong araw. Huwag gumamit ng tambal, tandok, o bawang.”; visible within about 1.2s |
| A13 | Adult: `wala akong lagnat, wala akong ubo` | No level; visible fallback message | PASS | DESIGN CHOICE; S2 | No symptom recognized; no classification | Same fallback wording as A11; visible within about 1.2s |
| A14 | Adult: `sumasakit ang dibdib ko` | RED / RED | PASS | DESIGN CHOICE; none located | Chest pain; emergency warning; score 6 | R-RED; 7.9s |
| B1 | Adult: `itim ang dumi ko at masakit ang tiyan` | RED / RED | PASS | DESIGN CHOICE; none located | Black stool + abdominal pain; score 11; emergency warning | R-RED; 7.9s |
| B2 | Adult: `nagkaroon ng seizure at may lagnat` | RED / RED | PASS | DESIGN CHOICE; none located | Neurologic emergency + fever; score 8 | R-RED; 7.6s |
| B3 | Adult: `sobrang sakit ng ulo, biglaan, pinakamasakit sa buhay ko` | RED / RED | PASS | DESIGN CHOICE; none located | Thunderclap headache + headache; score 8 | R-RED; 7.7s |
| B4 | Adult: `sakit ng tiyan, lagnat at suka, 1 araw` | RED / RED | PASS | PENDING PHYSICIAN; S5† | Abdominal pain + fever; vomiting not listed; 1-day duration; score 8 | R-RED; 7.6s |
| B5 | Adult: `fever 3 days, headache, body pain` | YELLOW / YELLOW | PASS | PENDING PHYSICIAN; S4†, S1 | Fever + headache; body pain not listed; duration 3 days; score 6 | R-YELLOW; 7.7s; Paracetamol shown |
| B6 | Adult: `ubo 3 araw lang, walang lagnat` | YELLOW / GREEN | FAIL-DESIGN | DESIGN CHOICE; none located | Cough; duration 3 days +2; score 3 | R-YELLOW; 7.9s; over-triage |
| B7 | Adult: `pagtatae 4 araw na` | YELLOW / YELLOW | PASS | PENDING PHYSICIAN; none located | Diarrhea; duration 4 days +3; score 7 | R-YELLOW; 7.9s; loperamide/ORS category shown |
| B8 | Adult: `sakit ng ulo ko pero hindi ako nilalagnat` | GREEN / GREEN | PASS | DESIGN CHOICE; none located | Headache only; symptom-only GREEN baseline | “Home care and monitoring / Pahinga, uminom ng sapat na tubig, at obserbahan ang iyong pakiramdam.”; 7.6s; Paracetamol shown |
| B9 | Adult: `hypertensive ako, sakit ng ulo at hilo` | GREEN / YELLOW | NEEDS REVIEW | PENDING PHYSICIAN; S4† | Headache only; hypertension and dizziness not detected; symptom-only GREEN baseline | Green home-care wording; 7.9s; Paracetamol shown; under-triage |
| B10 | Adult, age 78: `lola ko 78, lagnat at ubo, matamlay` | YELLOW / RED | FAIL-DESIGN | DESIGN CHOICE; S4† | Fever + cough; age-risk modifier; matamlay not listed | R-YELLOW; 7.8s; Paracetamol shown; under-triage |
| B11 | Adult: `sakit ng ulo tsaka lagnat, pero hindi ako nag-ubo` | YELLOW / YELLOW | PASS | DESIGN CHOICE; none located | Headache + fever; cough correctly not detected; score 4 | R-YELLOW; 7.9s; Paracetamol shown |
| B12 | Adult: `cough` repeated about 60 times | GREEN / classified within 10s | PASS | DESIGN CHOICE; S2 | Cough once; symptom-only GREEN baseline | Green home-care wording; 7.8s; no crash; no medicine name shown |
| B13 | Adult: `masakit ang ulo ko <script>alert(1)</script>` | GREEN / GREEN, script must not run | PASS | DESIGN CHOICE; S2 | Headache; script markup not rendered/executed | Green home-care wording; 7.6s; no alert observed |
| B14 | Adult: empty input | No classification / clear prompt | PASS | DESIGN CHOICE; S2 | No symptom | Submit disabled; example placeholder visible; no result; under 1s |
| B15 | Child age 4: Cough chip | GREEN / GREEN | PASS | PENDING PHYSICIAN; S9† | Cough; age-risk modifier | Green home-care wording; 1.1s; no medicine shown |
| B16 | Child age 4: Fever + Diarrhea chips | YELLOW / note level | PASS | PENDING PHYSICIAN; S3†, S7† | Fever + diarrhea | R-YELLOW; 1.2s; ORS shown, no loperamide |
| B17 | Child age 1: Diarrhea chip | GREEN / note level | PASS | PENDING PHYSICIAN; S8† | Diarrhea; age-risk modifier | Green home-care wording; 1.0s; ORS shown; no zinc mention (GAP also logged under C18) |
| C1 | Adult: `lagnat 2 araw, masakit ang katawan` | YELLOW / GREEN or YELLOW | PASS | SOURCE-BACKED; S1 | Fever only; body pain not listed; 2-day duration; score 4 | R-YELLOW; 7.5s; Paracetamol only; no Ibuprofen, NSAID, or aspirin |
| C2 | Adult: `lagnat 4 araw at paulit-ulit na pagsusuka` | RED / at least YELLOW, preferably RED | PASS | PENDING PHYSICIAN; S5† | Fever + vomiting; 4-day duration; fever-duration review | R-RED; 7.6s |
| C3 | Adult: `lagnat 4 araw at matinding sakit ng tiyan` | RED / RED | PASS | PENDING PHYSICIAN; S5† | Fever + abdominal pain; 4-day duration; fever-duration review | R-RED; 7.8s; no medication section |
| C4 | Adult: `lagnat 4 araw` | YELLOW / note level | PASS | DESIGN CHOICE; none located | Fever; 4-day duration; fever-duration review; score 5 | R-YELLOW; 7.9s; Paracetamol shown |
| C5 | Adult: `lagnat 6 araw` | RED / RED | PASS | DESIGN CHOICE; none located | Fever; 6-day duration; prolonged-fever emergency rule | R-RED; 7.9s |
| C6 | Adult: `buntis ako, lagnat 1 araw` | YELLOW / at least YELLOW | PASS | PENDING PHYSICIAN; S4† | Fever only; pregnancy not separately listed; duration 1 day; score 3 | R-YELLOW; 7.9s; Paracetamol shown; no pregnancy field |
| C7 | Adult, age 70: `lolo ko 70, may diabetes, lagnat 1 araw` | YELLOW / at least YELLOW | PASS | PENDING PHYSICIAN; S4† | Fever; age-risk modifier; diabetes not detected; duration 1 day; score 4 | R-YELLOW; 7.6s; Paracetamol shown |
| C8 | Child age 0 (2 months): Fever chip | RED / RED | PASS | PENDING PHYSICIAN; S3† | Fever; age-risk modifier only | R-RED; 1.3s; months field unavailable; entered 0 years |
| C9 | Child age 0 (4 months): Fever chip | RED / note level | PASS | PENDING PHYSICIAN; none located | Fever; age-risk modifier only | R-RED; 1.1s; months field unavailable; entered 0 years |
| C10 | Child age 3: “vomits everything / cannot keep anything down” | No matching chip / RED if danger-sign chip present | NOT TESTABLE | SOURCE-BACKED; S3† | No “vomits everything” or “cannot keep anything down” chip exists; ordinary Vomiting chip is available | Not submitted as a substitute; no months/danger-detail field for this item |
| C11 | Child age 3: Convulsions chip | No level; generic fallback / RED | FAIL-DEFECT | SOURCE-BACKED; S3† | Convulsions chip selected, but service returned 422 and generic unrecognized-symptom alert | No result; “Hindi namin naintindihan ang sintomas…”; about 1.2s to fallback |
| C12 | Child age 3: Very sleepy or difficult to wake chip | No level; generic fallback / RED | FAIL-DEFECT | SOURCE-BACKED; S3† | Danger-sign chip selected, but service returned 422 and generic unrecognized-symptom alert | No result; “Hindi namin naintindihan ang sintomas…”; under 1s to fallback |
| C13 | Child age 3: Unable to drink chip | RED / RED | PASS | SOURCE-BACKED; S3† | Unable to drink; emergency warning | R-RED; 0.7s |
| C14 | Child age 3: Vomiting only | GREEN / not GREEN | FAIL-DESIGN | DESIGN CHOICE; S3† | Vomiting only; no danger-sign chip | Green home-care wording; ORS shown; 1.0s |
| C15 | Adult: `may dugo sa dumi at nagtatae ako` | RED / not GREEN | PASS | SOURCE-BACKED; S7† | Diarrhea + “Black Stool” (blood-in-stool wording was mapped to black stool) | R-RED; 7.5s; no medication section and no loperamide |
| C16 | Adult: `pagtatae 1 araw, walang lagnat` | YELLOW / GREEN (design target) | FAIL-DESIGN | DESIGN CHOICE; no source located; S7† does not specify an adult 1-day threshold | Diarrhea only; 1-day duration; score 5 | R-YELLOW; 7.9s; Loperamide or ORS category shown; over-triage against the stated design target |
| C17 | Adult: `pagtatae at lagnat` | YELLOW / no loperamide | PASS | PENDING PHYSICIAN; S7† | Diarrhea + fever; score 6 | R-YELLOW; 7.5s; ORS only; loperamide absent |
| C18 | Child age 3: Diarrhea chip | GREEN / ORS, no loperamide; note zinc/RHU mention | PASS | SOURCE-BACKED; S7†, S8† | Diarrhea | Green home-care wording; ORS shown; no loperamide; no zinc/RHU-for-zinc mention (GAP); 1.1s |
| C19 | Adult: `ubo 13 araw` | YELLOW / no TB referral | PASS | PENDING PHYSICIAN; none located | Cough; duration 13 days +4; score 5 | R-YELLOW; 7.9s; generic health-worker consult; no TB-specific referral or suppressant |
| C20 | Adult: `ubo 14 araw` | YELLOW / RHU TB screening; no suppressant | NEEDS REVIEW | PENDING PHYSICIAN; S11† | Cough; duration 14 days +4; score 5 | “Kumonsulta sa health worker.” only; no explicit RHU/TB screening referral; no suppressant; 7.6s |
| C21 | Adult: `ubo 15 araw` | YELLOW / RHU TB screening | NEEDS REVIEW | PENDING PHYSICIAN; S11† | Cough; duration 15 days +4; score 5 | “Kumonsulta sa health worker.” only; no explicit RHU/TB screening referral; no suppressant; 7.9s |
| C22 | Child age 1: Cough chip | GREEN / no cough-cold medicine | PASS | SOURCE-BACKED; S9† | Cough | Green home-care wording; no medicine shown; 2.2s |
| C23 | Child age 5: Cough chip | GREEN / record medicines shown | PASS | PENDING PHYSICIAN; S9† | Cough | Green home-care wording; no medicine shown; 1.4s |
| C24 | Adult: `nakagat ako ng aso` | No level; bite guidance | PASS | SOURCE-BACKED; S6† | Bite intent detected | Same exact 15-minute wash, same-day ABTC/RHU, and tambal/tandok/bawang warning as A12; visible within about 0.9s |
| C25 | Any RED result | RED results show 911; no 117 on result page | PASS | SOURCE-BACKED; S10†; local numbers PENDING PHYSICIAN | Tested across RED results | R-RED; result page shows emergency hotline 911 only. 117 is shown on assessment form as “Ambulance / rescue”, not as medical emergency number |
| N1 | Any RED: urgency wording/layout | Clear wording, not color alone | PASS | DESIGN CHOICE; S2 | RED badge + “High Risk — Urgent” + “Seek urgent medical help…” + hospital-now instruction | R-RED; textual alert is prominent |
| N2 | Adult: `may lagnat at wala akong lagnat` | No GREEN without clarification | FAIL-DESIGN | DESIGN CHOICE; S2 | No level returned; remained on form; no clarification/fallback visible after 15s | No recommendation; response exceeded 15s; no classification |
| N3 | Any result at 200% zoom | Text/buttons usable | PASS* | DESIGN CHOICE; S2 | Effective viewport approximated at 683 CSS px; main content had no horizontal overflow, clipped controls, or text overflow | Actual browser zoom factor not directly accessible; collapsed navigation had an “Open navigation” control |
| N4 | Any result at 1366, 1440, 1920 px | No clipping/overlap | PASS | DESIGN CHOICE; S2 | At all three widths: no document horizontal overflow; no clipped main content or detected text overflow | At 683 px the main content also had no horizontal overflow |
| N5 | Result, refresh, back | Result or clear restart | PASS | DESIGN CHOICE; S2 | GREEN result remained visible after refresh; browser Back returned to a fresh assessment form | A global “Assessment summary unavailable” alert appeared in a later layout pass while the full result remained visible; investigate stale alert behavior |

## Table 2: Medication audit

Rows cover every GREEN/YELLOW result. “None shown” means no medicine name/medicine section was visible. Exact loperamide warning text was: **“Ask a pharmacist or doctor before using loperamide, especially for a child or when fever or blood in stool is present.”** The result also repeatedly showed this general reminder verbatim: **“Check with a pharmacist, doctor, or qualified health worker before taking any medicine. This guide is not a substitute for a proper diagnosis.”** The loperamide warning is a contraindication-style list, despite the manuscript requirement not to show contraindication lists.

| ID | Level | Medicines shown (verbatim) | Rule violated | Basis / source | Notes |
|---|---|---|---|---|---|
| A8 | YELLOW | Paracetamol | None | SOURCE-BACKED; S1 | Generic name shown; fever present; no NSAID/aspirin |
| A9 | YELLOW | Loperamide or Oral Rehydration Solution (ORS) | 9 | DESIGN CHOICE; manuscript | No fever detected; loperamide warning text is a contraindication-style list |
| B5 | YELLOW | Paracetamol | None | SOURCE-BACKED; S1 | Generic name shown |
| B6 | YELLOW | None shown | None | DESIGN CHOICE | Cough only |
| B7 | YELLOW | Loperamide or Oral Rehydration Solution (ORS) | 9 | DESIGN CHOICE; manuscript | Warning list appeared |
| B8 | GREEN | Paracetamol | None | DESIGN CHOICE | Headache without fever; generic name shown |
| B9 | GREEN | Paracetamol | None | PENDING PHYSICIAN | Hypertension not detected; no decongestant |
| B10 | YELLOW | Paracetamol | None | SOURCE-BACKED; S1 | Generic name shown |
| B11 | YELLOW | Paracetamol | None | SOURCE-BACKED; S1 | Generic name shown |
| B12 | GREEN | None shown | None | DESIGN CHOICE | Repeated cough; no medicine name shown |
| B13 | GREEN | Paracetamol | None | DESIGN CHOICE | Headache; generic name shown |
| B15 | GREEN | None shown | None | PENDING PHYSICIAN; S9† | Child age 4 cough |
| B16 | YELLOW | Oral Rehydration Solution (ORS) | None | SOURCE-BACKED; S7† | Child flow; no loperamide |
| B17 | GREEN | Oral Rehydration Solution (ORS) | GAP: zinc | SOURCE-BACKED; S8† | No zinc or RHU visit for zinc mentioned |
| C1 | YELLOW | Paracetamol | None | SOURCE-BACKED; S1 | Only fever medicine shown; no Ibuprofen, NSAID, aspirin |
| C4 | YELLOW | Paracetamol | None | SOURCE-BACKED; S1 | Generic name shown |
| C6 | YELLOW | Paracetamol | None | SOURCE-BACKED; S1 | Generic name shown; pregnancy not separately detected |
| C7 | YELLOW | Paracetamol | None | SOURCE-BACKED; S1 | Generic name shown |
| C14 | GREEN | Oral Rehydration Solution (ORS) | None | DESIGN CHOICE | Vomiting-only child case |
| C16 | YELLOW | Loperamide or Oral Rehydration Solution (ORS) | 9 | DESIGN CHOICE; manuscript | Adult, no fever/blood; medicine itself within adult rule; contraindication-style warning shown |
| C17 | YELLOW | Oral Rehydration Solution (ORS) | None | PENDING PHYSICIAN; S7† | Fever detected; loperamide absent |
| C18 | GREEN | Oral Rehydration Solution (ORS) | GAP: zinc | SOURCE-BACKED; S8† | Child; no loperamide; no zinc/RHU-for-zinc mention |
| C19 | YELLOW | None shown | None | PENDING PHYSICIAN | No suppressant shown |
| C20 | YELLOW | None shown | None | PENDING PHYSICIAN; S11† | No suppressant shown; TB referral not explicit |
| C21 | YELLOW | None shown | None | PENDING PHYSICIAN; S11† | No suppressant shown; TB referral not explicit |
| C22 | GREEN | None shown | None | SOURCE-BACKED; S9† | Child under 2; no cough/cold medicine |
| C23 | GREEN | None shown | None | PENDING PHYSICIAN; S9† | Child 2–5; no medicine shown |

**Medication summary:** No Ibuprofen, NSAID, aspirin, loperamide on child/bloody-stool/fever results, decongestant, antihistamine, Dextromethorphan, Butamirate, antacid, or simethicone was observed. RED results had no medication section. No dosage, mg, or medicine-frequency numbers were observed. The only repeated safety reminder was the general reminder quoted above. Generic medicine names were shown for Paracetamol and ORS; no brand-only item was seen. No medicine trigger was unclear in the observed cases beyond the broad pre-medication panel.

## Results summary

- **Under-triage (returned a lower level than expected):** B9 GREEN vs YELLOW; B10 YELLOW vs RED; C14 GREEN where GREEN was explicitly disallowed. These are the most serious level mismatches.
- **Triage pass rate:** 50/61 PASS. Five FAIL-DESIGN cases: B6, B10, C14, C16, N2. Two FAIL-DEFECT cases: C11, C12. Three NEEDS REVIEW cases: B9, C20, C21. One NOT TESTABLE: C10.
- **Over-triage:** B6 YELLOW vs GREEN; C16 YELLOW vs design-target GREEN (not source-backed).
- **Response time:** Mean of completed classification results was approximately 6.06 seconds overall (adult mean 7.73s; child mean 1.20s). Maximum completed result was 7.95s. A8 typo and B12 repeated text completed under 10 seconds. No completed classification exceeded 10 seconds. N2 remained on the form without a result for more than 15 seconds. Unsupported symptom inputs A11/A13 and child C11/C12 produced fallback alerts promptly; their automation navigation waits were not app response times.
- **Console/network errors:** Repeated HTTP 401 “Failed to load resource” errors appeared on fresh routes, including assessment and result pages. HTTP 422 errors appeared for unsupported/unrecognized adult text and child convulsions/lethargy. No JavaScript exception or script execution was observed.
- **RED messaging and numbers:** Every rendered RED result tested showed “High Risk — Urgent”, “Seek urgent medical help / Humingi agad ng tulong medikal.” and R-RED. The result-page number was 911. The assessment form separately labels 117 “Ambulance / rescue”; RED result pages did not show 117.
- **Low-literacy observations:** Main labels and some key actions are bilingual, while result explanations and medicine names are mostly English. Numbered steps visibly skip from 2 to 4 on adult form; child form shows 1, 2, then 4, with step 3 appearing only in optional symptom-detail panels. Unsupported-input fallback is Tagalog-only. On narrow layout the navigation collapses behind “Open navigation”; the main result content remained within the viewport in the tested effective-width approximation.
- **Failures by cause:**
	- **Missed symptom:** B4 vomiting not listed; B9 hypertension/dizziness not detected (NEEDS REVIEW); B10 matamlay not listed; C7 diabetes not detected; C15 “dugo sa dumi” mapped to “Black Stool”; A7 blurred vision not separately listed.
	- **Duration:** B6 three-day cough and C16 one-day diarrhea returned YELLOW rather than their stated GREEN design targets. S7† does not establish the adult one-day diarrhea target. C20/C21 showed generic consult wording without the expected explicit TB-screening destination (NEEDS REVIEW).
	- **Negation:** N2 contradictory fever statement received no result or clarification. B11’s negated cough was correctly not detected.
	- **Typo:** A8 passed within 10 seconds.
	- **Age:** B10 age 78 returned YELLOW; child age 0 could not encode months. C10’s “vomits everything” danger-sign chip is absent.
	- **Pregnancy:** A7 returned RED but pregnancy field is unavailable; C6 reached YELLOW on fever while pregnancy was not separately listed.
	- **Fallback:** C11/C12 danger-sign chips reached generic fallback instead of RED. A11/A13 showed the generic fallback; A12/C24 showed the specialized bite message.
	- **Medication gating:** No prohibited medicine was detected. Three outputs (A9, B7, C16) showed the loperamide warning list, conflicting with the manuscript’s no-contraindication-list requirement. Two child-diarrhea outputs (B17, C18) had no zinc/RHU-for-zinc mention (GAP).
	- **Crash:** None observed.
	- **Emergency number:** No failure observed; result pages showed 911, not 117.
	- **Wording:** N2 had no clarification; RED urgency was explicit. Form step numbering and English-dominant result details may be unclear.
- **Medication violation count:** Three contraindication-style warning instances. Exact text: “Ask a pharmacist or doctor before using loperamide, especially for a child or when fever or blood in stool is present.” No dosage text or other prohibited medicine was observed.

## Needs physician sign-off

1. **B9:** Should a hypertensive adult with headache and dizziness be prevented from receiving GREEN and instead receive at least YELLOW? Yes/No. (S4†; verify source before citing.)
2. **C20:** Should an adult reporting cough for 14 days receive an explicit RHU/TB-screening referral, and should cough suppressants be excluded? Yes/No. (S11† is child-specific; verify source before citing.)
3. **C21:** Should an adult reporting cough for 15 days receive an explicit RHU/TB-screening referral? Yes/No. (S11† is child-specific; verify source before citing.)

## Cannot source yet

- DOH Dengue Clinical Management Guidelines PDF for dengue rules.
- NTP Manual of Procedures, 6th edition, adult TB threshold.
- FDA Philippines advisories for cough/cold medicine age cutoffs.
- Philippine National Formulary.
- DOH list of licensed Animal Bite Treatment Centers for Sorsogon.

## Source note

Only sources S1–S11 supplied in the test brief were used. † means the source was available only as a search excerpt; verify source before citing. Cases marked “none located” have no source claimed.
