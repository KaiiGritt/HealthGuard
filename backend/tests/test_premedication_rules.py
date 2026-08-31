from sqlalchemy import inspect

from app.database import Base, engine
from app.models import AnalysisReport, LexiconRuleBase
from app.nlp.rules import build_premedication_guide, should_generate_premedication


def test_diagram_entities_exist_in_metadata() -> None:
    tables = set(inspect(engine).get_table_names())
    assert "lexicon_rule_bases" in tables
    assert "analysis_reports" in tables
    assert AnalysisReport.__tablename__ == "analysis_reports"
    assert LexiconRuleBase.__tablename__ == "lexicon_rule_bases"
    assert "lexicon_rules" in tables


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
