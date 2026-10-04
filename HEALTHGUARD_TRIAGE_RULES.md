# HealthGuard Triage Rules and Risk Thresholds

**Status:** Snapshot of the current software implementation, reviewed 2026-10-02. This is not a clinical guideline or physician approval. Confirm all thresholds and actions with the municipal health officer before clinical use.

## Risk Thresholds

The engine sums the severity weights of active, recognized symptoms and adds any duration and demographic points.

| Adjusted score | Normal score-based level |
|---:|---|
| 0-2 | GREEN |
| 3-7 | YELLOW |
| 8 or more | RED |

Emergency overrides and special-case branches can set the result independently of the score. They are applied before the ordinary score band is selected.

## Symptom Weights

The canonical symptom weights currently seeded in the rule lexicon are:

| Symptom | Weight |
|---|---:|
| Fever | 2 |
| Cough | 1 |
| Headache | 2 |
| Abdominal pain | 5 |
| Vomiting | 3 |
| Diarrhea | 4 |
| Difficulty breathing | 6 |
| Colds / rhinitis | 1 |
| Chest pain | 3 |
| Chest tightness | 3 |
| Muscle ache / body soreness | 1 |
| Generalized weakness | 2 |
| Dizziness | 2 |
| Blood in stool | 1 |
| Unable to drink | 6 |
| Vomits everything | 6 |
| Altered consciousness | 6 |
| Neurologic emergency | 6 |

## Duration Rules

When the request does not provide a duration directly, the engine parses duration phrases from the text. Explicit age-in-months phrases are excluded from symptom-duration parsing.

| Symptom duration | Duration points |
|---|---:|
| Up to 1 day | 1 |
| More than 1 through 3 days | 1 for an isolated cough; otherwise 2 |
| More than 3 through 7 days | 3 |
| More than 7 days | 4 |

Additional duration behavior:

- Isolated cough lasting 3 days or less triggers `short-cough-duration-cap`.
- Diarrhea lasting 14 days or longer triggers `persistent-diarrhea`.
- Cough lasting more than 30 days triggers `persistent-cough`.
- Fever lasting more than 3 days triggers `persistent-fever`.
- Fever lasting 5 days or longer triggers `prolonged-fever-emergency` and RED.
- A weekday onset without an exact elapsed duration triggers `relative-onset-needs-review` and at least YELLOW.
- One recognized symptom with no duration defaults to GREEN unless an earlier override applies.

## Demographic Adjustments

- Age below 5 years or above 65 years adds 1 point (`age-risk-modifier`).
- Reported pregnancy with fever adds 1 point (`pregnancy-fever-review`) and is at least YELLOW unless another rule makes it RED.
- Fever at age 0 to 2 months is RED (`young-infant-fever-referral`).
- Fever with integer age 0 years is also RED. Because ages in months are converted to whole years for some existing rules, this currently includes infants under 1 year, even when older than 2 months.
- Fever with generalized weakness in someone older than 65 years is RED (`older-adult-fever-weakness-override`).

## RED Overrides

Any of the following produces RED, regardless of the normal score band:

- Adjusted score of 8 or more.
- Difficulty breathing.
- A recognized red-flag symptom: chest pain, chest tightness, blood in vomit, black stool, active bleeding, neurologic emergency, thunderclap headache, pregnancy warning sign, unable to drink, vomits everything, altered consciousness, or shortness of breath when represented by the canonical breathing symptom.
- Emergency text patterns for blood in vomit, black stool, active bleeding, seizure/convulsion, stiff neck/confusion, or chest pain.
- Text indicating worst-ever/pinakamasakit or thunderclap headache, or sudden/biglaan headache.
- Pregnancy together with headache or visual-disturbance text can produce `pregnancy warning sign` and RED.
- Fever lasting 5 days or longer.
- Fever at age 0 years or age 0 to 2 months.
- Fever plus generalized weakness in a person older than 65.

## YELLOW Floors and Review Rules

- Blood in stool triggers `blood-in-stool-health-worker-review` and is at least YELLOW unless a RED override applies.
- Weekday onset with a recognized symptom is at least YELLOW.
- Pregnancy with fever is at least YELLOW.
- A no-duration, single-symptom assessment is otherwise GREEN.
- Inside the classifier, no recognized symptoms receive a YELLOW floor. The assessment API normally rejects an unrecognized/no-symptom request with HTTP 422 before returning a triage result.

## Wording and Negation

- Active matches are scored; recognized negated symptoms are excluded from active matches.
- Severe/worst/unbearable/cannot/unable/sudden wording adds `severe-or-worsening-language`. On its own this wording rule does not always force RED; RED depends on the separate emergency or scoring conditions above.
- Worsening/getting worse/lumalala/lumubha adds `worsening-symptoms`.
- Two or more symptoms add `symptom-combination-score` for explanation; this rule itself does not add score.

## Implementation Caveat

The classifier records `four-symptom-override` when four or more distinct symptoms are present, and its description says immediate review is required. The final risk-level condition currently does not check that rule name or symptom count directly. Do not treat the rule description as an enforced RED outcome until the implementation is corrected and tested.

The `four-symptom-override` and `difficulty-breathing-override` entries are explanatory rules; actual level selection is determined by the final conditions in `classify()`.

## Result Messages

| Level | Message | Recommendation |
|---|---|---|
| GREEN | Your symptoms appear mild. Continue monitoring your condition. | Rest, stay hydrated, and self-monitor. Seek help if symptoms worsen. |
| YELLOW | You may need a consultation. | Contact your Barangay Health Worker or visit the Rural Health Unit (RHU). |
| RED | Seek immediate medical attention. | Go to the nearest hospital or call emergency services now. Do not delay. |

## Source Files

- Executable rules: [backend/app/nlp/rules.py](backend/app/nlp/rules.py)
- Symptom weights and bilingual aliases: [backend/app/seed.py](backend/app/seed.py)
- Analysis pipeline: [backend/app/nlp/engine.py](backend/app/nlp/engine.py)
- Assessment request age and duration fields: [backend/app/schemas.py](backend/app/schemas.py)
- Relevant rule tests: [backend/tests/test_assessment_validation.py](backend/tests/test_assessment_validation.py)
