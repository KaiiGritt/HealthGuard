from sqlalchemy import inspect, select

from app.database import Base, SessionLocal, engine, migrate_medication_catalog_schema
from app.models import AnalysisReport, LexiconRule, LexiconRuleBase, MedicationCatalog
from app.nlp.rules import (
    build_premedication_guide,
    has_red_flag_symptom,
    should_generate_premedication,
)
from app.routers.assessment import (
    list_cold_medications,
    list_diarrhea_medications,
    list_headache_medications,
    list_rash_medications,
    list_vomiting_medications,
)
from app.seed import (
    COLD_MEDICATIONS,
    DIARRHEA_MEDICATIONS,
    DRY_COUGH_MEDICATIONS,
    HEADACHE_MEDICATIONS,
    PRODUCTIVE_COUGH_MEDICATIONS,
    VOMITING_MEDICATIONS,
    seed_lexicon_rules,
    seed_medication_catalog,
    seed_risk_and_guide_levels,
)


def test_diagram_entities_exist_in_metadata() -> None:
    tables = set(inspect(engine).get_table_names())
    assert "lexicon_rule_bases" in tables
    assert "analysis_reports" in tables
    assert AnalysisReport.__tablename__ == "analysis_reports"
    assert LexiconRuleBase.__tablename__ == "lexicon_rule_bases"
    assert "lexicon_rules" in tables


def test_rule_base_has_seeded_records() -> None:
    with SessionLocal() as db:
        seed_risk_and_guide_levels(db)
        seed_lexicon_rules(db)

        base = db.execute(select(LexiconRuleBase)).scalar_one_or_none()
        assert base is not None
        linked_rules = db.execute(
            select(LexiconRule).where(LexiconRule.rule_base_id == base.id)
        ).scalars().all()
        assert len(linked_rules) > 0


def test_paracetamol_catalog_is_seeded_idempotently() -> None:
    migrate_medication_catalog_schema()
    with SessionLocal() as db:
        seed_medication_catalog(db)
        assert seed_medication_catalog(db) == 0

        medicine = db.execute(
            select(MedicationCatalog).where(MedicationCatalog.generic_name == "Paracetamol")
        ).scalar_one()
        assert medicine.alternative_name == "Acetaminophen"
        assert "Analgesic" in medicine.classification
        assert any("500–1,000 mg" in item for item in medicine.dosage_guidance)
        assert any("Suspected overdose" in item for item in medicine.overdose_guidance)
        for expected in PRODUCTIVE_COUGH_MEDICATIONS:
            catalog_entry = db.execute(
                select(MedicationCatalog).where(
                    MedicationCatalog.generic_name == expected["generic_name"]
                )
            ).scalar_one()
            assert catalog_entry.classification == expected["classification"]
            assert catalog_entry.common_use == expected["common_use"]
            assert catalog_entry.dosage_forms == expected["dosage_forms"]
            assert catalog_entry.side_effects
            assert catalog_entry.serious_reactions
            assert catalog_entry.precautions
            assert catalog_entry.overdose_guidance
        for expected in DRY_COUGH_MEDICATIONS:
            catalog_entry = db.execute(
                select(MedicationCatalog).where(
                    MedicationCatalog.generic_name == expected["generic_name"]
                )
            ).scalar_one()
            assert catalog_entry.classification == expected["classification"]
            assert catalog_entry.common_brands == expected["common_brands"]
            assert catalog_entry.indications
            assert catalog_entry.dosage_guidance
            assert catalog_entry.side_effects
            assert catalog_entry.medicine_specific_precautions
            assert catalog_entry.serious_reactions
            assert catalog_entry.precautions
            assert catalog_entry.overdose_guidance
        for expected in DIARRHEA_MEDICATIONS:
            catalog_entry = db.execute(
                select(MedicationCatalog).where(
                    MedicationCatalog.generic_name == expected["generic_name"]
                )
            ).scalar_one()
            assert catalog_entry.classification == expected["classification"]
            assert catalog_entry.indications
            assert catalog_entry.dosage_guidance
            assert catalog_entry.precautions
        for expected in VOMITING_MEDICATIONS:
            catalog_entry = db.execute(
                select(MedicationCatalog).where(
                    MedicationCatalog.generic_name == expected["generic_name"]
                )
            ).scalar_one()
            assert catalog_entry.classification == expected["classification"]
            assert catalog_entry.indications
            assert catalog_entry.dosage_guidance
            assert catalog_entry.precautions
            assert catalog_entry.serious_reactions
        for expected in COLD_MEDICATIONS:
            catalog_entry = db.execute(
                select(MedicationCatalog).where(
                    MedicationCatalog.generic_name == expected["generic_name"]
                )
            ).scalar_one()
            assert catalog_entry.classification == expected["classification"]
            assert catalog_entry.indications
            assert catalog_entry.dosage_guidance
            assert catalog_entry.side_effects
            assert catalog_entry.precautions
        for expected in HEADACHE_MEDICATIONS:
            catalog_entry = db.execute(
                select(MedicationCatalog).where(
                    MedicationCatalog.generic_name == expected["generic_name"]
                )
            ).scalar_one()
            assert catalog_entry.classification == expected["classification"]
            assert catalog_entry.indications
            assert catalog_entry.dosage_guidance
            assert catalog_entry.side_effects
            assert catalog_entry.precautions
        ors = db.execute(
            select(MedicationCatalog).where(
                MedicationCatalog.generic_name == "Oral Rehydration Salts (ORS)"
            )
        ).scalar_one()
        assert any("exact amount of clean water" in item for item in ors.dosage_guidance)
        assert [item.generic_name for item in list_diarrhea_medications(db)] == [
            item["generic_name"] for item in DIARRHEA_MEDICATIONS
        ]
        assert [item.generic_name for item in list_vomiting_medications(db)] == [
            "Oral Rehydration Salts (ORS)",
            "Meclizine Hydrochloride",
        ]
        assert [item.generic_name for item in list_cold_medications(db)] == [
            "Pseudoephedrine",
            "Oxymetazoline",
            "Xylometazoline",
            "Phenylephrine",
            "Cetirizine",
            "Loratadine",
            "Chlorpheniramine",
            "Paracetamol",
            "Dextromethorphan",
            "Guaifenesin",
        ]
        assert [item.generic_name for item in list_headache_medications(db)] == [
            "Paracetamol",
            "Ibuprofen",
            "Naproxen Sodium",
            "Acetylsalicylic Acid (Aspirin)",
        ]
        assert [item.generic_name for item in list_rash_medications(db)] == [
            "Cetirizine",
            "Loratadine",
        ]
        guaifenesin = db.execute(
            select(MedicationCatalog).where(MedicationCatalog.generic_name == "Guaifenesin")
        ).scalar_one()
        assert any("200–400 mg" in item for item in guaifenesin.dosage_guidance)
        assert any("2,400 mg" in item for item in guaifenesin.dosage_guidance)
        carbocisteine = db.execute(
            select(MedicationCatalog).where(MedicationCatalog.generic_name == "Carbocisteine")
        ).scalar_one()
        assert any("750 mg" in item for item in carbocisteine.dosage_guidance)
        assert any("500 mg" in item for item in carbocisteine.dosage_guidance)
        erdosteine = db.execute(
            select(MedicationCatalog).where(MedicationCatalog.generic_name == "Erdosteine")
        ).scalar_one()
        assert any("Prescription status may apply" in item for item in erdosteine.dosage_guidance)


def test_green_and_yellow_generate_premedication() -> None:
    assert should_generate_premedication("GREEN") is True
    assert should_generate_premedication("YELLOW") is True


def test_red_does_not_generate_premedication() -> None:
    assert should_generate_premedication("RED") is False
    assert build_premedication_guide("RED", ["fever"]) is None


def test_red_flag_detection() -> None:
    """Verify red-flag symptoms are correctly identified."""
    assert has_red_flag_symptom(["difficulty breathing"]) is True
    assert has_red_flag_symptom(["chest pain"]) is True
    assert has_red_flag_symptom(["chest tightness"]) is True
    assert has_red_flag_symptom(["bloody stool"]) is False
    assert has_red_flag_symptom(["fever", "body ache"]) is False
    assert has_red_flag_symptom(["cough"]) is False


def test_red_flag_blocks_otc_recommendation() -> None:
    """Verify that red-flag symptoms block OTC medication guidance."""
    assert build_premedication_guide("GREEN", ["difficulty breathing"]) is None
    assert build_premedication_guide("YELLOW", ["chest pain"]) is None
    assert build_premedication_guide("YELLOW", ["chest tightness"]) is None


def test_guide_is_symptom_aware() -> None:
    """Verify that different symptom combinations produce different recommendations."""
    # Fever → Paracetamol
    guide = build_premedication_guide("GREEN", ["fever", "body ache"])
    assert guide is not None
    assert "Paracetamol" in guide.medication_name

    # Cough subtype guidance should not assume a dry cough.
    cough_guide = build_premedication_guide("YELLOW", ["cough", "sore throat"])
    assert cough_guide is not None
    assert cough_guide.medication_name == "Cough subtype not specified"

    # Generic symptoms → General Symptom Support (not repeated Paracetamol)
    generic_guide = build_premedication_guide("GREEN", ["dizziness", "fatigue"])
    assert generic_guide is not None
    assert "Paracetamol" not in generic_guide.medication_name
    assert "General Symptom Support" in generic_guide.medication_name


def test_otc_nasal_congestion_guidance() -> None:
    """Cold symptoms should receive self-care, not an automatic decongestant."""
    guide = build_premedication_guide("GREEN", ["colds / rhinitis", "sneezing"])
    assert guide is not None
    assert guide.medication_name == "Cold symptom self-care"
    assert any("Rest and drink fluids" in item for item in guide.precautions)
    assert any("paracetamol twice" in item for item in guide.precautions)
    assert any("one week" in item for item in guide.precautions)


def test_otc_diarrhea_guidance() -> None:
    """Test OTC guidance for gastrointestinal symptoms."""
    guide = build_premedication_guide("GREEN", ["diarrhea", "stomach cramps"])
    assert guide is not None
    assert guide.medication_name == "Diarrhea supportive care"
    assert "ORS" in guide.dosage
    assert any("48 hours" in item for item in guide.precautions)


def test_cold_symptom_guidance_is_informational_and_no_automatic_dose() -> None:
    guide = build_premedication_guide(
        "GREEN",
        ["colds / rhinitis"],
        "Selected symptom types: Stuffy nose, Runny nose.",
        age=35,
    )

    assert guide is not None
    assert guide.medication_name == "Cold symptom self-care"
    assert "No medicine or dose is selected automatically" in guide.dosage
    assert any("adult doses must not be used for children" in item for item in guide.precautions)
    assert any("phenylephrine effectiveness" in item for item in guide.precautions)


def test_headache_guidance_is_informational_and_warns_about_aspirin_and_nsaids() -> None:
    guide = build_premedication_guide("GREEN", ["headache"])

    assert guide is not None
    assert guide.medication_name == "Headache symptom self-care"
    assert "No medicine or dose is selected automatically" in guide.dosage
    assert any("Do not combine ibuprofen, naproxen, aspirin" in item for item in guide.precautions)
    assert any("Avoid aspirin in children" in item for item in guide.precautions)


def test_dehydration_or_unable_to_keep_fluids_uses_ors_only() -> None:
    dehydration = build_premedication_guide(
        "YELLOW",
        ["diarrhea", "vomiting"],
        "dark urine and urinating less than usual",
        age=36,
    )
    unable_to_keep_fluids = build_premedication_guide(
        "YELLOW",
        ["diarrhea", "vomiting"],
        "cannot keep fluids down",
        age=36,
    )

    assert dehydration is not None
    assert dehydration.medication_name == "Oral Rehydration Solution (ORS)"
    assert unable_to_keep_fluids is not None
    assert unable_to_keep_fluids.medication_name == "Oral Rehydration Solution (ORS)"


def test_medication_safety_gates() -> None:
    fever = build_premedication_guide("YELLOW", ["fever"])
    child_diarrhea = build_premedication_guide("GREEN", ["diarrhea"], age=2)
    child_cough = build_premedication_guide("GREEN", ["cough"], age=4)
    child_dry_cough = build_premedication_guide(
        "GREEN",
        ["cough"],
        "Selected symptom types: Dry cough.",
        age=5,
    )

    assert fever is not None and fever.medication_name == "Paracetamol"
    assert child_diarrhea is not None and child_diarrhea.medication_name == "Oral Rehydration Solution (ORS)"
    assert child_cough is None
    assert child_dry_cough is None


def test_persistent_cough_has_no_suppressant_guidance() -> None:
    assert build_premedication_guide("YELLOW", ["cough"], "Cough for 2 weeks") is None


def test_cough_classifications_select_safe_premedication_guidance() -> None:
    classifications = {
        "Productive cough": "Productive cough options",
        "Wet cough": "Productive cough options",
        "Cough with phlegm": "Productive cough options",
        "Cough with sputum": "Productive cough options",
        "Non-productive cough": "Dry cough options",
        "Dry cough": "Dry cough options",
        "Allergic cough": "Dry cough options",
        "Acute cough": "Cough subtype not specified",
        "Nocturnal cough": "Cough subtype not specified",
    }

    for classification, expected_guidance in classifications.items():
        guide = build_premedication_guide(
            "GREEN",
            ["cough"],
            f"Selected symptom types: {classification}.",
            age=30,
        )
        assert guide is not None, classification
        assert guide.medication_name == expected_guidance, classification

    for classification in ("Persistent cough", "Chronic cough", "Subacute cough"):
        guide = build_premedication_guide(
            "GREEN",
            ["cough"],
            f"Additional symptom details: {classification}.",
            age=30,
        )
        assert guide is not None, classification
        assert guide.medication_name == "Cough needs clinical review"
        assert "No cough medicine or dose is selected" in guide.dosage


def test_fever_pattern_classifications_flow_into_premedication() -> None:
    patterns = (
        "Continuous fever",
        "Intermittent fever",
        "Remittent fever",
        "Relapsing fever",
        "Recurrent fever",
    )

    for pattern in patterns:
        guide = build_premedication_guide(
            "GREEN",
            ["fever"],
            f"Selected symptom types: {pattern}.",
            age=30,
        )
        assert guide is not None, pattern
        assert guide.medication_name == "Paracetamol", pattern
        assert f"Reported fever pattern: {pattern}" in guide.note
        assert "does not treat the cause" in guide.note

    combined_symptoms = build_premedication_guide(
        "GREEN",
        ["fever", "cough"],
        "Selected symptom types: Continuous fever, Dry cough.",
        age=30,
    )
    assert combined_symptoms is not None
    assert combined_symptoms.medication_name == "Paracetamol"
    assert "Reported fever pattern: Continuous fever" in combined_symptoms.note

    for pattern in ("Relapsing fever", "Recurrent fever"):
        guide = build_premedication_guide(
            "GREEN",
            ["fever"],
            f"Additional symptom details: {pattern}.",
            age=30,
        )
        assert guide is not None
        assert any("separate episodes" in item for item in guide.precautions)


def test_diarrhea_classifications_select_safe_premedication_guidance() -> None:
    acute = build_premedication_guide(
        "GREEN",
        ["diarrhea"],
        "Selected symptom types: Acute diarrhea.",
        age=30,
    )
    assert acute is not None
    assert acute.medication_name == "Diarrhea supportive care"

    for classification in ("Persistent diarrhea", "Chronic diarrhea"):
        guide = build_premedication_guide(
            "GREEN",
            ["diarrhea"],
            f"Selected symptom types: {classification}.",
            age=30,
        )
        assert guide is not None, classification
        assert guide.medication_name == "Diarrhea needs clinical review"
        assert "No diarrhea medicine or dose is selected" in guide.dosage
        assert any("clinical assessment" in item for item in guide.precautions)


def test_vomiting_duration_classifications_select_safe_guidance() -> None:
    acute = build_premedication_guide(
        "GREEN",
        ["vomiting"],
        "Selected symptom types: Acute vomiting.",
        age=30,
    )
    assert acute is not None
    assert acute.medication_name == "Oral Rehydration Solution (ORS)"

    for classification in ("Persistent vomiting", "Chronic vomiting"):
        guide = build_premedication_guide(
            "GREEN",
            ["vomiting"],
            f"Selected symptom types: {classification}.",
            age=30,
        )
        assert guide is not None, classification
        assert guide.medication_name == "Vomiting needs clinical review"
        assert "No vomiting medicine or dose is selected" in guide.dosage
        assert any("clinical assessment" in item for item in guide.precautions)


def test_meclizine_guidance_is_limited_to_adult_motion_sickness() -> None:
    adult_motion_sickness = build_premedication_guide(
        "GREEN",
        ["vomiting"],
        "Motion sickness with travel-related nausea.",
        age=30,
    )
    child_motion_sickness = build_premedication_guide(
        "GREEN",
        ["vomiting"],
        "Motion sickness with travel-related nausea.",
        age=12,
    )
    unspecified_vomiting = build_premedication_guide(
        "GREEN",
        ["vomiting"],
        "Vomiting after a meal.",
        age=30,
    )
    motion_sickness_with_dehydration = build_premedication_guide(
        "YELLOW",
        ["vomiting"],
        "Motion sickness with vomiting; dark urine and urinating less than usual.",
        age=30,
    )
    motion_sickness_with_diarrhea = build_premedication_guide(
        "GREEN",
        ["vomiting", "diarrhea"],
        "Motion sickness with vomiting.",
        age=30,
    )

    assert adult_motion_sickness is not None
    assert adult_motion_sickness.medication_name == "Motion sickness vomiting support"
    assert "No meclizine dose is selected automatically" in adult_motion_sickness.dosage
    assert any("Ask a pharmacist" in item for item in adult_motion_sickness.precautions)
    assert child_motion_sickness is not None
    assert child_motion_sickness.medication_name == "Oral Rehydration Solution (ORS)"
    assert unspecified_vomiting is not None
    assert unspecified_vomiting.medication_name == "Oral Rehydration Solution (ORS)"
    assert motion_sickness_with_dehydration is not None
    assert motion_sickness_with_dehydration.medication_name == "Oral Rehydration Solution (ORS)"
    assert motion_sickness_with_diarrhea is not None
    assert motion_sickness_with_diarrhea.medication_name != "Motion sickness vomiting support"


def test_validated_subtype_medication_options() -> None:
    phlegm = build_premedication_guide("GREEN", ["cough"], "Selected symptom types: With phlegm.")
    dry_cough = build_premedication_guide("GREEN", ["cough"], "Selected symptom types: Dry cough.")
    non_productive_cough = build_premedication_guide(
        "GREEN",
        ["cough"],
        "Selected symptom types: Non-productive cough.",
    )
    ambiguous_cough = build_premedication_guide(
        "GREEN",
        ["cough"],
        "Dry cough with phlegm.",
    )
    heartburn = build_premedication_guide("GREEN", ["abdominal pain"], "Selected symptom types: Burning pain.")
    gas = build_premedication_guide("GREEN", ["abdominal pain"], "Selected symptom types: Gas.")
    vomiting = build_premedication_guide("GREEN", ["vomiting"])

    assert phlegm is not None and phlegm.medication_name == "Productive cough options"
    assert phlegm is not None
    for option in (
        "Guaifenesin — expectorant",
        "Carbocisteine — mucolytic",
        "Ambroxol — mucolytic / expectorant",
        "Bromhexine — mucolytic",
        "Acetylcysteine (NAC) — mucolytic",
        "Erdosteine — mucolytic",
    ):
        assert option in phlegm.note
    assert "Lagundi" not in phlegm.note
    assert dry_cough is not None and dry_cough.medication_name == "Dry cough options"
    assert non_productive_cough is not None and non_productive_cough.medication_name == "Dry cough options"
    assert ambiguous_cough is not None
    assert ambiguous_cough.medication_name == "Cough subtype not specified"
    for option in (
        "Dextromethorphan — antitussive",
        "Diphenhydramine — antihistamine",
        "Chlorpheniramine — antihistamine",
        "Cetirizine — antihistamine",
        "Loratadine — antihistamine",
    ):
        assert option in dry_cough.note
    assert "not a combined regimen" in dry_cough.note
    assert "No medicine or dose is selected automatically" in dry_cough.dosage
    assert "No medicine or dose is selected automatically" in phlegm.dosage
    assert heartburn is not None and "Antacids" in heartburn.medication_name
    assert gas is not None and "Simethicone" in gas.medication_name
    assert vomiting is not None and "Oral Rehydration" in vomiting.medication_name


def test_otc_rash_guidance() -> None:
    """An unexplained rash must not trigger an automatic medication."""
    guide = build_premedication_guide("GREEN", ["rash"])
    assert guide is not None
    assert guide.medication_name == "Non-drug skin care"
    assert guide.dosage == "No medicine or dose is selected automatically."


def test_itchy_rash_gets_conditional_pharmacist_guidance() -> None:
    guide = build_premedication_guide(
        "GREEN",
        ["rash"],
        "Additional symptom details: Itchiness.",
    )

    assert guide is not None
    assert guide.medication_name == "Pharmacist advice for itchy skin"
    assert guide.dosage == "No medicine or dose is selected automatically."
    assert any("cetirizine or loratadine is appropriate" in item for item in guide.precautions)
    assert any("topical corticosteroids" in item for item in guide.precautions)
    assert any("cool, wet compress for 10–15 minutes" in item for item in guide.precautions)
    assert any("eyes, mouth, or genitals" in item for item in guide.precautions)
    assert any("dengue" in item for item in guide.precautions)

    not_itchy = build_premedication_guide("GREEN", ["rash"], "rash is not itchy")
    assert not_itchy is not None
    assert not_itchy.medication_name == "Non-drug skin care"


def test_rash_with_systemic_symptoms_needs_assessment_not_antihistamine_options() -> None:
    for symptoms, text in (
        (["rash", "fever"], ""),
        (["rash"], "rash with eye pain"),
        (["rash", "muscle ache / body soreness"], ""),
    ):
        guide = build_premedication_guide("YELLOW", symptoms, text)

        assert guide is not None
        assert guide.medication_name == "Rash with systemic symptoms — medical review"
        assert guide.dosage == "No medicine or dose is selected. Arrange medical assessment."
        assert "dengue" in guide.note.lower()


def test_rash_with_urgent_warning_sign_does_not_show_medicine_options() -> None:
    guide = build_premedication_guide(
        "YELLOW",
        ["rash"],
        "rash with swelling of the lips",
    )

    assert guide is not None
    assert guide.medication_name == "Rash warning signs — urgent assessment"
    assert "emergency medical care now" in guide.dosage
    assert "do not rely on antihistamines" in guide.note


def test_otc_muscle_pain_guidance() -> None:
    """Body aches may map to label-directed paracetamol, never an automatic NSAID."""
    guide = build_premedication_guide("GREEN", ["muscle ache / body soreness"])
    assert guide is not None
    assert guide.medication_name == "Paracetamol"
    assert "NSAID" not in guide.medication_name
    assert any("Do not combine" in item for item in guide.precautions)


def test_body_aches_with_possible_dengue_do_not_recommend_nsaids() -> None:
    guide = build_premedication_guide(
        "YELLOW",
        ["muscle ache / body soreness"],
        "possible dengue with body aches",
        age=36,
    )

    assert guide is not None
    assert guide.medication_name == "Paracetamol"
    assert "ibuprofen" not in guide.medication_name.lower()
    assert "nsaid" not in guide.medication_name.lower()
