from sqlalchemy import inspect, select

from app.database import Base, SessionLocal, engine
from app.models import AnalysisReport, LexiconRule, LexiconRuleBase
from app.nlp.rules import build_premedication_guide, should_generate_premedication
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


def test_guide_is_symptom_aware() -> None:
    guide = build_premedication_guide("GREEN", ["fever", "body ache"])
    assert guide is not None
    assert "Paracetamol" in guide.medication_name

    cough_guide = build_premedication_guide("YELLOW", ["cough", "sore throat"])
    assert cough_guide is not None
    assert "Cough Relief Support" in cough_guide.medication_name
