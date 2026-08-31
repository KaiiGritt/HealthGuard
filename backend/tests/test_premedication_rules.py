from sqlalchemy import inspect, select

from app.database import Base, SessionLocal, engine
from app.models import AnalysisReport, LexiconRule, LexiconRuleBase
from app.nlp.rules import (
    build_premedication_guide,
    has_red_flag_symptom,
    should_generate_premedication,
)
from app.seed import seed_lexicon_rules, seed_risk_and_guide_levels


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
    assert has_red_flag_symptom(["fainting"]) is True
    assert has_red_flag_symptom(["bloody stool"]) is True
    assert has_red_flag_symptom(["fever", "body ache"]) is False
    assert has_red_flag_symptom(["cough"]) is False


def test_red_flag_blocks_otc_recommendation() -> None:
    """Verify that red-flag symptoms block OTC medication guidance."""
    assert build_premedication_guide("GREEN", ["difficulty breathing"]) is None
    assert build_premedication_guide("YELLOW", ["chest pain"]) is None
    assert build_premedication_guide("GREEN", ["fainting"]) is None


def test_guide_is_symptom_aware() -> None:
    """Verify that different symptom combinations produce different recommendations."""
    # Fever → Paracetamol
    guide = build_premedication_guide("GREEN", ["fever", "body ache"])
    assert guide is not None
    assert "Paracetamol" in guide.medication_name

    # Cough → Cough Relief Support
    cough_guide = build_premedication_guide("YELLOW", ["cough", "sore throat"])
    assert cough_guide is not None
    assert "Cough Relief Support" in cough_guide.medication_name

    # Generic symptoms → General Symptom Support (not repeated Paracetamol)
    generic_guide = build_premedication_guide("GREEN", ["dizziness", "fatigue"])
    assert generic_guide is not None
    assert "Paracetamol" not in generic_guide.medication_name
    assert "General Symptom Support" in generic_guide.medication_name


def test_otc_nasal_congestion_guidance() -> None:
    """Test OTC guidance for cold-like symptoms."""
    guide = build_premedication_guide("GREEN", ["nasal congestion", "sneezing"])
    assert guide is not None
    assert "Decongestant" in guide.medication_name


def test_otc_diarrhea_guidance() -> None:
    """Test OTC guidance for gastrointestinal symptoms."""
    guide = build_premedication_guide("GREEN", ["diarrhea", "stomach cramps"])
    assert guide is not None
    assert "Oral Rehydration" in guide.medication_name


def test_otc_rash_guidance() -> None:
    """Test OTC guidance for allergic/skin symptoms."""
    guide = build_premedication_guide("GREEN", ["rash", "itching"])
    assert guide is not None
    assert "Antihistamine" in guide.medication_name or "Soothing" in guide.medication_name


def test_otc_muscle_pain_guidance() -> None:
    """Test OTC guidance for muscle/joint pain."""
    guide = build_premedication_guide("GREEN", ["muscle pain", "weakness"])
    assert guide is not None
    assert "Paracetamol" in guide.medication_name or "NSAID" in guide.medication_name
