"""Canonical multilingual symptom lexicon and idempotent DB seeding.

LEXICON_SEED is the single source of truth for the two-layer lexicon (Layer 2).
Each entry maps an English, Tagalog, or Bikol phrase to a standard medical term
with a severity weight used by the rule engine. The list is also importable
directly for standalone engine testing without a database.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


PARACETAMOL_CATALOG_ENTRY = {
    "generic_name": "Paracetamol",
    "alternative_name": "Acetaminophen",
    "common_brands": ["Biogesic", "Calpol", "Panadol"],
    "classification": "Analgesic and antipyretic",
    "common_use": "Helps reduce fever and relieve mild to moderate pain.",
    "indications": [
        "Fever (pyrexia)",
        "Headache",
        "Toothache",
        "Mild to moderate body pain",
        "Muscle aches",
        "Sore throat pain",
        "Pain associated with colds and flu",
        "Reduces fever and relieves pain but does not treat the underlying infection.",
    ],
    "dosage_guidance": [
        "Adults 18+: some guidance uses 500–1,000 mg orally every 4–6 hours as needed. Follow the specific product label or clinician's instructions.",
        "For routine adult self-treatment, preferably do not exceed 3,000 mg in 24 hours. Follow the product label; some clinician-directed limits differ.",
        "Lower maximum doses may be needed depending on body weight, liver health, alcohol use, and other personal factors.",
        "Generally may be taken with or without food; follow the product label.",
        "Children: dose depends on body weight and product concentration. Use an appropriate measuring device and never automatically use adult doses.",
        "Ask a healthcare professional about infants, especially those under 3 months.",
    ],
    "dosage_forms": ["Tablet", "Oral liquid (formulations vary by product)"],
    "side_effects": [
        "Nausea",
        "Vomiting",
        "Stomach discomfort",
        "Skin rash",
        "Itching",
    ],
    "medicine_specific_precautions": [],
    "serious_reactions": [
        "Liver injury, which may cause jaundice or dark urine",
        "Severe allergic reaction (anaphylaxis)",
        "Severe skin reaction, including blisters, peeling, or widespread rash",
        "Blood disorders, which may cause unusual bruising or bleeding",
    ],
    "precautions": [
        "Do not take if previously allergic to paracetamol.",
        "Ask a doctor before use if you have liver disease; seek professional advice if you have kidney disease.",
        "Heavy alcohol use may increase the risk of liver damage.",
        "Ask a healthcare professional about use during pregnancy. It is generally compatible with breastfeeding at recommended doses; confirm if unsure.",
        "Low body weight may require a lower maximum dose.",
        "Malnutrition may increase toxicity risk; seek professional advice.",
        "Do not combine multiple medicines containing paracetamol. Check cold and flu product ingredients.",
        "Do not exceed the recommended daily dose or use it for prolonged periods without medical advice.",
        "Tell a doctor or pharmacist about other medicines, especially warfarin and anti-seizure medicines.",
        "Stop taking it and seek medical attention if a serious skin or allergic reaction develops.",
    ],
    "overdose_guidance": [
        "Suspected overdose requires immediate emergency medical evaluation, even if the person initially feels normal. Do not wait for symptoms.",
        "Possible symptoms include nausea, vomiting, excessive sweating, abdominal pain, loss of appetite, yellowing of the eyes or skin, and dark urine.",
        "Acetylcysteine is an antidote used in paracetamol poisoning and must be given under medical supervision; do not self-treat.",
    ],
}

PRODUCTIVE_COUGH_INDICATIONS = [
    "Productive or wet cough",
    "Cough with phlegm",
    "Thick respiratory mucus",
    "Excessive mucus production",
    "Difficulty clearing respiratory secretions",
    "These medicines do not cure infections or eliminate the underlying cause of a cough.",
]

PRODUCTIVE_COUGH_SERIOUS_REACTIONS = [
    "Severe allergic reaction",
    "Difficulty breathing or bronchospasm",
    "Severe skin reaction, including blistering or peeling",
    "Gastrointestinal bleeding has been reported with certain mucolytics.",
]

PRODUCTIVE_COUGH_OVERDOSE_GUIDANCE = [
    "Excessive amounts or using the wrong formulation can cause adverse effects. Seek immediate medical attention if overdose is suspected.",
    "Warning signs may include severe nausea or vomiting, severe abdominal pain, difficulty breathing, facial or throat swelling, severe skin rash, or unusual weakness.",
]

PRODUCTIVE_COUGH_PRECAUTIONS = [
    "Some mucolytics may trigger bronchospasm in people with asthma; seek medical advice before use.",
    "Use caution and seek professional advice with a history of peptic ulcer, especially before acetylcysteine or carbocisteine.",
    "Consult a healthcare professional before use with liver disease; kidney disease may require avoidance or dose adjustment for some medicines.",
    "Ask a healthcare professional about use during pregnancy and check medicine-specific safety when breastfeeding.",
    "Children need age-appropriate formulations and dosing; follow the product label and professional advice.",
    "Avoid any medicine that previously caused an allergic reaction.",
    "Drink adequate fluids unless fluid restriction has been advised.",
    "Follow the specific product label. Do not combine multiple cough medicines without checking ingredients.",
    "Do not automatically combine expectorants or mucolytics with cough suppressants, particularly when mucus needs to be cleared.",
    "Seek medical assessment if cough lasts more than seven days, worsens, or occurs with fever, chest pain, or difficulty breathing.",
    "Stop use and seek medical help if a severe allergic or skin reaction occurs.",
]

PRODUCTIVE_COUGH_MEDICATIONS = [
    {
        "generic_name": "Guaifenesin",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Expectorant",
        "common_use": "Helps loosen mucus so it can be coughed out more easily.",
        "indications": PRODUCTIVE_COUGH_INDICATIONS,
        "dosage_forms": ["Syrup", "Tablet", "Extended-release tablet"],
        "dosage_guidance": [
            "General adult guidance (18+): immediate-release 200–400 mg orally every 4 hours as needed.",
            "General adult guidance (18+): extended-release 600–1,200 mg orally every 12 hours.",
            "Maximum: 2,400 mg in 24 hours. Do not exceed the specific product label or clinician's instructions.",
            "Take with a full glass of water and maintain adequate fluid intake unless fluid-restricted.",
            "Do not crush or chew extended-release tablets. Check combination cough medicines for duplicate ingredients.",
            "Formulation and concentration vary. This is general information, not an individualized dose; children require age- and product-specific advice.",
        ],
        "side_effects": ["Nausea", "Vomiting", "Dizziness", "Headache"],
        "serious_reactions": PRODUCTIVE_COUGH_SERIOUS_REACTIONS,
        "precautions": PRODUCTIVE_COUGH_PRECAUTIONS,
        "medicine_specific_precautions": ["For extended-release tablets, swallow whole; do not crush or chew."],
        "overdose_guidance": PRODUCTIVE_COUGH_OVERDOSE_GUIDANCE,
    },
    {
        "generic_name": "Carbocisteine",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Mucolytic",
        "common_use": "Reduces mucus thickness.",
        "indications": PRODUCTIVE_COUGH_INDICATIONS,
        "dosage_forms": ["Syrup", "Capsule"],
        "dosage_guidance": [
            "General adult guidance (18+): initial dose 750 mg orally three times daily (total 2,250 mg per day).",
            "General adult maintenance guidance: 500 mg orally three times daily.",
            "Route: oral. Follow the specific product instructions; food directions may vary by formulation.",
            "Dosage depends on the registered product, formulation, age, and medical condition. This is general information, not an individualized dose.",
        ],
        "side_effects": ["Nausea", "Diarrhea", "Stomach discomfort"],
        "serious_reactions": PRODUCTIVE_COUGH_SERIOUS_REACTIONS,
        "precautions": PRODUCTIVE_COUGH_PRECAUTIONS,
        "medicine_specific_precautions": [
            "Use caution with a history of peptic ulcer.",
            "Stop use and seek medical advice if gastrointestinal bleeding occurs.",
        ],
        "overdose_guidance": PRODUCTIVE_COUGH_OVERDOSE_GUIDANCE,
    },
    {
        "generic_name": "Ambroxol",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Mucolytic / secretolytic",
        "common_use": "Helps clear respiratory mucus.",
        "indications": PRODUCTIVE_COUGH_INDICATIONS,
        "dosage_forms": ["Syrup", "Tablet", "Drops"],
        "dosage_guidance": [
            "General adult guidance (18+): a common tablet dose is 30 mg two to three times daily.",
            "Common syrup strengths include 15 mg/5 mL and 30 mg/5 mL; concentration varies by product.",
            "Route: oral.",
            "Taking it after meals may help reduce stomach discomfort.",
            "Dose varies by formulation. Follow the registered product instructions; this is general information, not an individualized dose.",
        ],
        "side_effects": ["Nausea", "Indigestion", "Vomiting", "Skin rash"],
        "serious_reactions": PRODUCTIVE_COUGH_SERIOUS_REACTIONS,
        "precautions": PRODUCTIVE_COUGH_PRECAUTIONS,
        "medicine_specific_precautions": [],
        "overdose_guidance": PRODUCTIVE_COUGH_OVERDOSE_GUIDANCE,
    },
    {
        "generic_name": "Bromhexine",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Mucolytic",
        "common_use": "Helps break down thick mucus.",
        "indications": PRODUCTIVE_COUGH_INDICATIONS,
        "dosage_forms": ["Syrup", "Tablet"],
        "dosage_guidance": [
            "General adult guidance (18+): common tablet strength is 8 mg; usual dose is 8–16 mg orally three times daily.",
            "Take with water; food directions may vary by product. Route: oral.",
            "Follow the specific product label. This is general information, not an individualized dose; children require age- and product-specific advice.",
        ],
        "side_effects": ["Nausea", "Abdominal discomfort", "Diarrhea"],
        "serious_reactions": PRODUCTIVE_COUGH_SERIOUS_REACTIONS,
        "precautions": PRODUCTIVE_COUGH_PRECAUTIONS,
        "medicine_specific_precautions": [
            "Use caution with a history of peptic ulcer.",
            "Stop use and seek medical advice if a severe skin reaction occurs.",
        ],
        "overdose_guidance": PRODUCTIVE_COUGH_OVERDOSE_GUIDANCE,
    },
    {
        "generic_name": "Acetylcysteine (NAC)",
        "alternative_name": "N-acetylcysteine",
        "common_brands": [],
        "classification": "Mucolytic",
        "common_use": "Helps thin thick phlegm.",
        "indications": PRODUCTIVE_COUGH_INDICATIONS,
        "dosage_forms": ["Effervescent tablet", "Powder", "Oral solution"],
        "dosage_guidance": [
            "General adult guidance (18+): common strengths are 200 mg and 600 mg.",
            "For 200 mg products, guidance may be 200 mg two to three times daily; for 600 mg products, guidance may be 600 mg once daily.",
            "Oral route. Dissolve effervescent tablets in water according to the product instructions.",
            "Formulations and local product instructions vary. This is general information, not an individualized dose.",
        ],
        "side_effects": ["Nausea", "Vomiting", "Diarrhea", "Unpleasant taste", "Rash"],
        "serious_reactions": PRODUCTIVE_COUGH_SERIOUS_REACTIONS,
        "precautions": PRODUCTIVE_COUGH_PRECAUTIONS,
        "medicine_specific_precautions": [
            "Use caution in asthma because bronchospasm may occur.",
            "Use caution with a history of stomach or intestinal ulcers.",
            "Some effervescent formulations contain ingredients unsuitable for people with phenylketonuria (PKU); check the label.",
        ],
        "overdose_guidance": PRODUCTIVE_COUGH_OVERDOSE_GUIDANCE,
    },
    {
        "generic_name": "Erdosteine",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Mucolytic",
        "common_use": "Helps reduce mucus viscosity.",
        "indications": PRODUCTIVE_COUGH_INDICATIONS,
        "dosage_forms": ["Capsule", "Suspension"],
        "dosage_guidance": [
            "General adult guidance (18+): common capsule strength is 300 mg; usual guidance is 300 mg orally twice daily.",
            "Take with water; route: oral.",
            "Prescription status may apply. Use only with appropriate medical guidance and follow the specific product instructions.",
            "This is general information, not an individualized dose; do not use adult guidance for children.",
        ],
        "side_effects": ["Nausea", "Diarrhea", "Abdominal discomfort", "Headache"],
        "serious_reactions": PRODUCTIVE_COUGH_SERIOUS_REACTIONS,
        "precautions": PRODUCTIVE_COUGH_PRECAUTIONS,
        "medicine_specific_precautions": [
            "Avoid in severe kidney impairment, significant liver impairment, or active peptic ulcer disease.",
            "Prescription status may apply; use only with appropriate medical guidance.",
        ],
        "overdose_guidance": PRODUCTIVE_COUGH_OVERDOSE_GUIDANCE,
    },
]

DRY_COUGH_INDICATIONS = [
    "Dry or non-productive cough",
    "Temporary relief of coughing associated with common colds",
]

DRY_COUGH_MEDICATIONS = [
    {
        "generic_name": "Dextromethorphan",
        "alternative_name": "",
        "common_brands": ["Benadryl DM", "Robitussin DM"],
        "classification": "Antitussive (cough suppressant)",
        "common_use": "Temporarily suppresses dry cough; OTC status and formulations vary by product.",
        "indications": [
            *DRY_COUGH_INDICATIONS,
            "Cough caused by throat irritation",
        ],
        "dosage_forms": ["Immediate-release oral liquid", "Tablet or capsule (product dependent)"],
        "dosage_guidance": [
            "General adult guidance (18+): immediate-release 10–20 mg orally every 4 hours as needed, or 30 mg every 6–8 hours as needed, depending on the product.",
            "Maximum: 120 mg in 24 hours. Follow the specific product label; combination products may have different directions.",
            "May be taken with or without food. This is general information, not an individualized dose; children require age- and product-specific advice.",
        ],
        "side_effects": ["Dizziness", "Drowsiness", "Nausea", "Vomiting", "Stomach discomfort", "Nervousness"],
        "medicine_specific_precautions": [
            "Avoid with monoamine oxidase inhibitors (MAOIs) and for 14 days after stopping an MAOI.",
            "Consult a healthcare professional before use with antidepressants or other serotonergic medicines because of serotonin syndrome risk.",
            "Avoid alcohol and other sedatives. Confusion or hallucinations may occur, particularly in overdose.",
            "Avoid routine use for cough with substantial mucus unless a clinician advises it.",
        ],
        "serious_reactions": [
            "Serotonin syndrome, especially when combined with serotonergic medicines",
            "Severe allergic reaction",
            "Confusion or hallucinations, particularly in overdose",
        ],
        "precautions": [
            "Use only for temporary relief and follow the product label; formulations and combination ingredients vary.",
            "Do not combine multiple cough and cold products without checking for duplicate active ingredients.",
            "Seek medical advice for a persistent or worsening cough, or if cough occurs with breathing difficulty, chest pain, or high fever.",
        ],
        "overdose_guidance": [
            "Suspected overdose requires immediate medical or poison-control advice, even if symptoms are not yet present.",
            "Overdose may cause severe drowsiness, agitation, confusion, hallucinations, poor coordination, or breathing problems.",
        ],
    },
    {
        "generic_name": "Diphenhydramine",
        "alternative_name": "",
        "common_brands": ["Benadryl"],
        "classification": "First-generation H1 antihistamine",
        "common_use": "Relieves allergy symptoms; some products are used for cough or cold symptoms. Formulations vary.",
        "indications": [
            "Allergic rhinitis, sneezing, and runny nose",
            "Itchy or watery eyes",
            "Skin itching and hives (urticaria)",
            "Allergy-related symptoms",
        ],
        "dosage_forms": ["Tablet or capsule", "Oral liquid (product dependent)"],
        "dosage_guidance": [
            "General adult guidance (18+): 25–50 mg orally every 4–6 hours as needed.",
            "Maximum: 300 mg in 24 hours. Check the specific product label and do not exceed its directions.",
            "May be taken with or without food. This is general information, not an individualized dose; children require age- and product-specific advice.",
        ],
        "side_effects": ["Drowsiness", "Dry mouth", "Dizziness", "Blurred vision", "Constipation", "Difficulty urinating"],
        "medicine_specific_precautions": [
            "Avoid driving or operating machinery if drowsy; avoid alcohol and sedatives.",
            "Use caution in older adults because confusion and other adverse effects may be more likely.",
            "Ask a healthcare professional before use with glaucoma or difficulty urinating.",
            "Do not combine with other antihistamines unless advised by a healthcare professional.",
        ],
        "serious_reactions": [
            "Severe allergic reaction",
            "Confusion",
            "Irregular heartbeat",
            "Urinary retention",
        ],
        "precautions": [
            "OTC status and formulations vary. Follow the product label and check combination products for duplicate ingredients.",
            "Seek medical advice for persistent or worsening symptoms or before use with other medicines or health conditions.",
        ],
        "overdose_guidance": [
            "Suspected overdose requires immediate medical or poison-control advice.",
            "Overdose may cause severe drowsiness, agitation, confusion, hallucinations, irregular heartbeat, or seizures.",
        ],
    },
    {
        "generic_name": "Chlorpheniramine",
        "alternative_name": "Chlorpheniramine maleate; chlorphenamine",
        "common_brands": ["Chlor-Trimeton"],
        "classification": "First-generation H1 antihistamine",
        "common_use": "Relieves allergy symptoms such as sneezing, runny nose, and itchy or watery eyes.",
        "indications": [
            "Allergic rhinitis, sneezing, and runny nose",
            "Itchy nose and throat or watery eyes",
            "Skin allergies and hives (urticaria)",
            "Allergy-related cold symptoms",
        ],
        "dosage_forms": ["Tablet", "Oral liquid", "Extended-release tablet (product dependent)"],
        "dosage_guidance": [
            "General adult guidance (18+): common tablet strength and usual dose are 4 mg orally every 4–6 hours as needed.",
            "Maximum: 24 mg in 24 hours. Follow the specific product label; formulations vary.",
            "Use a measuring device for liquid formulations. Swallow extended-release tablets whole; do not crush or chew.",
            "This is general information, not an individualized dose; children require age- and product-specific advice.",
        ],
        "side_effects": [
            "Drowsiness",
            "Dry mouth, nose, or throat",
            "Dizziness",
            "Blurred vision",
            "Constipation",
            "Nausea",
            "Difficulty urinating",
        ],
        "medicine_specific_precautions": [
            "Avoid driving if drowsy; avoid alcohol and sedatives.",
            "Use caution with glaucoma, asthma, or chronic bronchitis; ask a healthcare professional if you have an enlarged prostate or difficulty urinating.",
            "Older adults should generally avoid first-generation antihistamines when safer alternatives are available, unless advised by a clinician.",
            "Check combination cold products for duplicate antihistamines or other ingredients.",
        ],
        "serious_reactions": [
            "Severe allergic reaction",
            "Vision disturbance",
            "Urinary retention",
            "Confusion, particularly in older adults",
        ],
        "precautions": [
            "OTC status and formulations vary. Follow the product label and use a proper measuring device for liquid.",
            "Seek medical advice for persistent or worsening symptoms or before use with other medicines or health conditions.",
        ],
        "overdose_guidance": [
            "Suspected overdose requires immediate medical or poison-control advice.",
            "Overdose may cause severe drowsiness, agitation, confusion, hallucinations, vision problems, or difficulty urinating.",
        ],
    },
    {
        "generic_name": "Cetirizine",
        "alternative_name": "Cetirizine hydrochloride",
        "common_brands": ["Zyrtec", "Allerkid"],
        "classification": "Second-generation H1 antihistamine",
        "common_use": "May relieve itching from hives or allergies; it does not treat every cause of rash.",
        "indications": [
            "Allergic rhinitis, sneezing, and runny nose",
            "Itchy nose and throat or watery eyes",
            "Itching associated with hives (urticaria) or allergies",
            "Seasonal allergies",
        ],
        "dosage_forms": ["Tablet", "Oral liquid (product dependent)"],
        "dosage_guidance": [
            "General adult guidance (18+): usual dose 10 mg orally once daily; 5 mg may be used for milder symptoms according to the product label.",
            "Maximum: 10 mg in 24 hours. Follow the specific product label.",
            "May be taken with or without food. This is general information, not an individualized dose; kidney impairment may require adjustment and children need age- and product-specific advice.",
        ],
        "side_effects": ["Drowsiness", "Fatigue", "Dry mouth", "Headache", "Dizziness", "Nausea"],
        "medicine_specific_precautions": [
            "May cause drowsiness in some people; use caution when driving or operating machinery.",
            "Kidney impairment may require dose adjustment. Ask a healthcare professional if you have kidney or liver disease.",
            "Seek professional advice during pregnancy or breastfeeding.",
            "Avoid alcohol if it increases drowsiness; do not combine with other antihistamines without medical advice.",
            "An antihistamine may help some allergic itching or hives but does not diagnose or treat every rash.",
            "Do not use it instead of emergency care for breathing difficulty or swelling of the lips, tongue, or throat.",
        ],
        "serious_reactions": [
            "Severe allergic reaction",
            "Difficulty breathing",
            "Swelling of the face, lips, tongue, or throat",
        ],
        "precautions": [
            "OTC status and formulations vary. Follow the product label and check combination products for duplicate ingredients.",
            "Seek medical advice for persistent or worsening symptoms or before use with other medicines or health conditions.",
        ],
        "overdose_guidance": [
            "Suspected overdose requires immediate medical or poison-control advice.",
            "Overdose may cause pronounced drowsiness, restlessness, or other unexpected symptoms.",
        ],
    },
    {
        "generic_name": "Loratadine",
        "alternative_name": "",
        "common_brands": ["Claritin", "Alavert"],
        "classification": "Second-generation H1 antihistamine",
        "common_use": "May relieve itching from hives or allergies; it does not treat every cause of rash.",
        "indications": [
            "Allergic rhinitis, sneezing, and runny nose",
            "Itchy nose and throat or watery eyes",
            "Seasonal allergies",
            "Itching associated with hives (urticaria) or allergies",
        ],
        "dosage_forms": ["Tablet", "Oral liquid (product dependent)"],
        "dosage_guidance": [
            "General adult guidance (18+): usual dose 10 mg orally once daily.",
            "Maximum: 10 mg in 24 hours. Follow the specific product label.",
            "May be taken with or without food; swallow tablets with water. This is general information, not an individualized dose; severe liver impairment may require a lower dose or longer interval.",
        ],
        "side_effects": ["Headache", "Drowsiness", "Fatigue", "Dry mouth", "Nausea", "Mild stomach discomfort"],
        "medicine_specific_precautions": [
            "Severe liver impairment may require a lower dose or longer dosing interval; ask a healthcare professional.",
            "Consult a healthcare professional if you have liver or kidney disease or are pregnant or breastfeeding.",
            "Avoid exceeding the recommended daily dose and use caution when combining with other allergy medicines.",
            "An antihistamine may help some allergic itching or hives but does not diagnose or treat every rash.",
            "Do not use it instead of emergency care for breathing difficulty or swelling of the lips, tongue, or throat.",
        ],
        "serious_reactions": [
            "Severe allergic reaction",
            "Skin rash",
            "Facial swelling",
            "Difficulty breathing",
        ],
        "precautions": [
            "OTC status and formulations vary. Follow the product label and check combination products for duplicate ingredients.",
            "Seek medical advice for persistent or worsening symptoms or before use with other medicines or health conditions.",
        ],
        "overdose_guidance": [
            "Suspected overdose requires immediate medical or poison-control advice.",
            "Seek urgent care for breathing difficulty, facial swelling, or another severe allergic reaction.",
        ],
    },
]


DIARRHEA_MEDICATIONS = [
    {
        "generic_name": "Oral Rehydration Salts (ORS)",
        "alternative_name": "Oral Rehydration Solution",
        "common_brands": ["Hydrite"],
        "classification": "Oral electrolyte replacement solution",
        "common_use": "Replaces fluids and electrolytes lost through diarrhea or vomiting and helps prevent dehydration.",
        "indications": [
            "Dehydration caused by diarrhea",
            "Fluid loss from vomiting",
            "Electrolyte loss and prevention of dehydration",
            "Replacement of lost body fluids",
        ],
        "dosage_forms": ["Powder sachet", "Prepared solution"],
        "dosage_guidance": [
            "Dissolve each sachet in the exact amount of clean water printed on that sachet. Sachet volumes vary; never assume every packet is for one liter.",
            "For vomiting, start with small, frequent sips and repeat as tolerated. If vomiting occurs, pause briefly and restart more slowly.",
            "Drink after loose stools and as needed to replace losses, following the product instructions or a health professional's advice.",
            "Do not add extra sugar or salt, or mix with juice, milk, or soft drinks unless the product instructions specifically say to do so.",
            "Prepare and store the solution according to the packet instructions. This is general guidance, not an individualized fluid plan.",
        ],
        "side_effects": [
            "Nausea",
            "Vomiting if consumed too quickly",
            "Electrolyte imbalance if improperly prepared",
            "Fluid overload in susceptible patients",
        ],
        "medicine_specific_precautions": [
            "Use clean drinking water and measure the sachet's stated dilution volume exactly.",
            "Patients with significant kidney or heart disease may need individualized fluid guidance.",
        ],
        "serious_reactions": [],
        "precautions": [
            "Seek urgent medical attention for severe dehydration, very little or no urine, persistent vomiting, or worsening symptoms.",
            "ORS supports rehydration but does not treat the cause of diarrhea.",
        ],
        "overdose_guidance": [],
    },
    {
        "generic_name": "Zinc sulfate",
        "alternative_name": "Elemental zinc (dose depends on formulation)",
        "common_brands": [],
        "classification": "Mineral supplement / zinc replacement",
        "common_use": "Adjunct treatment for childhood acute diarrhea when recommended by a health professional.",
        "indications": [
            "Childhood acute diarrhea as an adjunct to oral rehydration",
            "Zinc deficiency when diagnosed or suspected by a health professional",
        ],
        "dosage_forms": ["Tablet", "Dispersible tablet", "Oral liquid (formulations vary)"],
        "dosage_guidance": [
            "WHO-recommended pediatric reference: under 6 months, 10 mg elemental zinc once daily for 10–14 days; 6 months and older, 20 mg elemental zinc once daily for 10–14 days.",
            "These doses refer to elemental zinc, not the total weight of zinc sulfate. Product concentrations vary; confirm the elemental zinc amount and follow local clinical guidance.",
            "Oral use. Continue breastfeeding and appropriate feeding, and use ORS alongside zinc when advised.",
            "This is not a routine adult diarrhea treatment and is not an individualized prescription.",
        ],
        "side_effects": ["Nausea", "Vomiting", "Stomach discomfort", "Metallic taste"],
        "medicine_specific_precautions": [
            "Check the elemental zinc concentration; do not calculate a dose from the total zinc sulfate salt weight.",
            "Avoid excessive or prolonged supplementation. Zinc may interact with some antibiotics.",
        ],
        "serious_reactions": [],
        "precautions": [
            "Ask a healthcare professional to confirm whether zinc is suitable for the child's age and product.",
            "Seek professional advice if a child has persistent vomiting or cannot keep fluids down.",
        ],
        "overdose_guidance": ["If an excessive amount may have been taken, contact a healthcare professional or poison service promptly."],
    },
    {
        "generic_name": "Saccharomyces boulardii",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Probiotic yeast",
        "common_use": "May support management of some acute diarrhea episodes or selected antibiotic-associated diarrhea; evidence and products vary.",
        "indications": [
            "Supportive management of some acute diarrhea episodes",
            "Prevention of antibiotic-associated diarrhea in selected patients",
            "Support of intestinal microbial balance",
        ],
        "dosage_forms": ["Capsule", "Sachet"],
        "dosage_guidance": [
            "A common formulation is 250 mg per capsule or sachet; a commonly used adult regimen is 250 mg once or twice daily.",
            "Dose and evidence vary by product and indication. Follow the specific product instructions or advice from a healthcare professional.",
            "Not a replacement for ORS or medical assessment.",
        ],
        "side_effects": ["Gas", "Bloating", "Constipation", "Thirst", "Mild gastrointestinal discomfort"],
        "medicine_specific_precautions": [
            "Do not combine with antifungal medicines without professional advice.",
        ],
        "serious_reactions": ["Rare fungemia (yeast entering the bloodstream), particularly in vulnerable patients."],
        "precautions": [
            "Avoid in critically ill or severely immunocompromised patients and in people with a central venous catheter.",
            "Ask a healthcare professional before use in people with significant health conditions.",
        ],
        "overdose_guidance": ["Seek medical advice if an excessive amount is taken or an unexpected reaction occurs."],
    },
    {
        "generic_name": "Lactobacillus species",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Probiotic bacteria",
        "common_use": "Some strains may support management of selected diarrhea episodes; effects are strain-specific and not universal.",
        "indications": [
            "Supportive management of certain diarrhea episodes",
            "Prevention of antibiotic-associated diarrhea in selected circumstances",
            "Support of intestinal microbial balance",
        ],
        "dosage_forms": ["Capsule", "Powder", "Sachet"],
        "dosage_guidance": [
            "Product-specific dose measured in colony-forming units (CFU); there is no single dose for all strains or products.",
            "Follow the product label for dose, storage, and preparation instructions.",
            "Not a replacement for ORS or medical assessment.",
        ],
        "side_effects": ["Gas", "Bloating", "Mild abdominal discomfort", "Changes in bowel habits"],
        "medicine_specific_precautions": [
            "Check the specific bacterial strain and CFU count; evidence is strain-specific.",
        ],
        "serious_reactions": ["Rare serious infections have been reported in vulnerable patients."],
        "precautions": [
            "Use caution and seek professional advice in severely immunocompromised or critically ill patients.",
            "Probiotics are not universally effective for diarrhea and should not delay medical care.",
        ],
        "overdose_guidance": ["Seek medical advice if an excessive amount is taken or an unexpected reaction occurs."],
    },
    {
        "generic_name": "Loperamide",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Antidiarrheal / antimotility medicine",
        "common_use": "May reduce bowel movements for selected adults with uncomplicated acute diarrhea.",
        "indications": ["Short-term symptom relief for selected adults with uncomplicated diarrhea, when suitable."],
        "dosage_forms": ["Tablet", "Capsule", "Oral liquid (formulations vary)"],
        "dosage_guidance": [
            "General adult reference: 4 mg initially, then 2 mg after each loose stool. Follow the specific product label for maximum dose and duration; limits vary by product and location.",
            "Do not use this reference to dose a child. Ask a healthcare professional about age-appropriate treatment.",
            "ORS remains important to replace fluid losses.",
        ],
        "side_effects": ["Constipation", "Nausea", "Abdominal discomfort"],
        "medicine_specific_precautions": [
            "Do not use when blood in stool or high fever is present, or for persistent diarrhea, unless specifically directed by a clinician.",
            "Stop and seek advice if symptoms worsen, abdominal swelling develops, or diarrhea does not improve.",
        ],
        "serious_reactions": ["Excessive doses can cause serious heart rhythm problems."],
        "precautions": [
            "Do not self-treat bloody or black, tarry stools, high fever, severe abdominal pain, dehydration, or persistent vomiting.",
            "Seek medical assessment if diarrhea lasts more than 48 hours without improvement.",
        ],
        "overdose_guidance": ["Suspected overdose requires immediate medical or poison-service advice."],
    },
    {
        "generic_name": "Bismuth subsalicylate",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Antidiarrheal / salicylate-containing medicine",
        "common_use": "May relieve diarrhea and upset stomach in selected people.",
        "indications": ["Short-term relief of diarrhea and upset stomach when suitable for the patient and product."],
        "dosage_forms": ["Tablet", "Chewable tablet", "Oral liquid (formulations vary)"],
        "dosage_guidance": [
            "A common adult dose reference is 525 mg per dose; follow the specific product label for frequency, maximum dose, and duration.",
            "Formulations vary. This is general information, not an individualized dose; ask a pharmacist or healthcare professional if unsure.",
            "ORS remains important to replace fluid losses.",
        ],
        "side_effects": ["Temporary darkening of the tongue or stool", "Nausea", "Constipation"],
        "medicine_specific_precautions": [
            "Contains a salicylate. Avoid if allergic to aspirin or salicylates; ask a healthcare professional about use with blood thinners, pregnancy, or other medicines.",
            "Do not give to children or teenagers with or recovering from viral illness unless specifically directed by a clinician.",
        ],
        "serious_reactions": ["Allergic or serious bleeding reactions are possible."],
        "precautions": [
            "Do not self-treat bloody or black, tarry stools, high fever, severe abdominal pain, dehydration, or persistent vomiting.",
            "Seek medical assessment if diarrhea lasts more than 48 hours without improvement.",
        ],
        "overdose_guidance": ["Suspected overdose requires immediate medical or poison-service advice."],
    },
]


VOMITING_MEDICATIONS = [
    {
        "generic_name": "Meclizine Hydrochloride",
        "alternative_name": "Meclizine",
        "common_brands": ["Bonamine (25 mg chewable; product availability varies)"],
        "classification": "Antihistamine / antiemetic / antivertigo",
        "common_use": "May help prevent or relieve motion sickness and travel-related nausea or vomiting; it does not treat every cause of vomiting.",
        "indications": [
            "Motion sickness",
            "Travel-related nausea",
            "Motion-related vomiting",
            "Vertigo-associated nausea when advised by a healthcare professional",
            "Dizziness associated with motion sickness",
        ],
        "dosage_forms": ["Tablet", "Chewable tablet (product dependent)"],
        "dosage_guidance": [
            "General adult reference for motion sickness only: 25–50 mg orally once daily; common tablet strength is 25 mg. Take approximately 1 hour before travel when directed by the product label or a pharmacist.",
            "Do not exceed 50 mg in 24 hours based on this reference; product instructions may differ. This is not an individualized dose.",
            "No child dose is provided here. Ask a pharmacist or healthcare professional for age-specific advice.",
            "In the Philippines, OTC status may depend on the registered product and pharmacist guidance; confirm the specific product with a pharmacist.",
        ],
        "side_effects": ["Drowsiness", "Dry mouth", "Headache", "Fatigue", "Blurred vision", "Dizziness"],
        "medicine_specific_precautions": [
            "Avoid alcohol and sedatives. Do not drive or operate machinery if drowsy or vision is blurred.",
            "Use caution with glaucoma, enlarged prostate, or difficulty urinating; ask a healthcare professional before use.",
            "Not intended to treat every cause of vomiting. Seek assessment if vomiting is severe, persistent, or accompanied by warning signs.",
        ],
        "serious_reactions": [
            "Severe allergic reaction",
            "Confusion",
            "Difficulty urinating",
            "Severe blurred vision",
        ],
        "precautions": [
            "Use only for motion-related symptoms and confirm suitability and product-specific directions with a pharmacist.",
            "Do not combine with other antihistamines, sedatives, or alcohol without professional advice.",
            "Seek urgent care for green or bloody vomit, coffee-ground material, inability to keep fluids down, or signs of dehydration.",
        ],
        "overdose_guidance": [
            "Suspected overdose requires immediate medical or poison-service advice.",
            "Seek urgent care for severe drowsiness, confusion, difficulty urinating, severe vision changes, or an allergic reaction.",
        ],
    },
]


COLD_MEDICATIONS = [
    {
        "generic_name": "Pseudoephedrine",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Oral nasal decongestant",
        "common_use": "May temporarily relieve nasal congestion; product availability and regulatory classification vary.",
        "indications": ["Temporary relief of nasal congestion associated with colds or allergies."],
        "dosage_forms": ["Immediate-release tablet or oral liquid (product dependent)"],
        "dosage_guidance": [
            "General adult reference only: 60 mg orally every 4–6 hours as needed, maximum 240 mg in 24 hours. Follow the specific product label and pharmacist advice.",
            "With or without food. This is not pediatric dosing; children require product- and age-specific advice from a healthcare professional.",
            "Confirm current Philippine registration and regulatory classification with a pharmacist; this catalog does not claim that every pseudoephedrine product is OTC.",
        ],
        "side_effects": ["Insomnia", "Nervousness", "Dizziness", "Headache", "Increased heart rate"],
        "medicine_specific_precautions": [
            "Avoid or seek medical advice with uncontrolled hypertension; use caution with heart disease, hyperthyroidism, glaucoma, or prostate enlargement.",
            "Do not use with monoamine oxidase inhibitors (MAOIs) or within 14 days of stopping an MAOI.",
        ],
        "serious_reactions": ["Markedly increased blood pressure", "Chest pain or irregular heartbeat", "Severe allergic reaction"],
        "precautions": [
            "Check combination cold products for duplicate decongestants and other active ingredients.",
            "Ask a pharmacist or healthcare professional whether it is appropriate for your conditions and medicines.",
        ],
        "overdose_guidance": ["Suspected overdose requires immediate medical or poison-service advice."],
    },
    {
        "generic_name": "Oxymetazoline",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Topical nasal decongestant",
        "common_use": "Temporarily relieves nasal congestion.",
        "indications": ["Temporary relief of nasal congestion associated with colds or allergies."],
        "dosage_forms": ["Nasal spray"],
        "dosage_guidance": [
            "General adult reference only: common nasal concentration 0.05%; 2–3 sprays per nostril every 10–12 hours as needed, maximum 2 doses daily. Follow the specific product label.",
            "For self-treatment, use no longer than 3 days unless a healthcare professional instructs otherwise.",
            "This is not pediatric dosing; use in children requires age- and product-specific professional advice.",
        ],
        "side_effects": ["Nasal dryness", "Irritation", "Sneezing", "Burning sensation", "Headache"],
        "medicine_specific_precautions": [
            "Do not exceed the recommended duration; prolonged use can cause rebound nasal congestion.",
            "Consult a healthcare professional before use with hypertension, heart disease, or thyroid disease.",
        ],
        "serious_reactions": ["Severe allergic reaction", "Marked palpitations or worsening symptoms"],
        "precautions": [
            "Use only in the nose and follow the exact product label.",
            "Do not share nasal spray devices; clean and store according to the product instructions.",
        ],
        "overdose_guidance": ["Suspected overdose or accidental ingestion requires prompt medical or poison-service advice."],
    },
    {
        "generic_name": "Xylometazoline",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Topical nasal decongestant",
        "common_use": "Temporarily relieves nasal congestion.",
        "indications": ["Temporary relief of nasal congestion associated with colds or allergies."],
        "dosage_forms": ["Nasal spray", "Nasal drops (product dependent)"],
        "dosage_guidance": [
            "General adult reference only: common nasal concentration 0.1%; 1 spray per nostril up to 2–3 times daily. Follow the specific product label.",
            "Follow the product label for duration; self-treatment is generally limited to no more than 5–7 days.",
            "This is not pediatric dosing; use in children requires age- and product-specific professional advice.",
        ],
        "side_effects": ["Nasal irritation", "Dryness", "Headache", "Sneezing"],
        "medicine_specific_precautions": [
            "Avoid prolonged use because rebound congestion may occur.",
            "Use caution with hypertension or cardiovascular disease; ask a healthcare professional during pregnancy.",
        ],
        "serious_reactions": ["Severe allergic reaction", "Marked palpitations or worsening symptoms"],
        "precautions": [
            "Use only in the nose and follow the exact product label.",
            "Do not use longer than directed; consult a healthcare professional if congestion persists.",
        ],
        "overdose_guidance": ["Suspected overdose or accidental ingestion requires prompt medical or poison-service advice."],
    },
    {
        "generic_name": "Phenylephrine",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Oral sympathomimetic decongestant",
        "common_use": "Marketed for temporary nasal congestion relief; effectiveness of oral formulations is uncertain.",
        "indications": ["Products may be marketed for temporary relief of nasal congestion; evidence of effectiveness for oral use is uncertain."],
        "dosage_forms": ["Tablet", "Oral liquid (product dependent)"],
        "dosage_guidance": [
            "General adult reference only: common oral strength is 10 mg every 4 hours as needed, maximum 60 mg in 24 hours; follow the exact product label.",
            "This is not pediatric dosing; children require product- and age-specific advice from a healthcare professional.",
            "Oral phenylephrine effectiveness as a nasal decongestant is questionable. Do not treat the listed dose as proof of benefit or as a treatment recommendation.",
        ],
        "side_effects": ["Nervousness", "Dizziness", "Headache", "Increased blood pressure", "Palpitations"],
        "medicine_specific_precautions": [
            "Use caution with hypertension or heart disease.",
            "Check for interactions with monoamine oxidase inhibitors (MAOIs); ask a pharmacist before use.",
        ],
        "serious_reactions": ["Markedly increased blood pressure", "Chest pain or irregular heartbeat", "Severe allergic reaction"],
        "precautions": [
            "Check local product registration and current regulatory status with a pharmacist.",
            "Avoid combination products or duplicate decongestants without pharmacist advice.",
        ],
        "overdose_guidance": ["Suspected overdose requires immediate medical or poison-service advice."],
    },
]

HEADACHE_MEDICATIONS = [
    {
        "generic_name": "Ibuprofen",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Nonsteroidal anti-inflammatory drug (NSAID)",
        "common_use": "May relieve some headache, migraine, inflammatory pain, and fever symptoms when suitable.",
        "indications": ["Tension headache", "Migraine headache", "Inflammatory pain", "Fever-associated headache"],
        "dosage_forms": ["Tablet or capsule (product dependent)"],
        "dosage_guidance": [
            "General adult reference only: 200–400 mg orally every 4–6 hours as needed. Common tablet strength is 200 mg.",
            "OTC maximum: 1,200 mg in 24 hours. Follow the specific product label; do not exceed its directions.",
            "Take preferably with food or milk. This is not pediatric dosing or an individualized recommendation.",
        ],
        "side_effects": ["Stomach discomfort", "Nausea", "Heartburn", "Dizziness", "Diarrhea"],
        "medicine_specific_precautions": [
            "Avoid or seek medical advice with peptic ulcer or gastrointestinal bleeding, kidney disease, heart disease, or uncontrolled hypertension.",
            "Ask a healthcare professional before use during pregnancy, especially from 20 weeks onward.",
            "Do not combine with other NSAIDs, including naproxen or aspirin used for pain.",
        ],
        "serious_reactions": [
            "Gastrointestinal bleeding",
            "Kidney injury",
            "Severe allergic reaction",
            "Increased cardiovascular risk",
        ],
        "precautions": [
            "Follow the product label and ask a pharmacist whether this medicine is suitable with your conditions or other medicines.",
            "Seek medical advice for a severe, new, persistent, or worsening headache.",
        ],
        "overdose_guidance": ["Suspected overdose requires immediate medical or poison-service advice."],
    },
    {
        "generic_name": "Naproxen Sodium",
        "alternative_name": "Naproxen",
        "common_brands": [],
        "classification": "Nonsteroidal anti-inflammatory drug (NSAID)",
        "common_use": "May relieve headache, migraine, muscle, and inflammatory pain when suitable.",
        "indications": ["Headache", "Migraine pain", "Muscle pain", "Inflammatory pain"],
        "dosage_forms": ["Tablet or caplet (product dependent)"],
        "dosage_guidance": [
            "General adult OTC reference only: common strength 220 mg; initial dose 440 mg, then 220 mg every 8–12 hours as needed.",
            "Maximum OTC dose: 660 mg in 24 hours. Follow the specific product label; do not exceed its directions.",
            "Take with a full glass of water, preferably with food. This is not pediatric dosing or an individualized recommendation.",
        ],
        "side_effects": ["Nausea", "Heartburn", "Stomach pain", "Dizziness", "Constipation"],
        "medicine_specific_precautions": [
            "Avoid or seek medical advice with kidney disease, peptic ulcer, heart disease, high blood pressure, or blood-thinning medicine use.",
            "Ask a healthcare professional before use during pregnancy.",
            "Do not combine with ibuprofen, aspirin for pain, or other NSAIDs.",
        ],
        "serious_reactions": [
            "Gastrointestinal bleeding",
            "Kidney injury",
            "Cardiovascular complications",
            "Severe allergic reaction",
        ],
        "precautions": [
            "Follow the product label and ask a pharmacist whether this medicine is suitable with your conditions or other medicines.",
            "Seek medical advice for a severe, new, persistent, or worsening headache.",
        ],
        "overdose_guidance": ["Suspected overdose requires immediate medical or poison-service advice."],
    },
    {
        "generic_name": "Acetylsalicylic Acid (Aspirin)",
        "alternative_name": "Aspirin",
        "common_brands": [],
        "classification": "NSAID / analgesic / antiplatelet",
        "common_use": "May relieve mild to moderate headache and inflammatory pain in adults when suitable.",
        "indications": ["Mild to moderate headache", "General pain", "Inflammatory pain"],
        "dosage_forms": ["Tablet (strength and formulation vary)"],
        "dosage_guidance": [
            "General adult reference only: common tablet strength 325 mg; usual dose 325–650 mg orally every 4–6 hours as needed.",
            "Maximum daily intake depends on the specific product label. Follow that label and pharmacist advice.",
            "Take with water, preferably with food. This is not pediatric dosing or an individualized recommendation.",
        ],
        "side_effects": ["Stomach irritation", "Nausea", "Heartburn", "Easy bruising", "Increased bleeding"],
        "medicine_specific_precautions": [
            "Avoid with active stomach ulcers or bleeding or aspirin allergy; use caution with anticoagulants.",
            "Avoid in children and teenagers with viral illnesses because of the risk of Reye's syndrome.",
            "Avoid if dengue is suspected because of bleeding risk.",
            "Do not combine with ibuprofen, naproxen, or other NSAIDs without professional advice.",
        ],
        "serious_reactions": [
            "Gastrointestinal bleeding",
            "Severe allergic reaction",
            "Excessive bleeding",
        ],
        "precautions": [
            "Follow the product label and ask a pharmacist whether this medicine is suitable with your conditions or other medicines.",
            "Seek medical advice for a severe, new, persistent, or worsening headache.",
        ],
        "overdose_guidance": ["Suspected overdose requires immediate medical or poison-service advice."],
    },
]


ABDOMINAL_SUPPORTIVE_MEDICATIONS = [
    {
        "generic_name": "Antacids (Aluminum hydroxide and Magnesium hydroxide)",
        "alternative_name": "Aluminum hydroxide + Magnesium hydroxide",
        "common_brands": [],
        "classification": "Antacid",
        "common_use": "Neutralizes excess stomach acid and helps relieve heartburn and acid-related stomach discomfort.",
        "indications": [
            "Acid indigestion",
            "Heartburn",
            "Gastric acidity",
            "Acid-related stomach discomfort",
        ],
        "dosage_forms": ["Suspension", "Liquid formulation", "Tablet or chewable tablet (product dependent)"],
        "dosage_guidance": [
            "Follow the specific product label. Common liquid dose is 5–10 mL after meals and at bedtime for many formulations.",
            "Shake suspension well before use; use the proper measuring device.",
            "Separate from other medicines because antacids can interfere with absorption of some medicines.",
        ],
        "side_effects": ["Constipation", "Diarrhea", "Nausea", "Abdominal discomfort"],
        "medicine_specific_precautions": [
            "Use caution in kidney disease and with electrolyte imbalance.",
            "Check the exact concentration before calculating doses.",
        ],
        "serious_reactions": ["Severe allergic reaction", "Persistent vomiting", "Severe abdominal pain"],
        "precautions": [
            "Ask a pharmacist before use if you have kidney disease or are taking other medicines.",
            "Seek medical review if symptoms persist or are severe.",
        ],
        "overdose_guidance": ["Suspected overdose or repeated use beyond the label requires medical advice."],
    },
    {
        "generic_name": "Calcium carbonate",
        "alternative_name": "Calcium carbonate antacid",
        "common_brands": [],
        "classification": "Antacid",
        "common_use": "Helps relieve heartburn and acid indigestion.",
        "indications": ["Heartburn", "Acid indigestion", "Excess stomach acidity"],
        "dosage_forms": ["Tablet", "Chewable tablet"],
        "dosage_guidance": [
            "Common adult reference only: 500–1,000 mg as needed according to the product label.",
            "Chew thoroughly before swallowing.",
            "Do not exceed the daily dose on the label.",
        ],
        "side_effects": ["Constipation", "Belching", "Nausea", "Abdominal discomfort"],
        "medicine_specific_precautions": [
            "Use caution in kidney disease, kidney stones, or high blood calcium.",
            "Avoid excessive calcium supplementation.",
        ],
        "serious_reactions": ["Severe allergic reaction", "Persistent vomiting", "Severe abdominal pain"],
        "precautions": [
            "Check your other medicines before use because antacids can affect absorption.",
            "Seek medical review if symptoms persist or are severe.",
        ],
        "overdose_guidance": ["Suspected overdose or very frequent use requires medical advice."],
    },
    {
        "generic_name": "Simethicone",
        "alternative_name": "",
        "common_brands": [],
        "classification": "Antiflatulent",
        "common_use": "Helps relieve excessive intestinal gas and gas-related abdominal discomfort.",
        "indications": [
            "Excessive intestinal gas",
            "Abdominal bloating",
            "Gas-related discomfort",
            "Feeling of abdominal fullness",
        ],
        "dosage_forms": ["Chewable tablet", "Oral tablet", "Oral liquid (product dependent)"],
        "dosage_guidance": [
            "Common adult reference only: 80–125 mg orally after meals and at bedtime as needed.",
            "Chew chewable tablets thoroughly and follow the product label.",
            "This is a symptom-relief aid; it does not treat the underlying cause of gas or swelling.",
        ],
        "side_effects": ["Rare nausea", "Mild diarrhea", "Rare allergic reactions"],
        "medicine_specific_precautions": [
            "Check combination product ingredients before use.",
            "Persistent or severe abdominal swelling warrants medical evaluation.",
        ],
        "serious_reactions": ["Severe allergic reaction", "Worsening abdominal swelling"],
        "precautions": [
            "Do not use this as a substitute for assessment of persistent abdominal pain or distension.",
            "Seek prompt medical assessment for severe abdominal swelling or worsening symptoms.",
        ],
        "overdose_guidance": ["Suspected overdose or severe adverse reaction requires prompt medical advice."],
    },
    {
        "generic_name": "Hyoscine butylbromide",
        "alternative_name": "Scopolamine butylbromide",
        "common_brands": ["Buscopan"],
        "classification": "Antispasmodic",
        "common_use": "Helps relax intestinal smooth muscle and reduce cramps or colicky abdominal discomfort.",
        "indications": [
            "Abdominal cramps",
            "Intestinal spasms",
            "Colicky abdominal discomfort",
            "Irritable bowel syndrome-associated cramps",
        ],
        "dosage_forms": ["Tablet", "Capsule"],
        "dosage_guidance": [
            "Typical adult reference only: 10–20 mg orally up to 4 times daily, depending on the product instructions.",
            "Swallow tablets with water and follow the specific product label.",
            "Do not use this to mask severe or unexplained abdominal pain without assessment.",
        ],
        "side_effects": ["Dry mouth", "Constipation", "Blurred vision", "Increased heart rate", "Difficulty urinating"],
        "medicine_specific_precautions": [
            "Avoid in glaucoma, intestinal obstruction, myasthenia gravis, enlarged prostate, or urinary retention.",
            "Use medical assessment for severe unexplained abdominal pain.",
        ],
        "serious_reactions": ["Severe allergic reaction", "Blurred vision", "Severe urinary retention", "Worsening abdominal pain"],
        "precautions": [
            "Check the exact product instructions and suitability before use.",
            "Seek medical assessment for severe or persistent pain, fever, vomiting, or abdominal swelling.",
        ],
        "overdose_guidance": ["Suspected overdose or severe symptoms require urgent medical advice."],
    },
]


def seed_medication_catalog(db: "Session") -> int:
    """Insert or refresh bundled reference medicine entries without deleting records."""
    from sqlalchemy import select

    from .models import MedicationCatalog

    inserted = 0
    for entry in [
        PARACETAMOL_CATALOG_ENTRY,
        *PRODUCTIVE_COUGH_MEDICATIONS,
        *DRY_COUGH_MEDICATIONS,
        *DIARRHEA_MEDICATIONS,
        *VOMITING_MEDICATIONS,
        *COLD_MEDICATIONS,
        *HEADACHE_MEDICATIONS,
        *ABDOMINAL_SUPPORTIVE_MEDICATIONS,
    ]:
        existing = db.execute(
            select(MedicationCatalog).where(
                MedicationCatalog.generic_name == entry["generic_name"]
            )
        ).scalar_one_or_none()
        if existing is None:
            db.add(MedicationCatalog(**entry))
            inserted += 1
            continue
        for field, value in entry.items():
            setattr(existing, field, value)
    db.commit()
    return inserted


    # severity_weight is the score contributed by each selected symptom.
LEXICON_SEED: list[dict] = [
    # medical_term        local_term            lang  weight  category
    # --- fever ---
    {"medical_term": "fever", "local_term": "fever", "language": "en", "severity_weight": 2, "category": "general"},
    {"medical_term": "fever", "local_term": "lagnat", "language": "tl", "severity_weight": 2, "category": "general"},
    {"medical_term": "fever", "local_term": "may lagnat", "language": "tl", "severity_weight": 2, "category": "general"},
    {"medical_term": "fever", "local_term": "lumagnat", "language": "tl", "severity_weight": 2, "category": "general"},
    {"medical_term": "fever", "local_term": "mataas na lagnat", "language": "tl", "severity_weight": 2, "category": "general"},
    {"medical_term": "fever", "local_term": "nilalagnat", "language": "tl", "severity_weight": 2, "category": "general"},
    {"medical_term": "fever", "local_term": "mainit ang katawan", "language": "tl", "severity_weight": 2, "category": "general"},
    {"medical_term": "fever", "local_term": "mataas ang temperatura", "language": "tl", "severity_weight": 2, "category": "general"},
    {"medical_term": "fever", "local_term": "may init", "language": "tl", "severity_weight": 2, "category": "general"},
    {"medical_term": "fever", "local_term": "lagnt", "language": "tl", "severity_weight": 2, "category": "general"},
    # --- cough ---
    {"medical_term": "cough", "local_term": "cough", "language": "en", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "ubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "may ubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "nakakaubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "pag-ubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "inuubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "ubo nang ubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "umuubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "paubo-ubo", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "cough", "local_term": "ubu", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    # --- headache ---
    {"medical_term": "headache", "local_term": "headache", "language": "en", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "headache", "local_term": "sakit ng ulo", "language": "tl", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "headache", "local_term": "masakit ang ulo", "language": "tl", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "headache", "local_term": "sakit ulo", "language": "tl", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "headache", "local_term": "pananakit ng ulo", "language": "tl", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "headache", "local_term": "sumasakit ang ulo", "language": "tl", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "headache", "local_term": "kumikirot ang ulo", "language": "tl", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "headache", "local_term": "mabigat ang ulo", "language": "tl", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "headache", "local_term": "kirot sa ulo", "language": "tl", "severity_weight": 2, "category": "neurological"},
    # --- abdominal pain ---
    {"medical_term": "abdominal pain", "local_term": "abdominal pain", "language": "en", "severity_weight": 5, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "sakit ng tiyan", "language": "tl", "severity_weight": 5, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "masakit ang tiyan", "language": "tl", "severity_weight": 5, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "sakit sa tiyan", "language": "tl", "severity_weight": 5, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "pananakit ng tiyan", "language": "tl", "severity_weight": 5, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "masakit ang sikmura", "language": "tl", "severity_weight": 5, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "kumikirot ang tiyan", "language": "tl", "severity_weight": 5, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "kirot sa tiyan", "language": "tl", "severity_weight": 5, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "kumukulo ang tiyan", "language": "tl", "severity_weight": 5, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "stomach ache", "language": "en", "severity_weight": 5, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "sakit an tiyan", "language": "bcl", "severity_weight": 5, "category": "gastrointestinal"},
    {"medical_term": "abdominal pain", "local_term": "masakit an tiyan", "language": "bcl", "severity_weight": 5, "category": "gastrointestinal"},
    # --- vomiting ---
    {"medical_term": "vomiting", "local_term": "vomiting", "language": "en", "severity_weight": 3, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "pagsusuka", "language": "tl", "severity_weight": 3, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "nagsusuka", "language": "tl", "severity_weight": 3, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "nag susuka", "language": "tl", "severity_weight": 3, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "sumusuka", "language": "tl", "severity_weight": 3, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "sumuka", "language": "tl", "severity_weight": 3, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "nasusuka", "language": "tl", "severity_weight": 3, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "sumusuka", "language": "tl", "severity_weight": 3, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "naduwal at nagsuka", "language": "tl", "severity_weight": 3, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "isinusuka", "language": "tl", "severity_weight": 3, "category": "gastrointestinal"},
    {"medical_term": "vomiting", "local_term": "pagkahilo at pagsusuka", "language": "tl", "severity_weight": 3, "category": "gastrointestinal"},
    # --- diarrhea ---
    {"medical_term": "diarrhea", "local_term": "diarrhea", "language": "en", "severity_weight": 4, "category": "gastrointestinal"},
    {"medical_term": "diarrhea", "local_term": "pagtatae", "language": "tl", "severity_weight": 4, "category": "gastrointestinal"},
    {"medical_term": "diarrhea", "local_term": "may pagtatae", "language": "tl", "severity_weight": 4, "category": "gastrointestinal"},
    {"medical_term": "diarrhea", "local_term": "nagtatae", "language": "tl", "severity_weight": 4, "category": "gastrointestinal"},
    {"medical_term": "diarrhea", "local_term": "malabnaw ang dumi", "language": "tl", "severity_weight": 4, "category": "gastrointestinal"},
    {"medical_term": "diarrhea", "local_term": "malambot ang dumi", "language": "tl", "severity_weight": 4, "category": "gastrointestinal"},
    {"medical_term": "diarrhea", "local_term": "tubig ang dumi", "language": "tl", "severity_weight": 4, "category": "gastrointestinal"},
    {"medical_term": "diarrhea", "local_term": "madalas dumumi", "language": "tl", "severity_weight": 4, "category": "gastrointestinal"},
    {"medical_term": "diarrhea", "local_term": "lbm", "language": "tl", "severity_weight": 4, "category": "gastrointestinal"},
    # --- difficulty breathing (high severity) ---
    {"medical_term": "difficulty breathing", "local_term": "difficulty breathing", "language": "en", "severity_weight": 6, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "shortness of breath", "language": "en", "severity_weight": 6, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "hirap huminga", "language": "tl", "severity_weight": 6, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "nahihirapang huminga", "language": "tl", "severity_weight": 6, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "hindi makahinga", "language": "tl", "severity_weight": 6, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "sumisikip ang paghinga", "language": "tl", "severity_weight": 6, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "hingal", "language": "tl", "severity_weight": 6, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "hinihingal", "language": "tl", "severity_weight": 6, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "kapos sa paghinga", "language": "tl", "severity_weight": 6, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "hirap sa paghinga", "language": "tl", "severity_weight": 6, "category": "respiratory"},
    {"medical_term": "difficulty breathing", "local_term": "bumibilis ang paghinga", "language": "tl", "severity_weight": 6, "category": "respiratory"},
    # --- additional extractor-supported text symptoms ---
    {"medical_term": "colds / rhinitis", "local_term": "colds / rhinitis", "language": "en", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "colds / rhinitis", "local_term": "cold", "language": "en", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "colds / rhinitis", "local_term": "sinisipon", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "colds / rhinitis", "local_term": "sipon", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "colds / rhinitis", "local_term": "common cold", "language": "en", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "colds / rhinitis", "local_term": "stuffy nose", "language": "en", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "colds / rhinitis", "local_term": "blocked nose", "language": "en", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "colds / rhinitis", "local_term": "baradong ilong", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "colds / rhinitis", "local_term": "tumutulo ang sipon", "language": "tl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "colds / rhinitis", "local_term": "barado an ilong", "language": "bcl", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "rash", "local_term": "rash", "language": "en", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "rashes", "language": "en", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "skin rash", "language": "en", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "redness of skin", "language": "en", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "itchiness", "language": "en", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "itching", "language": "en", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "skin irritation", "language": "en", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "skin eruption", "language": "en", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "red spots on skin", "language": "en", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "itchy rash", "language": "en", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "pantal", "language": "tl", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "may pantal", "language": "tl", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "pula ng balat", "language": "tl", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "kati", "language": "tl", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "pantal sa balat", "language": "tl", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "makating pantal", "language": "tl", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "namumula ang balat", "language": "tl", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "may pantal sa lawas", "language": "bcl", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "rash", "local_term": "pantal sa lawas", "language": "bcl", "severity_weight": 2, "category": "dermatologic"},
    {"medical_term": "colds / rhinitis", "local_term": "runny nose", "language": "en", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "colds / rhinitis", "local_term": "sneezing", "language": "en", "severity_weight": 1, "category": "respiratory"},
    {"medical_term": "chest pain", "local_term": "chest pain", "language": "en", "severity_weight": 3, "category": "cardiopulmonary"},
    {"medical_term": "chest pain", "local_term": "sakit sa dibdib", "language": "tl", "severity_weight": 3, "category": "cardiopulmonary"},
    {"medical_term": "chest pain", "local_term": "sakit sa daghan", "language": "bcl", "severity_weight": 3, "category": "cardiopulmonary"},
    {"medical_term": "chest pain", "local_term": "masakit an daghan", "language": "bcl", "severity_weight": 3, "category": "cardiopulmonary"},
    {"medical_term": "chest tightness", "local_term": "chest tightness", "language": "en", "severity_weight": 3, "category": "cardiopulmonary"},
    {"medical_term": "chest tightness", "local_term": "paninikip ng dibdib", "language": "tl", "severity_weight": 3, "category": "cardiopulmonary"},
    {"medical_term": "muscle ache / body soreness", "local_term": "muscle ache / body soreness", "language": "en", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "body aches", "language": "en", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "body ache", "language": "en", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "sakit ng katawan", "language": "tl", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "masakit ang katawan", "language": "tl", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "nangangalay", "language": "tl", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "muscle pain", "language": "en", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "muscle soreness", "language": "en", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "generalized body aches", "language": "en", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "pananakit ng buong katawan", "language": "tl", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "masakit ang buong katawan", "language": "tl", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "pananakit ng kalamnan", "language": "tl", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "sakit an lawas", "language": "bcl", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "masakit an lawas", "language": "bcl", "severity_weight": 2, "category": "pain"},
    {"medical_term": "muscle ache / body soreness", "local_term": "sakit sa lawas", "language": "bcl", "severity_weight": 2, "category": "pain"},
    {"medical_term": "generalized weakness", "local_term": "generalized weakness", "language": "en", "severity_weight": 2, "category": "systemic"},
    {"medical_term": "generalized weakness", "local_term": "panghihina", "language": "tl", "severity_weight": 2, "category": "systemic"},
    {"medical_term": "generalized weakness", "local_term": "nanlalambot ang katawan", "language": "tl", "severity_weight": 2, "category": "systemic"},
    {"medical_term": "generalized weakness", "local_term": "matamlay", "language": "tl", "severity_weight": 2, "category": "systemic"},
    {"medical_term": "dizziness", "local_term": "dizziness", "language": "en", "severity_weight": 2, "category": "neuro"},
    {"medical_term": "dizziness", "local_term": "nahihilo", "language": "tl", "severity_weight": 2, "category": "neuro"},
    {"medical_term": "dizziness", "local_term": "hinihilo", "language": "tl", "severity_weight": 2, "category": "neuro"},
    {"medical_term": "blood in stool", "local_term": "blood in stool", "language": "en", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "blood in stool", "local_term": "bloody diarrhea (dysentery)", "language": "en", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "blood in stool", "local_term": "dugo sa dumi", "language": "tl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "blood in stool", "local_term": "dugo sa tae", "language": "tl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "unable to drink", "local_term": "unable to drink", "language": "en", "severity_weight": 6, "category": "emergency"},
    {"medical_term": "unable to drink", "local_term": "ayaw uminom", "language": "tl", "severity_weight": 6, "category": "emergency"},
    {"medical_term": "vomits everything", "local_term": "vomits everything", "language": "en", "severity_weight": 6, "category": "emergency"},
    {"medical_term": "vomits everything", "local_term": "cannot keep anything down", "language": "en", "severity_weight": 6, "category": "emergency"},
    {"medical_term": "vomits everything", "local_term": "isinusuka ang lahat", "language": "tl", "severity_weight": 6, "category": "emergency"},
    {"medical_term": "altered consciousness", "local_term": "very sleepy", "language": "en", "severity_weight": 6, "category": "emergency"},
    {"medical_term": "neurologic emergency", "local_term": "convulsions", "language": "en", "severity_weight": 6, "category": "emergency"},
    {"medical_term": "neurologic emergency", "local_term": "kombulsyon", "language": "tl", "severity_weight": 6, "category": "emergency"},
    # --- additional biomedical symptom coverage ---
    {"medical_term": "fatigue", "local_term": "fatigue", "language": "en", "severity_weight": 1, "category": "systemic"},
    {"medical_term": "fatigue", "local_term": "matinding pagkapagod", "language": "tl", "severity_weight": 1, "category": "systemic"},
    {"medical_term": "fatigue", "local_term": "laging pagod", "language": "tl", "severity_weight": 1, "category": "systemic"},
    {"medical_term": "fatigue", "local_term": "kapoy", "language": "bcl", "severity_weight": 1, "category": "systemic"},
    {"medical_term": "dehydration", "local_term": "dehydration", "language": "en", "severity_weight": 3, "category": "systemic"},
    {"medical_term": "dehydration", "local_term": "dehydrated", "language": "en", "severity_weight": 3, "category": "systemic"},
    {"medical_term": "dehydration", "local_term": "kulang sa tubig sa katawan", "language": "tl", "severity_weight": 3, "category": "systemic"},
    {"medical_term": "dehydration", "local_term": "kulang sa tubig an lawas", "language": "bcl", "severity_weight": 3, "category": "systemic"},
    {"medical_term": "ear pain", "local_term": "ear pain", "language": "en", "severity_weight": 1, "category": "otorhinolaryngologic"},
    {"medical_term": "ear pain", "local_term": "earache", "language": "en", "severity_weight": 1, "category": "otorhinolaryngologic"},
    {"medical_term": "ear pain", "local_term": "sakit ng tenga", "language": "tl", "severity_weight": 1, "category": "otorhinolaryngologic"},
    {"medical_term": "ear pain", "local_term": "sakit an talinga", "language": "bcl", "severity_weight": 1, "category": "otorhinolaryngologic"},
    {"medical_term": "blurred vision", "local_term": "blurred vision", "language": "en", "severity_weight": 2, "category": "ophthalmologic"},
    {"medical_term": "blurred vision", "local_term": "malabong paningin", "language": "tl", "severity_weight": 2, "category": "ophthalmologic"},
    {"medical_term": "blurred vision", "local_term": "malabo ang paningin", "language": "tl", "severity_weight": 2, "category": "ophthalmologic"},
    {"medical_term": "blurred vision", "local_term": "malabo an pagtanaw", "language": "bcl", "severity_weight": 2, "category": "ophthalmologic"},
    {"medical_term": "eye pain", "local_term": "eye pain", "language": "en", "severity_weight": 1, "category": "ophthalmologic"},
    {"medical_term": "eye pain", "local_term": "masakit ang mata", "language": "tl", "severity_weight": 1, "category": "ophthalmologic"},
    {"medical_term": "eye pain", "local_term": "sakit an mata", "language": "bcl", "severity_weight": 1, "category": "ophthalmologic"},
    {"medical_term": "nausea", "local_term": "nausea", "language": "en", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "nausea", "local_term": "pagduduwal", "language": "tl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "nausea", "local_term": "naduduwal", "language": "tl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "nausea", "local_term": "naduduwal", "language": "bcl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "constipation", "local_term": "constipation", "language": "en", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "constipation", "local_term": "hirap dumumi", "language": "tl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "constipation", "local_term": "pagtitibi", "language": "tl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "constipation", "local_term": "marigat dumumi", "language": "bcl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "heartburn", "local_term": "heartburn", "language": "en", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "heartburn", "local_term": "hapdi sa sikmura", "language": "tl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "heartburn", "local_term": "nangangasim ang sikmura", "language": "tl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "heartburn", "local_term": "hapdi an sikmura", "language": "bcl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "abdominal bloating", "local_term": "abdominal bloating", "language": "en", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "abdominal bloating", "local_term": "bloating", "language": "en", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "abdominal bloating", "local_term": "kabag", "language": "tl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "abdominal bloating", "local_term": "kabag", "language": "bcl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "loss of appetite", "local_term": "loss of appetite", "language": "en", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "loss of appetite", "local_term": "walang gana kumain", "language": "tl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "loss of appetite", "local_term": "nawalan ng gana kumain", "language": "tl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "loss of appetite", "local_term": "dae gana kumakan", "language": "bcl", "severity_weight": 1, "category": "gastrointestinal"},
    {"medical_term": "jaundice", "local_term": "jaundice", "language": "en", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "jaundice", "local_term": "yellowing of skin or eyes", "language": "en", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "jaundice", "local_term": "paninilaw ng balat", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "jaundice", "local_term": "naninilaw ang mata", "language": "tl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "jaundice", "local_term": "naninilaw an mata", "language": "bcl", "severity_weight": 2, "category": "gastrointestinal"},
    {"medical_term": "painful urination", "local_term": "painful urination", "language": "en", "severity_weight": 2, "category": "genitourinary"},
    {"medical_term": "painful urination", "local_term": "pain when urinating", "language": "en", "severity_weight": 2, "category": "genitourinary"},
    {"medical_term": "painful urination", "local_term": "masakit umihi", "language": "tl", "severity_weight": 2, "category": "genitourinary"},
    {"medical_term": "painful urination", "local_term": "masakit ang pag-ihi", "language": "tl", "severity_weight": 2, "category": "genitourinary"},
    {"medical_term": "painful urination", "local_term": "masakit mag-ihi", "language": "bcl", "severity_weight": 2, "category": "genitourinary"},
    {"medical_term": "frequent urination", "local_term": "frequent urination", "language": "en", "severity_weight": 1, "category": "genitourinary"},
    {"medical_term": "frequent urination", "local_term": "urinating frequently", "language": "en", "severity_weight": 1, "category": "genitourinary"},
    {"medical_term": "frequent urination", "local_term": "madalas umihi", "language": "tl", "severity_weight": 1, "category": "genitourinary"},
    {"medical_term": "frequent urination", "local_term": "pirmi mag-ihi", "language": "bcl", "severity_weight": 1, "category": "genitourinary"},
    {"medical_term": "blood in urine", "local_term": "blood in urine", "language": "en", "severity_weight": 2, "category": "genitourinary"},
    {"medical_term": "blood in urine", "local_term": "hematuria", "language": "en", "severity_weight": 2, "category": "genitourinary"},
    {"medical_term": "blood in urine", "local_term": "dugo sa ihi", "language": "tl", "severity_weight": 2, "category": "genitourinary"},
    {"medical_term": "blood in urine", "local_term": "dugo sa ihi", "language": "bcl", "severity_weight": 2, "category": "genitourinary"},
    {"medical_term": "joint pain", "local_term": "joint pain", "language": "en", "severity_weight": 2, "category": "musculoskeletal"},
    {"medical_term": "joint pain", "local_term": "sakit ng kasukasuan", "language": "tl", "severity_weight": 2, "category": "musculoskeletal"},
    {"medical_term": "joint pain", "local_term": "masakit ang mga kasukasuan", "language": "tl", "severity_weight": 2, "category": "musculoskeletal"},
    {"medical_term": "joint pain", "local_term": "sakit an kasukasuan", "language": "bcl", "severity_weight": 2, "category": "musculoskeletal"},
    {"medical_term": "back pain", "local_term": "back pain", "language": "en", "severity_weight": 2, "category": "musculoskeletal"},
    {"medical_term": "back pain", "local_term": "sakit ng likod", "language": "tl", "severity_weight": 2, "category": "musculoskeletal"},
    {"medical_term": "back pain", "local_term": "masakit ang likod", "language": "tl", "severity_weight": 2, "category": "musculoskeletal"},
    {"medical_term": "back pain", "local_term": "sakit an likod", "language": "bcl", "severity_weight": 2, "category": "musculoskeletal"},
    {"medical_term": "numbness or tingling", "local_term": "numbness", "language": "en", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "numbness or tingling", "local_term": "tingling", "language": "en", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "numbness or tingling", "local_term": "pamamanhid", "language": "tl", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "numbness or tingling", "local_term": "pangingilig", "language": "tl", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "numbness or tingling", "local_term": "namamanhid", "language": "bcl", "severity_weight": 2, "category": "neurological"},
    {"medical_term": "palpitations", "local_term": "palpitations", "language": "en", "severity_weight": 2, "category": "cardiovascular"},
    {"medical_term": "palpitations", "local_term": "heart palpitations", "language": "en", "severity_weight": 2, "category": "cardiovascular"},
    {"medical_term": "palpitations", "local_term": "mabilis na tibok ng puso", "language": "tl", "severity_weight": 2, "category": "cardiovascular"},
    {"medical_term": "palpitations", "local_term": "mabilis an tibok kan puso", "language": "bcl", "severity_weight": 2, "category": "cardiovascular"},
    {"medical_term": "menstrual pain", "local_term": "menstrual pain", "language": "en", "severity_weight": 2, "category": "gynecologic"},
    {"medical_term": "menstrual pain", "local_term": "period cramps", "language": "en", "severity_weight": 2, "category": "gynecologic"},
    {"medical_term": "menstrual pain", "local_term": "pananakit ng puson tuwing regla", "language": "tl", "severity_weight": 2, "category": "gynecologic"},
    {"medical_term": "menstrual pain", "local_term": "sakit sa pus-on kun may regla", "language": "bcl", "severity_weight": 2, "category": "gynecologic"},
    {"medical_term": "vaginal bleeding", "local_term": "vaginal bleeding", "language": "en", "severity_weight": 3, "category": "gynecologic"},
    {"medical_term": "vaginal bleeding", "local_term": "pagdurugo sa puwerta", "language": "tl", "severity_weight": 3, "category": "gynecologic"},
    {"medical_term": "vaginal bleeding", "local_term": "nagdudugo sa puwerta", "language": "bcl", "severity_weight": 3, "category": "gynecologic"},
    {"medical_term": "excessive thirst", "local_term": "excessive thirst", "language": "en", "severity_weight": 1, "category": "endocrine"},
    {"medical_term": "excessive thirst", "local_term": "very thirsty", "language": "en", "severity_weight": 1, "category": "endocrine"},
    {"medical_term": "excessive thirst", "local_term": "matinding uhaw", "language": "tl", "severity_weight": 1, "category": "endocrine"},
    {"medical_term": "excessive thirst", "local_term": "grabe an uhaw", "language": "bcl", "severity_weight": 1, "category": "endocrine"},
    {"medical_term": "unintentional weight loss", "local_term": "unintentional weight loss", "language": "en", "severity_weight": 2, "category": "endocrine"},
    {"medical_term": "unintentional weight loss", "local_term": "unexplained weight loss", "language": "en", "severity_weight": 2, "category": "endocrine"},
    {"medical_term": "unintentional weight loss", "local_term": "pagpayat nang hindi sinasadya", "language": "tl", "severity_weight": 2, "category": "endocrine"},
    {"medical_term": "unintentional weight loss", "local_term": "nagninipis an lawas", "language": "bcl", "severity_weight": 2, "category": "endocrine"},
    {"medical_term": "easy bruising", "local_term": "easy bruising", "language": "en", "severity_weight": 2, "category": "hematologic"},
    {"medical_term": "easy bruising", "local_term": "bruising easily", "language": "en", "severity_weight": 2, "category": "hematologic"},
    {"medical_term": "easy bruising", "local_term": "madaling magkapasa", "language": "tl", "severity_weight": 2, "category": "hematologic"},
    {"medical_term": "easy bruising", "local_term": "daling magkapasa", "language": "bcl", "severity_weight": 2, "category": "hematologic"},
]

# The canonical symptom list surfaced as selectable chips in the UI.
SELECTABLE_SYMPTOMS: list[str] = [
    "fever",
    "cough",
    "headache",
    "abdominal pain",
    "vomiting",
    "diarrhea",
    "rash",
    "colds / rhinitis",
    "muscle ache / body soreness",
    "blood in stool",
    "chest pain",
    "dizziness",
    "generalized weakness",
    "difficulty breathing",
    "dehydration",
    "fatigue",
    "ear pain",
    "blurred vision",
    "eye pain",
    "nausea",
    "constipation",
    "heartburn",
    "abdominal bloating",
    "loss of appetite",
    "jaundice",
    "painful urination",
    "frequent urination",
    "blood in urine",
    "joint pain",
    "back pain",
    "numbness or tingling",
    "palpitations",
    "menstrual pain",
    "vaginal bleeding",
    "excessive thirst",
    "unintentional weight loss",
    "easy bruising",
]


def seed_symptoms(db: Session) -> int:
    """Seed selectable symptoms and retire the former standalone sore-throat entry."""
    from sqlalchemy import func, select

    from .models import AssessmentSymptom, Symptom

    inserted = 0
    removed = False
    standalone_sore_throat = db.execute(
        select(Symptom).where(func.lower(func.trim(Symptom.name)) == "sore throat")
    ).scalar_one_or_none()
    if standalone_sore_throat is not None:
        has_assessment_history = db.execute(
            select(AssessmentSymptom.id)
            .where(AssessmentSymptom.symptom_id == standalone_sore_throat.id)
            .limit(1)
        ).first() is not None
        if has_assessment_history:
            standalone_sore_throat.is_active = False
        else:
            db.delete(standalone_sore_throat)
        removed = True

    for name in SELECTABLE_SYMPTOMS:
        existing = db.execute(select(Symptom).where(Symptom.name == name)).scalar_one_or_none()
        if existing is None:
            db.add(Symptom(name=name, description=name, category="general", is_active=True))
            inserted += 1
    if inserted or removed:
        db.commit()
    return inserted


def seed_risk_and_guide_levels(db: Session) -> None:
    """Seed the triage and guidance tables used by the class diagram."""
    from sqlalchemy import select

    from .models import GuideLevel, RiskLevel

    risk_levels = [
        ("GREEN", "Mild symptoms requiring monitoring and general advice.", 1),
        ("YELLOW", "Moderate symptoms requiring health worker review.", 2),
        ("RED", "Emergency-level symptoms requiring immediate escalation.", 3),
    ]
    for name, description, order in risk_levels:
        existing = db.execute(select(RiskLevel).where(RiskLevel.name == name)).scalar_one_or_none()
        if existing is None:
            db.add(RiskLevel(name=name, description=description, display_order=order))

    guide_levels = [
        ("general", "Standard self-care and mild symptom support.", 1),
        ("follow_up", "Follow-up guidance for yellow-tier cases.", 2),
    ]
    for name, description, order in guide_levels:
        existing = db.execute(select(GuideLevel).where(GuideLevel.guide_name == name)).scalar_one_or_none()
        if existing is None:
            db.add(GuideLevel(guide_name=name, description=description, display_order=order))

    db.commit()


def seed_lexicon_rules(db: Session) -> None:
    """Seed the rule metadata used by the medication generation model."""
    from sqlalchemy import select

    from .models import GuideLevel, LexiconRule, LexiconRuleBase, RiskLevel

    base = db.execute(
        select(LexiconRuleBase).where(LexiconRuleBase.name == "default_rule_base")
    ).scalar_one_or_none()
    if base is None:
        base = LexiconRuleBase(
            name="default_rule_base",
            description="Default rule base for symptom mappings and escalation thresholds.",
            version="1.0",
        )
        db.add(base)
        db.flush()

    rules = [
        ("fever", "fever", "GREEN", "general", 1.0),
        ("fever", "fever", "YELLOW", "follow_up", 1.2),
        ("cough", "cough", "GREEN", "general", 0.8),
        ("cough", "cough", "YELLOW", "follow_up", 1.0),
        ("difficulty breathing", "difficulty breathing", "RED", None, 6.0),
    ]

    for term, normalized_term, risk_name, guide_name, weight in rules:
        risk = db.execute(select(RiskLevel).where(RiskLevel.name == risk_name)).scalar_one_or_none() if risk_name else None
        guide = db.execute(select(GuideLevel).where(GuideLevel.guide_name == guide_name)).scalar_one_or_none() if guide_name else None
        matches = db.execute(
            select(LexiconRule).where(LexiconRule.term == term, LexiconRule.normalized_term == normalized_term)
        ).scalars().all()

        existing = matches[0] if matches else None
        if existing is None:
            db.add(
                LexiconRule(
                    term=term,
                    normalized_term=normalized_term,
                    risk_level_id=risk.id if risk else None,
                    guide_level_id=guide.id if guide else None,
                    weight=weight,
                    is_active=True,
                    rule_base_id=base.id,
                )
            )
            continue

        existing.rule_base_id = base.id
        existing.risk_level_id = risk.id if risk else existing.risk_level_id
        existing.guide_level_id = guide.id if guide else existing.guide_level_id
        existing.weight = weight
        existing.is_active = True

        for duplicate in matches[1:]:
            db.delete(duplicate)

    db.commit()


def seed_lexicon(db: Session) -> int:
    """Insert any lexicon entries that are not already present. Idempotent.

    Returns the number of new rows inserted.
    """
    from sqlalchemy import select

    from .models import SymptomLexicon

    existing = {
        (row.local_term, row.language): row
        for row in db.execute(select(SymptomLexicon)).scalars().all()
    }
    desired_keys = {(entry["local_term"], entry["language"]) for entry in LEXICON_SEED}
    for key, row in existing.items():
        if key not in desired_keys:
            db.delete(row)
    inserted = 0
    for entry in LEXICON_SEED:
        key = (entry["local_term"], entry["language"])
        current = existing.get(key)
        if current is not None:
            current.medical_term = entry["medical_term"]
            current.severity_weight = entry["severity_weight"]
            current.category = entry["category"]
            continue
        db.add(SymptomLexicon(**entry))
        inserted += 1
    if inserted or existing:
        db.commit()
    return inserted


def seed_admin(db: "Session") -> bool:
    """Create the bootstrap administrator account if it does not exist.

    Returns True if a new admin was created.
    """
    from sqlalchemy import select

    from .config import settings
    from .models import User
    from .security import hash_password

    email = settings.admin_email.strip().lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing is not None:
        return False
    db.add(
        User(
            full_name="System Administrator",
            email=email,
            password_hash=hash_password(settings.admin_password),
            role="admin",
        )
    )
    db.commit()
    return True


def seed_mho(db: "Session") -> bool:
    """Create the bootstrap MHO account if it does not exist.

    Returns True if a new MHO user was created.
    """
    from sqlalchemy import select

    from .config import settings
    from .models import User
    from .security import hash_password

    email = settings.mho_email.strip().lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing is not None:
        return False
    db.add(
        User(
            full_name="Municipal Health Officer",
            email=email,
            password_hash=hash_password(settings.mho_password),
            role="mho",
        )
    )
    db.commit()
    return True
