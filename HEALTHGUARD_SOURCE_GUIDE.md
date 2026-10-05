# HealthGuard Source Guide

**Prepared:** 2026-10-04  
**Scope:** Sources cited in [HEALTHGUARD_SOURCE_BACKED_TEST_CASES.md](HEALTHGUARD_SOURCE_BACKED_TEST_CASES.md). This guide summarizes what each source was used to check and important limits. It is not clinical advice, a treatment protocol, or approval for patient care.

## How to Use This Guide

- A source supports only the specific statement listed below; it does not validate the complete HealthGuard classifier.
- A published instruction such as “seek urgent advice” does not automatically mean HealthGuard must return RED. The GREEN/YELLOW/RED mapping is a separate product rule that needs local clinician approval.
- U.S. and UK recommendations are not Philippine policy. Confirm local facilities, escalation language, and medication guidance with the municipal health office.
- `PENDING` means the cited material did not establish the exact rule during review. Do not score that expectation as source-backed until the cited page or document is checked directly.
- Language and orthography sources establish spelling or dialect context, not medical urgency or treatment.

## Dengue, Maternal, and Emergency Guidance

| ID | Source | What it supports | Limits / status |
|---|---|---|---|
| S1 | CDC, [Clinical Care of Dengue](https://www.cdc.gov/dengue/hcp/clinical-care/index.html) | Lists dengue warning signs including severe abdominal pain/tenderness, persistent vomiting (at least 3 episodes in 1 hour or 4 in 6 hours), mucosal bleeding, and altered mental status; says dengue patients with warning signs should be managed as inpatients. | CDC guidance is not Philippine policy. Mapping inpatient care to HealthGuard RED is a test-design assumption requiring physician sign-off. |
| S2 | CDC, [Guidelines for Classifying Dengue](https://www.cdc.gov/dengue/hcp/clinical-signs/guidelines.html) | Presents warning-sign and severe-dengue classifications, including impaired consciousness. | Reproduces WHO classification; it does not approve HealthGuard’s colors or local referral text. |
| S3 | WHO/TDR, [Dengue: Guidelines for Diagnosis, Treatment, Prevention and Control](https://www.who.int/publications/i/item/9789241547871) | Official publication record for WHO’s 2009 dengue guideline; useful as the primary background document for dengue classification and care. | The precise details used for tests were taken from directly accessible CDC pages S1/S2; do not cite the publication record alone as proof of a specific threshold. |
| S11 | WHO, [Dengue Guidelines](https://www.who.int/publications/i/item/9789241547871), and [Clinical Management of Arboviral Diseases](https://www.who.int/publications/i/item/9789240111110) | Publication records relate to medication decisions during suspected or confirmed arboviral disease. | The specific recommendation table was indexed but could not be directly inspected due to an access check. Medication test M01 remains pending. |
| S13 | WHO, [Recommendations for Prevention and Treatment of Pre-eclampsia and Eclampsia](https://www.who.int/publications/i/item/9789241548335) | Background publication for pregnancy-related care. | The page reviewed did not establish that headache, visual symptoms, epigastric pain, or vomiting alone require RED. Pregnancy symptom-to-color expectations need physician review. |
| S14 | Philippines Executive Order No. 56 (2018), [LawPhil transcription](https://lawphil.net/executive/execord/eo2018/eo_56_2018.html) | Secondary transcription identifies the order with nationwide 911 and replacement of Patrol 117. | LawPhil is not the Official Gazette. Official text and approved Irosin emergency numbers were not verified; emergency-number tests remain pending. |

## Child Health, Diarrhea, and Medication Evidence

| ID | Source | What it supports | Limits / status |
|---|---|---|---|
| S4 | WHO, [Integrated Management of Childhood Illness chart booklet](https://www.who.int/publications/i/item/9789241506823) | Official WHO page links IMCI materials, including a chart booklet and general danger-sign module. | The exact danger-sign chart rows for “unable to drink” and “vomits everything” were not directly verified in the downloaded chart during this review. Those exact RED expectations remain pending. |
| S5 | WHO/UNICEF, [Management of the Sick Young Infant Aged Up to 2 Months: Chart Booklet](https://www.who.int/publications/i/item/9789241516365) | Establishes a special young-infant guidance band through 2 months and a 2019 update. | The measured-temperature criterion must be checked in the chart itself. HealthGuard currently has a Fever chip but no temperature field, so the exact threshold cannot be tested in the UI. |
| S6 | WHO, [The Treatment of Diarrhoea](https://www.who.int/publications/i/item/9241593180) | WHO manual describes low-osmolarity oral rehydration solution (ORS), zinc for childhood diarrhea, and management of bloody diarrhea. | Publication is from 2005; check current Philippine guidance and clinician approval before making dosing or local-treatment claims. |
| S7 | WHO eLENA, [Zinc Supplementation in the Management of Diarrhoea](https://www.who.int/tools/elena/bbc/zinc-diarrhoea) | Recommends zinc for 10–14 days for children with diarrhea, with age-specific amounts described on the page. | Test cases check whether zinc is mentioned, not whether a dosage is displayed. Confirm local policy before adding dosage advice. |
| S8 | Li, Grossman, Cummings, [Loperamide Therapy for Acute Diarrhea in Children: Systematic Review and Meta-Analysis](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.0040098), PLOS Medicine, 2007 | Pediatric review concludes risks outweigh benefits for children under 3, children with bloody diarrhea, and children with moderate/severe dehydration or systemic illness; discusses possible adjunct use in older children without/minimal dehydration. | Pediatric evidence only; do not generalize it to adult cases. |
| S18 | NHS, [Diarrhoea and vomiting](https://www.nhs.uk/conditions/diarrhoea-and-vomiting/) | Advises small sips when nauseated; urgent advice for inability to keep fluids down, bloody diarrhea, vomiting over 2 days, or diarrhea over 7 days; immediate emergency help for blood/coffee-ground or green vomit. | UK NHS 111/999 pathway; it does not directly specify Irosin facilities or HealthGuard colors. Page reviewed December 21, 2023. |
| S19 | U.S. NIDDK, [Symptoms & Causes of Diarrhea](https://www.niddk.nih.gov/health-information/digestive-diseases/diarrhea/symptoms-causes) | Defines diarrhea symptoms; lists dehydration signs including dry mouth, reduced urination, dark urine, dizziness, and no wet diapers for 3 hours in young children. Advises medical contact for specified stool counts/durations, frequent vomiting, blood/pus/black stool, severe pain, or dehydration. | U.S. guidance, not Philippine policy. Thresholds in this source should not be silently converted into local RED rules. Last reviewed September 2024. |
| S20 | U.S. NIDDK, [Treatment of Diarrhea](https://www.niddk.nih.gov/health-information/digestive-diseases/diarrhea/treatment) | Supports replacing fluids and electrolytes, including ORS; says clinicians typically advise against OTC antidiarrheals for infants/children or people with bloody stools or fever. | U.S. guidance; pediatric medication rules should be checked against current WHO and Philippine guidance. Last reviewed September 2024. |

## Cough and Headache

| ID | Source | What it supports | Limits / status |
|---|---|---|---|
| S9 | U.S. FDA, [Use Caution When Giving Cough and Cold Products to Kids](https://www.fda.gov/drugs/special-features/use-caution-when-giving-cough-and-cold-products-kids) | Says children under 2 should not receive cough/cold products containing a decongestant or antihistamine; product labels commonly say not to use under 4. | U.S. FDA guidance, not Philippine FDA policy. It is not a blanket prohibition on every cough medicine. |
| S12 | Philippines DOH National TB Control Program, [NTP Manual of Procedures, 6th Edition](https://ntp.doh.gov.ph/download/ntp-mop-6th-edition/) | Official DOH/NTP page links the manual. | The exact “2 weeks or longer” cough criterion was not retrievable in this review. Cough-threshold/TB screening tests remain pending and unscored. |
| S15 | Mayo Clinic, [Cough](https://www.mayoclinic.org/symptoms/cough/basics/definition/sym-20050846), reviewed December 11, 2024 | Defines acute cough as under 3 weeks and chronic cough as over 8 weeks in adults or over 4 weeks in children; lists warning signs such as trouble breathing, bloody/pink mucus, and chest pain. | U.S. patient information, not Philippine triage policy. Duration labels do not establish a cause or RED level. |
| S16 | NHS, [Cough](https://www.nhs.uk/symptoms/cough/) | Advises GP review for cough lasting more than 3 weeks and urgent advice for trouble breathing, chest pain, coughing blood, feeling very unwell, or a severe/worsening cough. | UK care pathway; do not map GP/111 directly to local facilities or colors. Page reviewed December 8, 2023. |
| S17 | NICE, [Headaches in over 12s: diagnosis and management (CG150)](https://www.nice.org.uk/guidance/cg150/chapter/recommendations), updated June 3, 2025 | Describes tension-type, migraine, and cluster headache patterns; calls for evaluation/consideration of referral for features including sudden headache reaching maximum within 5 minutes and headache triggered by cough, Valsalva, sneeze, or exercise. | Applies to people over 12 and is UK guidance. Pattern chips are not diagnoses; NICE does not define HealthGuard colors or Philippine referral pathways. |

## Abdominal Pain and Reflux

| ID | Source | What it supports | Limits / status |
|---|---|---|---|
| S21 | U.S. NIDDK, [Symptoms & Causes of Appendicitis](https://www.niddk.nih.gov/health-information/digestive-diseases/appendicitis/symptoms-causes), last reviewed July 2021 | Says appendicitis pain may start near the navel and move lower-right, worsen with movement/deep breath/cough/sneeze, and worsen over hours; advises immediate medical care if appendicitis is suspected. | This pattern is not a diagnosis. U.S. guidance and referral-to-RED mapping need local clinician review. |
| S22 | NHS, [Stomach ache](https://www.nhs.uk/conditions/stomach-ache/) | Advises emergency help for sudden/severe stomach pain or pain on touch; notes sudden lower-right pain may be appendicitis and severe hours-long right-rib pain may be gallstones; cautions against self-diagnosis. | Page review due date (May 26, 2026) has passed, so re-verify before clinical use. NHS 111/999 is not Philippine policy. |
| S24 | U.S. NIDDK, [Symptoms & Causes of GER and GERD](https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/symptoms-causes) | Describes typical heartburn as burning behind the breastbone in the middle of the chest. | Lower-abdominal burning alone does not establish reflux/GERD. Last reviewed July 2020. |

## Fever Thresholds

| ID | Source | What it supports | Limits / status |
|---|---|---|---|
| S23 | NHS, [High temperature (fever) in children](https://www.nhs.uk/conditions/fever-in-children/), reviewed January 3, 2024 | Defines child fever as 38 °C or higher; advises urgent NHS 111 contact for infants under 3 months at ≥38 °C and ages 3–6 months at ≥39 °C. | HealthGuard lacks a measured-temperature input; a Fever chip cannot validate these thresholds. NHS referral/color mapping is not Philippine policy. |

## Sorsoganon and Local Language References

| ID | Source | What it supports | Limits / status |
|---|---|---|---|
| S25 | Komisyon sa Wikang Filipino and Bicol University, [Ortograpiyang Sorsoganon](https://kwfwikaatkultura.ph/wp-content/uploads/2025/07/Sorsoganon.pdf), ©2024 (hosted July 2025) | Official orthography for Sorsoganon/Southern Sorsoganon (Bisakol); names communities including Irosin. The example list explicitly glosses `kalintura` as `lagnat` (fever), which is the basis for the verified alias in the extractor. | Language source only, not clinical guidance. The alias verifies the vocabulary mapping; it does not determine fever severity or cause. |
| S26 | Cunanan, [Ang dialect area ng Bikol-Sorsogon: Isang paunang suri](https://linguistics.upd.edu.ph/publication/ang-dialect-area-ng-bikol-sorsogon-isang-paunang-suri/), UP Diliman Department of Linguistics | University-hosted dialectology article compares 135 lexical items from Sorsogon varieties, including Irosin, and describes both shared and differing forms. | Establishes local variation, not symptom translations or clinical rules. |
| S27 | SIL Language & Culture Archives, [Sorsogon Bikol word list](https://www.sil.org/resources/archives/76837), created 1970 | Archive lists 372 lexical items and PDFs for Sorsogon Bikol. | SIL says the exact variety (Northern vs. Southern Sorsoganon) is unclear and the posted draft is unreviewed. Use only as a candidate corpus for human review, not as an approved clinical lexicon. |

## Newly Added Symptoms and OTC Self-Care

| ID | Source | What it supports | Limits / status |
|---|---|---|---|
| S28 | NHS, [Common cold](https://www.nhs.uk/conditions/common-cold/) | Lists blocked/runny nose and sneezing among cold symptoms. Advises rest and fluids; says a pharmacist can advise about cold medicines, warns about overlapping paracetamol in combination products, and says nasal decongestant sprays should not be used for more than a week. | UK guidance, not Philippine policy. It does not support diagnosing a cold from one nasal symptom or a particular product for every person. The page was last reviewed March 22, 2024; its media review is March 15, 2026. |
| S29 | U.S. MedlinePlus, [Rashes](https://medlineplus.gov/rashes.html) | Describes rash as irritated/swollen skin that can be itchy, red, painful, or irritated and notes many possible causes. It says treatment depends on the type/cause; possible treatments include moisturizers, lotions, cortisone creams, or antihistamines for itching. | A general symptom reference, not a treatment algorithm. It does not support selecting an antihistamine or steroid for an unexplained rash without checking the cause. |
| S30 | NHS, [Itchy skin](https://www.nhs.uk/symptoms/itchy-skin/) | Supports cool compresses and unperfumed moisturizers/emollients for itchy skin; says a pharmacist can advise whether an antihistamine may help some causes of itching. | Itchy skin is not equivalent to every rash. Do not infer an allergy or recommend antihistamines solely from a rash selection. UK pathway; page last reviewed July 19, 2023. |
| S31 | NHS, [Flu](https://www.nhs.uk/conditions/flu/) | Lists aching body as a flu symptom and says paracetamol or ibuprofen can relieve aches and pains; warns against duplicating paracetamol with combination remedies and against aspirin in children under 16. | These are UK self-care recommendations for flu symptoms, not evidence that isolated body aches mean flu. Check age, pregnancy, contraindications, package directions, and local Philippine policy; do not recommend ibuprofen when dengue is suspected (see S1). Page last reviewed February 3, 2026. |
| S32 | NHS, [Paracetamol for adults](https://www.nhs.uk/medicines/paracetamol-for-adults/) and [paracetamol for children](https://www.nhs.uk/medicines/paracetamol-for-children/) | Supports paracetamol as a pain/fever option and directs users to age/weight-appropriate product labels and professional advice; warns against taking multiple products containing paracetamol. | UK product guidance is not a Philippine prescribing standard. Test cases should not require a dose from HealthGuard; local formulation, label, age/weight, contraindications, and clinician review govern use. |

## User-Provided Phrase Mapping

The two phrases `dae makahangos` and `dae nakahangos` are mapped to **difficulty breathing** because the user supplied that meaning. They are recorded in the test plan as user-provided and live-tested, not as translations established by S25–S27. Review them with a local Sorsoganon/Bisakol speaker or health worker before presenting them as a general dialect standard.

The added Bikol candidate aliases for rash, body aches, cold symptoms, and stomach ache are not verified by S25–S27. Those sources establish dialect variation and the need for local review, but do not verify these specific translations. Keep the new aliases marked as pending local-speaker/health-worker validation; matching tests demonstrate software behavior only.

## Gaps to Resolve Before Clinical Use

1. Confirm all RED/YELLOW/urgent mappings with the Irosin municipal health officer; a source’s “urgent advice” or “inpatient management” is not automatically a HealthGuard color.
2. Re-check S22 because its stated review date has passed.
3. Verify the precise WHO/Philippine child danger-sign chart rows for “unable to drink” and “vomits everything.”
4. Add a measured-temperature field before claiming the young-child fever thresholds in S5/S23 are tested.
5. Do not use the pending TB threshold in S12 until its exact manual text is confirmed.
6. Do not generalize pediatric medication evidence in S8 to adults.
7. Grow the Irosin symptom lexicon only from sourced or locally reviewed phrase forms. Keep user-provided and machine-inferred suggestions separate from verified translations.
