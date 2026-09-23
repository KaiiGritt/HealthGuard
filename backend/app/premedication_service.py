from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Assessment, AssessmentSymptom, GuideLevel, LexiconRule, PreMedication, RiskLevel, Symptom
from .nlp.rules import build_premedication_guide


def _get_assessment_symptom_terms(db: Session, assessment: Assessment) -> list[str]:
    rows = (
        db.execute(
            select(AssessmentSymptom, Symptom.name)
            .join(Symptom, AssessmentSymptom.symptom_id == Symptom.id)
            .where(AssessmentSymptom.assessment_id == assessment.id)
        )
        .all()
    )
    if rows:
        return [str(row[1]).strip().lower() for row in rows if str(row[1]).strip()]
    return [str(item).strip().lower() for item in (assessment.detected_symptoms or []) if str(item).strip()]


def create_assessment_premedication(db: Session, assessment: Assessment) -> None:
    """Persist a medication recommendation only when the assessment is not RED."""
    if assessment.risk_level == "RED":
        return

    if db.execute(select(PreMedication).where(PreMedication.assessment_id == assessment.id)).scalar_one_or_none():
        return

    detected = _get_assessment_symptom_terms(db, assessment)
    guide = build_premedication_guide(assessment.risk_level, detected, assessment.input_text)
    if guide is None:
        return

    db.add(
        PreMedication(
            assessment_id=assessment.id,
            medication_name=guide.medication_name,
            dosage=guide.dosage,
            frequency="As directed on the approved label",
            instruction=guide.note,
            caution="Ask a pharmacist, doctor, or qualified health worker before use.",
        )
    )
    db.commit()


def get_premedication_for_assessment(db: Session, assessment_id: int) -> PreMedication | None:
    return db.execute(select(PreMedication).where(PreMedication.assessment_id == assessment_id)).scalar_one_or_none()
