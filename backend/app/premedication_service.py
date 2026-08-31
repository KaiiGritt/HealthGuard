from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Assessment, AssessmentSymptom, GuideLevel, LexiconRule, PreMedication, RiskLevel, Symptom


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
    lowered = " ".join(detected)

    if any(token in lowered for token in ("fever", "lagnat")):
        medication_name = "Paracetamol (Biogesic / Tempra / Calpol)"
        dosage = "500 mg every 4 to 6 hours as needed. Do not exceed the label dose in 24 hours."
        frequency = "As needed, max per label"
        instruction = "Use the lowest dose that works for the shortest time needed. Avoid alcohol while taking it."
        caution = "Seek review if symptoms worsen or if you are pregnant, breastfeeding, or have liver or kidney problems."
    elif any(token in lowered for token in ("cough", "ubo")):
        medication_name = "Cough Relief Support"
        dosage = "Follow the product label; use the smallest effective dose for a short time only."
        frequency = "As directed on label"
        instruction = "Drink fluids, rest, and avoid prolonged use without advice from a pharmacist or doctor."
        caution = "Do not drive if it makes you drowsy. Seek care if breathing difficulty occurs."
    else:
        medication_name = "Paracetamol (Biogesic / Tempra / Calpol)"
        dosage = "Use the lowest effective dose and follow the label exactly."
        frequency = "As needed"
        instruction = "Use only for short-term symptom relief while monitoring your condition."
        caution = "Consult a health worker if symptoms persist or worsen."

    db.add(
        PreMedication(
            assessment_id=assessment.id,
            medication_name=medication_name,
            dosage=dosage,
            frequency=frequency,
            instruction=instruction,
            caution=caution,
        )
    )
    db.commit()


def get_premedication_for_assessment(db: Session, assessment_id: int) -> PreMedication | None:
    return db.execute(select(PreMedication).where(PreMedication.assessment_id == assessment_id)).scalar_one_or_none()
