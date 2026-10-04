# HealthGuard Local Browser QA Report

Test date: 2026-10-02  
Target: `http://localhost:3000/assessment` and `/assessment/child`  
Method: fresh page for each case; adult exact free-text entry, child age and chip selections. No clinical reinterpretation. Source IDs below are only those supplied in the test brief.

The adult test instructions name “Prefer to type it instead?”; the current control is labeled “Other symptoms not listed? Describe them” and opens the same text-entry path. Guest adult submission requires age even though the age section says “Optional details.” Cases without a supplied patient age were left blank and blocked, never assigned an assumed age. Pregnancy was set to Yes where specified. Diabetes and hypertension had no separate input fields.

## Table 1: Triage

`—` means no result was returned. For blocked cases, recommendation and response time are not applicable.

| ID | Flow | Exact input / selection | Rule | Level returned | Expected minimum | Status | Basis | Source | Symptoms detected | Recommendation text (verbatim) | Seconds | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| F01 | Adult | `may lagnat ako 2 araw, sakit ng ulo at masakit ang katawan` | R5, R7 | — | GREEN or YELLOW; paracetamol only | BLOCKED | SOURCE-BACKED | D1, D2 | — | No result | — | Age missing; submit disabled. |
| F02 | Adult | `lagnat 3 araw at paulit-ulit na pagsusuka` | R1 | — | RED | BLOCKED | SOURCE-BACKED | D1 | — | No result | — | Age missing; submit disabled. |
| F03 | Adult | `lagnat 3 araw at matinding sakit ng tiyan` | R1 | — | RED | BLOCKED | SOURCE-BACKED | D1 | — | No result | — | Age missing; submit disabled. |
| F04 | Adult | `lagnat 3 araw, dumudugo ang gilagid` | R1 | — | RED | BLOCKED | SOURCE-BACKED | D1 | — | No result | — | Age missing; submit disabled. |
| F05 | Adult | `lagnat 3 araw, itim ang dumi ko` | R2 | — | RED | BLOCKED | SOURCE-BACKED | D1 | — | No result | — | Age missing; submit disabled. |
| F06 | Adult | `lagnat 3 araw, matamlay at hindi mapakali` | R1 | — | RED | BLOCKED | SOURCE-BACKED | D1 | — | No result | — | Age missing; submit disabled. |
| F07 | Adult | `lagnat at nagkaroon ng seizure` | R3 | — | RED | BLOCKED | SOURCE-BACKED | D1 | — | No result | — | Age missing; submit disabled. |
| F08 | Adult, pregnant | `buntis ako, lagnat 2 araw, sakit ng ulo at katawan`; pregnancy Yes | R4 | — | RED | BLOCKED | SOURCE-BACKED (level mapping) | D1 Group B | — | No result | — | Pregnancy set; age missing; submit disabled. |
| F09 | Adult, age 70 | `lagnat 2 araw, sakit ng ulo at katawan` | R4 | YELLOW | RED | FAIL-UNDER | SOURCE-BACKED (level mapping) | D1 Group B | Headache; Fever | See a Barangay Health Worker or visit the RHU / Kumonsulta sa BHW o pumunta sa RHU. Contact your Barangay Health Worker or visit the Rural Health Unit (RHU). | 7.34 | The result applied an age-risk modifier but stayed YELLOW. “sakit ng katawan” was not in the detected condition summary. |
| F10 | Adult, diabetic | `may diabetes ako, lagnat 2 araw, sakit ng ulo at katawan` | R4 | — | RED | BLOCKED | SOURCE-BACKED (level mapping) | D1 Group B | — | No result | — | Diabetes entered in text; age missing; submit disabled. |
| F11 | Child, age 0 (8 months) | Age `0`; Fever chip | R4 | RED | RED | PASS | SOURCE-BACKED (level mapping) | D1 Group B | Fever | Go to the nearest hospital now / Pumunta agad sa pinakamalapit na ospital. | 0.44 | Result displayed 911; no medication section. |
| F12 | Adult | `lagnat 14 araw na` | R6 | — | At least YELLOW | BLOCKED | SOURCE-BACKED | T1 | — | No result | — | Age missing; submit disabled. |
| F13 | Adult, hypertensive | `hypertensive ako, lagnat 2 araw, sakit ng ulo at katawan` | Record level | — | Record level | BLOCKED | PENDING PHYSICIAN | D1 | — | No result | — | Age missing; submit disabled. Hypertension was entered in text; no separate conditions field. |
| K01 | Child, age 4 | Age `4`; danger-sign chip `Unable to drink` | R8 | RED | RED | PASS | SOURCE-BACKED | I1 | Unable To Drink | Go to the nearest hospital now / Pumunta agad sa pinakamalapit na ospital. | 0.43 | 911 shown; 117 absent; no medication section. |
| K02 | Child, age 4 | Age `4`; danger-sign chip `Vomits everything / cannot keep anything down` | R8 | RED | RED | PASS | SOURCE-BACKED | I1 | Vomits Everything | Go to the nearest hospital now / Pumunta agad sa pinakamalapit na ospital. | 0.40 | 911 shown; 117 absent; no medication section. |
| K03 | Child, age 4 | Age `4`; danger-sign chip `Convulsions` | R8 | RED | RED | PASS | SOURCE-BACKED | I1 | Neurologic Emergency | Go to the nearest hospital now / Pumunta agad sa pinakamalapit na ospital. | 0.43 | 911 shown; 117 absent; no medication section. |
| K04 | Child, age 4 | Age `4`; danger-sign chip `Very sleepy or difficult to wake` | R8 | RED | RED | PASS | SOURCE-BACKED | I1 | Altered Consciousness | Go to the nearest hospital now / Pumunta agad sa pinakamalapit na ospital. | 0.41 | 911 shown; 117 absent; no medication section. |
| K05 | Child, age 0 (1 month) | Age `0`; Fever chip | R9 | RED | RED | PASS | SOURCE-BACKED | I2 | Fever | Go to the nearest hospital now / Pumunta agad sa pinakamalapit na ospital. | 0.47 | 911 shown. Age field has no months unit, so exact month age cannot be distinguished. |
| K06 | Child, age 0 (2 months) | Age `0`; Fever chip | R9 | RED | RED | PASS | SOURCE-BACKED | I2 | Fever | Go to the nearest hospital now / Pumunta agad sa pinakamalapit na ospital. | 0.44 | 911 shown. Same `0` input as K05; month boundary cannot be verified in this field. |
| K07 | Child, age 0 (3 months) | Age `0`; Fever chip | Record only | RED | Record level | RECORDED | DESIGN CHOICE | I2 | Fever | Go to the nearest hospital now / Pumunta agad sa pinakamalapit na ospital. | 0.55 | Observation only; not scored. Field cannot represent months. 911 shown. |
| K08 | Child, age 4 | Age `4`; Fever + Diarrhea chips | R7, R12, R13 | YELLOW | Medication checks; no level specified | RECORDED | SOURCE-BACKED | D2, S7, S8 | Fever; Diarrhea | See a Barangay Health Worker or visit the RHU / Kumonsulta sa BHW o pumunta sa RHU. Contact your Barangay Health Worker or visit the Rural Health Unit (RHU). | 0.39 | ORS shown; no loperamide/NSAID; no zinc or zinc referral (M4 gap). |
| G01 | Adult | `pagtatae 1 araw, walang lagnat, walang dugo` | R7, R12 | — | GREEN; ORS; loperamide allowed but not required | BLOCKED | SOURCE-BACKED | S7 | — | No result | — | Age missing; submit disabled. |
| G02 | Adult | `may dugo sa dumi at nagtatae ako` | R12 | — | Loperamide must not appear; level at least YELLOW is a design choice | BLOCKED | SOURCE-BACKED (medicine); DESIGN CHOICE (level) | S7 | — | No result | — | Age missing; submit disabled. |
| G03 | Child, age 3 | Age `3`; Diarrhea chip | R12, R13 | GREEN | ORS + zinc or zinc referral; no loperamide | RECORDED | SOURCE-BACKED | S7, S8 | Diarrhea | Home care and monitoring / Pahinga, uminom ng sapat na tubig, at obserbahan ang iyong pakiramdam. Rest, stay hydrated, and self-monitor. Seek help if symptoms worsen. | 0.43 | ORS shown; no loperamide; no zinc or zinc referral (M4 gap). |
| G04 | Child, age 3 | Age `3`; Diarrhea + `Unable to drink` | R8 | RED | RED | PASS | SOURCE-BACKED | I1 | Diarrhea; Unable To Drink | Go to the nearest hospital now / Pumunta agad sa pinakamalapit na ospital. | 0.38 | 911 shown; 117 absent; no medication section. |
| G05 | Adult | `pagtatae at lagnat` | Record medication | — | Loperamide not shown | BLOCKED | PENDING PHYSICIAN | S7 | — | No result | — | Age missing; submit disabled. |
| H01 | Adult | `ubo 14 araw na` | R10 | — | At least YELLOW; TB screening referral; no cough suppressant | BLOCKED | SOURCE-BACKED | T1 | — | No result | — | Age missing; submit disabled. |
| H02 | Adult | `ubo 13 araw` | R10 | — | TB referral not required below threshold | BLOCKED | SOURCE-BACKED | T1 | — | No result | — | Age missing; submit disabled. |
| H03 | Adult | `ubo 15 araw` | R10 | — | At least YELLOW; TB screening referral | BLOCKED | SOURCE-BACKED | T1 | — | No result | — | Age missing; submit disabled. |
| H04 | Adult | `ubo 3 araw lang, walang lagnat` | Record level | — | GREEN | BLOCKED | DESIGN CHOICE | None | — | No result | — | Age missing; submit disabled. |
| H05 | Child, age 1 | Age `1`; Cough chip | R14 | GREEN | No listed cough/cold products under 2 | RECORDED | SOURCE-BACKED (US FDA only) | S9 | Cough | Home care and monitoring / Pahinga, uminom ng sapat na tubig, at obserbahan ang iyong pakiramdam. Rest, stay hydrated, and self-monitor. Seek help if symptoms worsen. | 0.41 | No medication section or cough/cold product shown. |
| P01 | Adult, pregnant, 30 weeks gestational age | `buntis ako 30 weeks, sumasakit ang ulo at nanlalabo ang paningin`; pregnancy Yes | R11 | — | RED | BLOCKED | SOURCE-BACKED | P1 | — | No result | — | Pregnancy set; 30 weeks retained as gestational age; patient age missing; submit disabled. |
| P02 | Adult, pregnant | `buntis ako, sumasakit ang ulo`; pregnancy Yes | Record level | — | Record level | BLOCKED | PENDING PHYSICIAN | P1 | — | No result | — | Pregnancy set; patient age missing; submit disabled. |
| P03 | Adult, pregnant | `buntis ako, masakit ang sikmura at nagsusuka`; pregnancy Yes | Record level | — | Record level | BLOCKED | PENDING PHYSICIAN | P1 | — | No result | — | Pregnancy set; patient age missing; submit disabled. |
| B01 | Adult | `nakagat ako ng aso kanina` | R15 | — | Same-day Animal Bite Treatment Center | BLOCKED | SOURCE-BACKED | S6 | — | No result | — | Age missing; submit disabled. |
| B02 | Adult | `nakagat ako ng aso kanina` | R15 | — | Wash with soap and running water at least 15 minutes | BLOCKED | SOURCE-BACKED | S6 | — | No result | — | Age missing; submit disabled. |
| B03 | Adult | `nakagat ako ng aso kanina` | R15 | — | Discourage tambal, tandok, garlic | BLOCKED | SOURCE-BACKED | S6 | — | No result | — | Age missing; submit disabled. |
| E01 | Any RED result | Observed all returned RED pages | R16 | RED pages showed 911 | 911 shown | PASS | SOURCE-BACKED | S10 | N/A | “EMERGENCY HOTLINE 911” appeared on the result page. | N/A | Observed on 9 RED results. |
| E02 | Any RED result | Observed all returned RED pages | R16 | 117 absent from result pages | 117 not shown as medical number | RECORDED | SOURCE-BACKED (117); PENDING PHYSICIAN (local number) | S10 | N/A | Result page showed 911; no 117 or local RHU/MDRRMO number. | N/A | Assessment entry page separately displayed 117 as “Ambulance / rescue”; result pages did not. |
| N01 | Adult, empty | No symptoms entered | S2 | No classification | Clear prompt; no classification | RECORDED | DESIGN CHOICE | S2 | None | No result; page prompt: “Tap what you're feeling, then tap when it started.” Submit disabled. | N/A | No assessment was submitted. |
| N02 | Adult, contradictory | `may lagnat at wala akong lagnat` | S2 | — | Never silently GREEN | BLOCKED | DESIGN CHOICE | S2 | — | No result | — | Age missing; submit disabled; no classification returned. |
| X01 | Adult observation | `sumasakit ang dibdib ko` | Observation only | — | Record level | BLOCKED | OBSERVATION ONLY | None | — | No result | — | Age missing; submit disabled. |
| X02 | Adult observation | `sobrang sakit ng ulo, biglaan, pinakamasakit sa buhay ko` | Observation only | — | Record level | BLOCKED | OBSERVATION ONLY | None | — | No result | — | Age missing; submit disabled. |
| X03 | Adult observation | `lagnat at matigas ang leeg` | Observation only | — | Record level | BLOCKED | OBSERVATION ONLY | None | — | No result | — | Age missing; submit disabled. |
| X04 | Adult observation | `hypertensive ako, sakit ng ulo at hilo` | Observation only | — | Record level | BLOCKED | OBSERVATION ONLY | None | — | No result | — | Age missing; submit disabled. |
| X05 | Adult observation | `hirap huminga pag umaakyat lang ng hagdan` | Observation only | — | Record level | BLOCKED | OBSERVATION ONLY | None | — | No result | — | Age missing; submit disabled. |
| X06 | Adult observation | `lagnat 4 araw, walang ibang sintomas` | Observation only | — | Record level | BLOCKED | OBSERVATION ONLY | None | — | No result | — | Age missing; submit disabled. |
| X07 | Adult observation | `lagnat 5 araw na hindi bumababa, walang ibang sintomas` | Observation only | — | Record level | BLOCKED | OBSERVATION ONLY | None | — | No result | — | Age missing; submit disabled. |
| X08 | Adult observation | `sakit ng tiyan at lagnat at suka, 1 araw` | Observation only | — | Record level | BLOCKED | OBSERVATION ONLY | None | — | No result | — | Age missing; submit disabled. |

## Table 2: Medication

| ID | Level | Medicines shown (verbatim) | Rule violated | Basis | Source | Notes |
|---|---|---|---|---|---|---|
| F09 | YELLOW | `Paracetamol`; SIDE EFFECTS: Stomach upset; Nausea; Drowsiness. PRECAUTIONS: “Ask a pharmacist or doctor which option is appropriate before use.” IMPORTANT NOTE: “Check with a pharmacist, doctor, or qualified health worker before taking any medicine. This guide is not a substitute for a proper diagnosis.” | None observed for M1, M6, M7 | SOURCE-BACKED / manuscript claim | D1, D2 | Fever present; no ibuprofen, NSAID, aspirin, dosage, frequency, or contraindication list shown. |
| K08 | YELLOW | `Oral Rehydration Solution (ORS)`; SIDE EFFECTS: Nausea; Temporary bloating. PRECAUTIONS: “Seek urgent care for signs of dehydration, persistent vomiting, or worsening diarrhea.” Same IMPORTANT NOTE as F09. | M4: zinc or zinc referral absent | SOURCE-BACKED | S8 | No loperamide or NSAID shown. |
| G03 | GREEN | `Oral Rehydration Solution (ORS)`; SIDE EFFECTS: Nausea; Temporary bloating. PRECAUTIONS: “Seek urgent care for signs of dehydration, persistent vomiting, or worsening diarrhea.” Same IMPORTANT NOTE as F09. | M4: zinc or zinc referral absent | SOURCE-BACKED | S8 | No loperamide shown. |
| H05 | GREEN | None; no medication section | None observed for M3 | SOURCE-BACKED (US FDA only) | S9 | Age 1; no cough/cold product shown. |
| RED results | RED | No medication section on F11, K01–K06, G04, or K07 | None observed for M5 | DESIGN CHOICE | None | M5 is not included in sourced accuracy. |

Medication violations total: **2**, both M4 (G03 and K08). No loperamide, ibuprofen, NSAID, aspirin, dosage/frequency number, or contraindication list appeared in the captured medication guidance. RED pages had no medication section. The general pharmacist/qualified-health-worker reminder appeared verbatim in the medication sections that were present.

## Findings

**Under-triage (source-backed, first):** F09. Exact input: `lagnat 2 araw, sakit ng ulo at katawan`. The result was YELLOW, below expected minimum RED. The detected condition summary contained Fever and Headache, but not body pain. The result text said the age-risk modifier increased urgency, yet classification remained YELLOW.

**Over-triage:** None among the executed cases with a defined minimum level.

**Failure causes:**

- Missed symptom / risk combination: F09; “sakit ng katawan” was not detected and age 70 plus the resulting fever/headache set returned YELLOW rather than the specified RED minimum.
- Medication: G03 and K08; zinc or referral for zinc was absent (M4).
- No other source-backed failure was observed in the cases that returned results. The other adult source-backed scenarios were BLOCKED, not scored.

**Sourced accuracy:** 9 PASS / 12 executed SOURCE-BACKED case checks = **75%**, counting case-specific medication criteria as well as triage. For the subset with an explicit expected triage minimum, 8 PASS / 9 run = **88.9%**. The 33 adult cases blocked by the required age field are excluded. These figures use the supplied care-level mapping, which is a design assumption and needs physician confirmation.

## Observation Only

| ID | System observation | Scoring |
|---|---|---|
| X01–X08 | Each exact input was entered on a fresh adult page; no age was supplied in its case. Submit stayed disabled, so no level or recommendation was returned. | No pass/fail; BLOCKED before assessment. |
| K07 | Age `0` + Fever returned RED, with “Go to the nearest hospital now” and 911. The form does not represent months. | Record only; not scored. |

## Timing And Errors

- 13 submitted assessments had usable result pages. Mean time from submit click to visible level: **0.96 seconds**. Maximum: **7.34 seconds** (F09). None exceeded 10 seconds or hung. Blocked cases have no response time.
- Repeated console/network errors: `401 Unauthorized` from `GET /backend/auth/me` while using guest pages. Assessment submissions and returned guest results succeeded for submitted cases; no assessment-submit 401 was observed.
- One intermediate browser snapshot showed the alert “Assessment summary unavailable” while a RED result body was visible. Subsequent captured result pages had an empty alert; treat this as a transient UI inconsistency.
- Every observed RED result showed “Go to the nearest hospital now” and 911. Result pages did not show 117. The adult assessment entry page did separately display 117 as “Ambulance / rescue.”

## Needs Physician Sign-Off

Please answer yes/no for the municipal health officer:

- Should the source care-level mapping used here remain: in-hospital/urgent-hospital referral means minimum RED, while “send home with advice” permits GREEN or YELLOW?
- Should hypertension with fever and the listed dengue-pattern symptoms change referral urgency, given D1 lists hypertension in history but not its Group B criteria?
- With fever and diarrhea, should loperamide be withheld pending local guidance?
- In pregnancy, should severe headache alone trigger urgent referral?
- In pregnancy, should epigastric pain plus vomiting alone trigger urgent referral?
- Should a local RHU/MDRRMO number appear on RED results in addition to 911? If yes, which approved number should be displayed?

## Cannot Source Yet

- DOH original of the 2011 dengue guideline; D1 is a secondary summary.
- NTP Manual of Procedures, 6th edition; confirm whether AO 2020-0056 remains applicable.
- FDA Philippines advisory on cough/cold age limits.
- Philippine sourcing for the chest-pain, worst-ever headache, and stiff-neck rules.
- Philippine National Formulary.
- Verify the excerpt-only sources marked † in the supplied brief before citing them.