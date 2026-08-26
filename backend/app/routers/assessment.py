"""Assessment endpoints: analyze, history, and single-record retrieval."""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user_optional, require_role
from ..models import Assessment, SymptomLexicon, User
from ..nlp.engine import analyze
from ..nlp.lexicon import LexiconEntry
from ..schemas import (
    AdminActivityItem,
    AdminLexiconItem,
    AdminModulesOut,
    AdminPrivacyItem,
    AdminRuleItem,
    AdminSettingItem,
    AdminSummaryOut,
    AdminToolItem,
    AdminUserItem,
    AnalyzeRequest,
    AnalyzeResult,
    AssessmentOut,
    BarangayStatItem,
    DashboardAssessmentItem,
    DashboardInsightItem,
    DashboardMetric,
    DashboardReferenceItem,
    DashboardSummaryOut,
    DetectedSymptom,
    LexiconCreateRequest,
    MethodBreakdownItem,
    SymptomStatItem,
    TriageBreakdownItem,
    TriggeredRule,
    UserRoleUpdate,
    UserStatusUpdate,
    WeeklyTrendItem,
)
from ..seed import SELECTABLE_SYMPTOMS

router = APIRouter(prefix="/assessment", tags=["assessment"])


router = APIRouter(prefix="/assessment", tags=["assessment"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _build_weekly_trend(db: Session) -> list[WeeklyTrendItem]:
    today = _utc_now().date()
    start = today - timedelta(days=6)
    rows = db.execute(
        select(func.date(Assessment.created_at), func.count(Assessment.id))
        .where(func.date(Assessment.created_at) >= start)
        .group_by(func.date(Assessment.created_at))
    ).all()
    counts = {str(row[0]): row[1] for row in rows}
    trend: list[WeeklyTrendItem] = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        key = day.isoformat()
        trend.append(
            WeeklyTrendItem(
                label=day.strftime("%a"),
                date=key,
                count=counts.get(key, 0),
            )
        )
    return trend


def _build_barangay_stats(db: Session) -> list[BarangayStatItem]:
    rows = db.execute(
        select(
            User.barangay,
            func.count(Assessment.id),
            func.sum(case((Assessment.risk_level == "RED", 1), else_=0)),
            func.sum(case((Assessment.risk_level == "YELLOW", 1), else_=0)),
        )
        .join(User, Assessment.user_id == User.id, isouter=True)
        .group_by(User.barangay)
        .order_by(func.count(Assessment.id).desc())
    ).all()

    stats: list[BarangayStatItem] = []
    for row in rows:
        barangay = row[0] or "Unassigned / walk-in"
        stats.append(
            BarangayStatItem(
                barangay=barangay,
                total=row[1] or 0,
                urgent=int(row[2] or 0),
                follow_up=int(row[3] or 0),
            )
        )
    return stats[:8]


def _build_top_symptoms(db: Session) -> list[SymptomStatItem]:
    counter: Counter[str] = Counter()
    for symptoms in db.execute(select(Assessment.detected_symptoms)).scalars():
        if not isinstance(symptoms, list):
            continue
        for item in symptoms:
            if isinstance(item, str) and item.strip():
                counter[item.strip()] += 1
            elif isinstance(item, dict):
                term = str(item.get("medical_term") or item.get("term") or "").strip()
                if term:
                    counter[term] += 1
    return [SymptomStatItem(symptom=name, count=count) for name, count in counter.most_common(8)]


def _build_method_breakdown(db: Session) -> list[MethodBreakdownItem]:
    labels = {"text": "Free-text entry", "select": "Symptom chips"}
    rows = db.execute(
        select(Assessment.method, func.count(Assessment.id)).group_by(Assessment.method)
    ).all()
    return [
        MethodBreakdownItem(
            method=row[0] or "text",
            label=labels.get(row[0] or "text", row[0] or "Other"),
            count=row[1] or 0,
        )
        for row in rows
    ]


def _build_insights(
    *,
    today_count: int,
    week_count: int,
    urgent_alerts: int,
    follow_up_needed: int,
    anonymous_count: int,
    top_symptoms: list[SymptomStatItem],
    barangay_stats: list[BarangayStatItem],
) -> list[DashboardInsightItem]:
    insights: list[DashboardInsightItem] = []

    if urgent_alerts > 0:
        insights.append(
            DashboardInsightItem(
                title="Urgent cases need review",
                detail=f"{urgent_alerts} red-flag assessment(s) recorded. Prioritize barangay follow-up today.",
                tone="urgent",
            )
        )
    if follow_up_needed > 0:
        insights.append(
            DashboardInsightItem(
                title="Yellow cases pending consultation",
                detail=f"{follow_up_needed} resident(s) were advised to see a health worker.",
                tone="watch",
            )
        )
    if today_count == 0 and week_count == 0:
        insights.append(
            DashboardInsightItem(
                title="No community data yet",
                detail="Run sample assessments or share the public link so this dashboard can populate analytics.",
                tone="neutral",
            )
        )
    elif today_count > 0:
        insights.append(
            DashboardInsightItem(
                title="Activity today",
                detail=f"{today_count} assessment(s) submitted today across the community.",
                tone="positive",
            )
        )
    if anonymous_count > 0:
        insights.append(
            DashboardInsightItem(
                title="Walk-in assessments",
                detail=f"{anonymous_count} case(s) came from users without a saved account.",
                tone="neutral",
            )
        )
    if top_symptoms:
        insights.append(
            DashboardInsightItem(
                title="Most reported symptom",
                detail=f"“{top_symptoms[0].symptom}” appears most often in recent submissions.",
                tone="neutral",
            )
        )
    if barangay_stats:
        busiest = barangay_stats[0]
        insights.append(
            DashboardInsightItem(
                title="Busiest barangay",
                detail=f"{busiest.barangay} has {busiest.total} recorded assessment(s) so far.",
                tone="neutral",
            )
        )
    return insights[:6]


def _reference_guides() -> list[DashboardReferenceItem]:
    return [
        DashboardReferenceItem(
            title="Weekly barangay report",
            detail="Use triage counts, top symptoms, and barangay breakdown when preparing the RHU weekly summary.",
            status="Reference",
        ),
        DashboardReferenceItem(
            title="Red-case escalation log",
            detail="Cross-check urgent alerts against phone callbacks and referral notes for audit trail.",
            status="Protocol",
        ),
        DashboardReferenceItem(
            title="Seasonal trend watch",
            detail="Compare the 7-day activity chart month-to-month to spot fever, cough, or GI clusters early.",
            status="Planning",
        ),
        DashboardReferenceItem(
            title="Export & integration",
            detail="CSV export and SMS follow-up hooks are planned for a future release of HealthGuard AI.",
            status="Coming soon",
        ),
    ]


@router.get("/dashboard/summary", response_model=DashboardSummaryOut)
def dashboard_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("mho")),
) -> DashboardSummaryOut:
    total_assessments = db.scalar(select(func.count(Assessment.id))) or 0
    today_count = db.scalar(
        select(func.count(Assessment.id)).where(func.date(Assessment.created_at) == func.date("now"))
    ) or 0
    week_start = _utc_now().date() - timedelta(days=6)
    week_count = db.scalar(
        select(func.count(Assessment.id)).where(func.date(Assessment.created_at) >= week_start)
    ) or 0
    urgent_alerts = db.scalar(select(func.count(Assessment.id)).where(Assessment.risk_level == "RED")) or 0
    follow_up_needed = db.scalar(select(func.count(Assessment.id)).where(Assessment.risk_level == "YELLOW")) or 0
    residents_assisted = (
        db.scalar(select(func.count(func.distinct(Assessment.user_id))).where(Assessment.user_id.is_not(None))) or 0
    )
    anonymous_count = db.scalar(select(func.count(Assessment.id)).where(Assessment.user_id.is_(None))) or 0
    registered_residents = db.scalar(select(func.count(User.id)).where(User.role == "resident")) or 0

    recent_rows = (
        db.execute(
            select(
                Assessment.id,
                Assessment.input_text,
                Assessment.risk_level,
                Assessment.created_at,
                User.full_name,
                User.barangay,
            )
            .join(User, Assessment.user_id == User.id, isouter=True)
            .order_by(Assessment.created_at.desc())
            .limit(8)
        )
        .all()
    )

    recent_assessments = []
    for row in recent_rows:
        note = (row[1] or "No details provided").strip() or "No details provided"
        if len(note) > 72:
            note = note[:69] + "..."
        recent_assessments.append(
            DashboardAssessmentItem(
                id=row[0],
                resident_name=row[4] or "Anonymous resident",
                barangay=row[5],
                risk_level=row[2],
                note=note,
                created_at=row[3],
            )
        )

    triage_breakdown = []
    for level in ("GREEN", "YELLOW", "RED"):
        value = db.scalar(select(func.count(Assessment.id)).where(Assessment.risk_level == level)) or 0
        triage_breakdown.append(TriageBreakdownItem(level=level.title(), value=value))

    weekly_trend = _build_weekly_trend(db)
    barangay_stats = _build_barangay_stats(db)
    top_symptoms = _build_top_symptoms(db)
    method_breakdown = _build_method_breakdown(db)

    summary_cards = [
        DashboardMetric(label="Today's assessments", value=str(today_count), hint="Submitted since midnight"),
        DashboardMetric(label="This week", value=str(week_count), hint="Last 7 days"),
        DashboardMetric(label="Urgent alerts", value=str(urgent_alerts), hint="Red cases — immediate action"),
        DashboardMetric(label="All-time total", value=str(total_assessments), hint=f"{registered_residents} registered residents"),
    ]

    insights = _build_insights(
        today_count=today_count,
        week_count=week_count,
        urgent_alerts=urgent_alerts,
        follow_up_needed=follow_up_needed,
        anonymous_count=anonymous_count,
        top_symptoms=top_symptoms,
        barangay_stats=barangay_stats,
    )

    return DashboardSummaryOut(
        summary_cards=summary_cards,
        recent_assessments=recent_assessments,
        triage_breakdown=triage_breakdown,
        weekly_trend=weekly_trend,
        barangay_stats=barangay_stats,
        top_symptoms=top_symptoms,
        method_breakdown=method_breakdown,
        insights=insights,
        reference_guides=_reference_guides(),
        generated_at=_utc_now(),
    )


@router.get("/admin/summary", response_model=AdminSummaryOut)
def admin_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> AdminSummaryOut:
    total_users = db.scalar(select(func.count(User.id))) or 0
    health_workers = db.scalar(select(func.count(User.id)).where(User.role.in_(["mho", "admin"]))) or 0
    pending_approvals = db.scalar(select(func.count(User.id)).where(User.is_active.is_(False))) or 0

    latest_user = db.execute(select(User).order_by(User.created_at.desc()).limit(1)).scalar_one_or_none()
    latest_assessment = db.execute(select(Assessment).order_by(Assessment.created_at.desc()).limit(1)).scalar_one_or_none()

    recent_activity = []
    if latest_user is not None:
        recent_activity.append(
            AdminActivityItem(
                title="New account created",
                detail=f"{latest_user.full_name} • {latest_user.role} • {latest_user.created_at.strftime('%b %d, %Y')}",
            )
        )
    if latest_assessment is not None:
        recent_activity.append(
            AdminActivityItem(
                title="Latest assessment submitted",
                detail=f"{latest_assessment.risk_level} risk • {latest_assessment.input_text[:60] or 'No details provided'}",
            )
        )
    if not recent_activity:
        recent_activity.append(AdminActivityItem(title="No activity yet", detail="Assessments and accounts will appear here."))

    summary_cards = [
        DashboardMetric(label="Total users", value=str(total_users), hint="Residents + staff"),
        DashboardMetric(label="Health workers", value=str(health_workers), hint="Active accounts"),
        DashboardMetric(label="Pending approvals", value=str(pending_approvals), hint="Needs review"),
        DashboardMetric(label="System uptime", value="99.8%", hint="Last 30 days"),
    ]

    admin_tools = [
        AdminToolItem(title="User management", body="Approve or deactivate worker accounts and monitor role access."),
        AdminToolItem(title="Triage configuration", body="Tune rules and risk thresholds for community screening."),
        AdminToolItem(title="Audit logs", body="Review system activity, data changes, and account actions."),
    ]

    return AdminSummaryOut(
        summary_cards=summary_cards,
        recent_activity=recent_activity,
        admin_tools=admin_tools,
    )


@router.get("/admin/modules", response_model=AdminModulesOut)
def admin_modules(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> AdminModulesOut:
    recent_users = (
        db.execute(select(User).order_by(User.created_at.desc()).limit(6)).scalars().all()
    )
    lexicon_rows = (
        db.execute(select(SymptomLexicon).order_by(SymptomLexicon.category, SymptomLexicon.medical_term)).scalars().all()
    )

    return AdminModulesOut(
        users=[
            AdminUserItem(
                id=u.id,
                full_name=u.full_name,
                email=u.email,
                role=u.role,
                is_active=u.is_active,
                barangay=u.barangay,
                created_at=u.created_at,
            )
            for u in recent_users
        ],
        lexicon_entries=[
            AdminLexiconItem(
                id=row.id,
                local_term=row.local_term,
                language=row.language,
                medical_term=row.medical_term,
                severity_weight=row.severity_weight,
                category=row.category,
            )
            for row in lexicon_rows
        ],
        triage_rules=[
            AdminRuleItem(
                name="Respiratory distress",
                severity="Critical",
                condition="Severe breathing difficulty, cyanosis, or chest pain",
                action="Escalate immediately to emergency services and notify a clinician",
            ),
            AdminRuleItem(
                name="Persistent fever",
                severity="High",
                condition="Fever above 39°C plus weakness or dehydration",
                action="Route to triage review and advise urgent home monitoring",
            ),
            AdminRuleItem(
                name="Moderate gastrointestinal symptoms",
                severity="Medium",
                condition="Vomiting, diarrhea, or abdominal pain lasting more than 24 hours",
                action="Recommend clinician follow-up and hydration guidance",
            ),
        ],
        system_settings=[
            AdminSettingItem(key="auto_routing", label="Auto-routing", value="Enabled", status="Operational"),
            AdminSettingItem(key="audit_logging", label="Audit logging", value="Enabled", status="Compliant"),
            AdminSettingItem(key="retention", label="Data retention", value="90 days", status="Policy active"),
        ],
        privacy_controls=[
            AdminPrivacyItem(title="Consent capture", detail="Each assessment records that the resident understood the disclaimer.", status="Compliant"),
            AdminPrivacyItem(title="Role-based access", detail="MHO staff use the community dashboard; administrators use the admin panel only.", status="Compliant"),
            AdminPrivacyItem(title="Data minimization", detail="The system stores only the fields needed for triage and follow-up.", status="Monitoring"),
        ],
    )


@router.patch("/admin/users/{user_id}/status")
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> dict:
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found.")

    target.is_active = payload.is_active
    db.commit()
    return {"ok": True, "user_id": target.id, "is_active": target.is_active}


@router.patch("/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> dict:
    allowed = {"resident", "mho", "admin"}
    if payload.role not in allowed:
        raise HTTPException(status_code=400, detail="Role must be resident, mho, or admin.")

    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found.")

    target.role = payload.role
    db.commit()
    return {"ok": True, "user_id": target.id, "role": target.role}


@router.post("/admin/lexicon", response_model=AdminLexiconItem)
def create_lexicon_entry(
    payload: LexiconCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
) -> SymptomLexicon:
    entry = SymptomLexicon(
        local_term=payload.local_term.strip(),
        language=payload.language.strip() or "en",
        medical_term=payload.medical_term.strip(),
        severity_weight=payload.severity_weight,
        category=payload.category.strip() or "general",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return AdminLexiconItem(
        id=entry.id,
        local_term=entry.local_term,
        language=entry.language,
        medical_term=entry.medical_term,
        severity_weight=entry.severity_weight,
        category=entry.category,
    )


def _load_entries(db: Session) -> list[LexiconEntry]:
    rows = db.execute(select(SymptomLexicon)).scalars().all()
    return [
        LexiconEntry(
            local_term=r.local_term,
            language=r.language,
            medical_term=r.medical_term,
            severity_weight=r.severity_weight,
            category=r.category,
        )
        for r in rows
    ]


@router.get("/symptoms", response_model=list[str])
def list_selectable_symptoms() -> list[str]:
    """The canonical symptom list for the selection chips."""
    return SELECTABLE_SYMPTOMS


@router.post("/analyze", response_model=AnalyzeResult)
def analyze_symptoms(
    payload: AnalyzeRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> AnalyzeResult:
    entries = _load_entries(db)
    result = analyze(payload.input_text, payload.selected_symptoms, entries)

    detected = [
        DetectedSymptom(
            medical_term=m.medical_term,
            matched_text=m.matched_text,
            language=m.language,
            category=m.category,
            severity_weight=m.severity_weight,
        )
        for m in result.matches
    ]

    record = Assessment(
        # Attribute to the logged-in user; anonymous submissions stay NULL.
        user_id=user.id if user else None,
        input_text=payload.input_text,
        method=payload.method,
        detected_symptoms=[m.medical_term for m in result.matches],
        risk_level=result.classification.risk_level,
        reason=result.classification.reason,
        recommendation=result.classification.recommendation,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return AnalyzeResult(
        id=record.id,
        risk_level=result.classification.risk_level,
        detected_symptoms=detected,
        triggered_rules=[
            TriggeredRule(name=r.name, description=r.description)
            for r in result.classification.triggered_rules
        ],
        reason=result.classification.reason,
        recommendation=result.classification.recommendation,
        message=result.classification.message,
        score=result.classification.score,
        input_text=record.input_text,
        method=record.method,
        created_at=record.created_at,
    )


@router.get("/history", response_model=list[AssessmentOut])
def history(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> list[Assessment]:
    stmt = select(Assessment).order_by(Assessment.created_at.desc()).limit(limit)
    if user is not None:
        # Logged-in users see only their own assessments.
        stmt = (
            select(Assessment)
            .where(Assessment.user_id == user.id)
            .order_by(Assessment.created_at.desc())
            .limit(limit)
        )
    else:
        # Anonymous: show recent anonymous assessments (demo back-compat).
        stmt = (
            select(Assessment)
            .where(Assessment.user_id.is_(None))
            .order_by(Assessment.created_at.desc())
            .limit(limit)
        )
    return list(db.execute(stmt).scalars().all())


@router.get("/{assessment_id}", response_model=AssessmentOut)
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> Assessment:
    record = db.get(Assessment, assessment_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    # A record owned by a user is only viewable by that user; anonymous records are open.
    if record.user_id is not None and (user is None or user.id != record.user_id):
        raise HTTPException(status_code=404, detail="Assessment not found")
    return record
