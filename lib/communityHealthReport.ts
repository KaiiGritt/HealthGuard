import type { DashboardSummary, Icd10SymptomCode, Icd10UncodedSymptom } from "@/lib/api";

export interface CommunityHealthReport {
  report_period: string;
  executive_summary: string;
  key_metrics: Array<{ label: string; value: string; context: string }>;
  urgent_cases_summary: {
    count: number;
    narrative: string;
    barangays_involved: string[];
  };
  barangay_breakdown: Array<{ barangay: string; narrative: string }>;
  trend_narrative: string;
  top_symptoms_narrative: string;
  top_symptoms: Array<{
    symptom: string;
    count: number;
    icd10_code: Icd10SymptomCode | null;
    icd10_uncoded: Icd10UncodedSymptom | null;
  }>;
  recommended_actions: string[];
}

function countFromMetric(summary: DashboardSummary, label: string) {
  const metric = summary.summary_cards.find((card) => card.label.toLowerCase() === label.toLowerCase());
  const value = Number(metric?.value);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function formatDate(date: Date, locale = "en") {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function makeReportPeriod(asOf: Date, locale = "en") {
  const end = new Date(asOf);
  const start = new Date(asOf);
  start.setDate(start.getDate() - 6);
  return `${formatDate(start, locale)} - ${formatDate(end, locale)}`;
}

export function generateCommunityHealthReport(
  summary: DashboardSummary,
  asOf = new Date(summary.generated_at),
  language: "en" | "fil" | "both" = "en",
): CommunityHealthReport {
  const safeAsOf = Number.isNaN(asOf.getTime()) ? new Date() : asOf;
  const casesThisWeek = countFromMetric(summary, "This week");
  const urgentCount = countFromMetric(summary, "Urgent alerts");
  const triageCount = (level: string) =>
    summary.triage_breakdown.find((item) => item.level.toLowerCase() === level)?.value ?? 0;
  const redCount = triageCount("red");
  const yellowCount = triageCount("yellow");
  const greenCount = triageCount("green");
  const sampleCaution = casesThisWeek < 10
    ? `Based on a small sample (${casesThisWeek} assessments in the last 7 days), this activity should be interpreted cautiously.`
    : "";
  const activeUrgentByBarangay = summary.barangay_stats
    .filter((item) => item.urgent > 0)
    .sort((a, b) => b.urgent - a.urgent || b.total - a.total);
  const urgentBarangays = activeUrgentByBarangay.map((item) => item.barangay);
  const priorityBarangay = activeUrgentByBarangay[0];
  const barangayTotal = summary.barangay_stats.reduce((total, item) => total + item.total, 0);
  const notableBarangays = [...summary.barangay_stats]
    .sort((a, b) => b.urgent - a.urgent || b.follow_up - a.follow_up || b.total - a.total)
    .filter((item) => item.urgent > 0 || item.follow_up > 0 || item.total === Math.max(...summary.barangay_stats.map((entry) => entry.total)))
    .slice(0, 5);
  const currentTrend = summary.weekly_trend.at(-1);
  const previousTrend = summary.weekly_trend.at(-2);
  const trendNarrative = currentTrend && previousTrend
    ? `The dashboard records ${currentTrend.count} assessments for ${currentTrend.label.toLowerCase()} and ${previousTrend.count} for ${previousTrend.label.toLowerCase()} (${currentTrend.count - previousTrend.count >= 0 ? "+" : ""}${currentTrend.count - previousTrend.count}). The current week may be incomplete.${sampleCaution ? ` ${sampleCaution}` : ""}`
    : `There is not enough weekly trend data to compare periods.${sampleCaution ? ` ${sampleCaution}` : ""}`;
  const topSymptoms = summary.top_symptoms.slice(0, 3);
  const topSymptomsNarrative = topSymptoms.length > 0
    ? `The most frequently recorded symptoms in the dashboard are ${topSymptoms.map((item) => `${item.symptom} (${item.count}${item.icd10_code ? `, ICD-10 ${item.icd10_code.code}` : ""})`).join(", ")}. These are references for reported symptoms, not diagnoses; counts do not establish a cause or outbreak.`
    : "No symptom frequency data is available in the dashboard for this report.";
  const barangayBreakdown = notableBarangays.map((item) => {
    const details = [`${item.total} recorded assessment${item.total === 1 ? "" : "s"} in the dashboard summary`];
    if (item.urgent > 0) details.push(`${item.urgent} active urgent`);
    if (item.follow_up > 0) details.push(`${item.follow_up} follow-up`);
    return {
      barangay: item.barangay,
      narrative: `${details.join(", ")}. ${item.urgent > 0 ? "Prioritize review of its active urgent cases." : item.follow_up > 0 ? "Review its follow-up cases." : "It has the highest recorded case volume in the barangay summary."}`,
    };
  });
  const actions: string[] = [];
  if (priorityBarangay) {
    actions.push(
      `Prioritize review of ${priorityBarangay.barangay}: the dashboard lists ${priorityBarangay.urgent} active urgent case${priorityBarangay.urgent === 1 ? "" : "s"} there.`,
    );
  } else if (urgentCount > 0) {
    actions.push(`Review the ${urgentCount} active urgent case${urgentCount === 1 ? "" : "s"} in the assessment records; the barangay summary does not identify a location with active urgent cases.`);
  }
  const followUpPriority = [...summary.barangay_stats]
    .filter((item) => item.follow_up > 0)
    .sort((a, b) => b.follow_up - a.follow_up || b.total - a.total)[0];
  if (followUpPriority) {
    actions.push(
      `Review the ${followUpPriority.follow_up} follow-up case${followUpPriority.follow_up === 1 ? "" : "s"} recorded for ${followUpPriority.barangay}.`,
    );
  }
  if (casesThisWeek < 10 && actions.length === 0) {
    actions.push("Use the next dashboard refresh to check whether the small number of reports changes before drawing conclusions.");
  }

  const urgentNarrative = urgentCount === 0
    ? "No active urgent cases are listed in the dashboard summary."
    : priorityBarangay
      ? `${urgentCount} active urgent case${urgentCount === 1 ? "" : "s"} are listed. ${priorityBarangay.barangay} has the largest barangay-level urgent count (${priorityBarangay.urgent}); counts may cover different dashboard reporting scopes.`
      : `${urgentCount} active urgent case${urgentCount === 1 ? "" : "s"} are listed, but the barangay summary does not identify a location with active urgent cases.`;

  let executiveSummary: string;
  if (urgentCount > 0) {
    executiveSummary = `${urgentCount} active urgent case${urgentCount === 1 ? "" : "s"} need review${priorityBarangay ? `, with the highest barangay-level urgent count in ${priorityBarangay.barangay}` : ""}. ${casesThisWeek} assessments were submitted in the last 7 days.${sampleCaution ? ` ${sampleCaution}` : ""}`;
  } else {
    executiveSummary = `${casesThisWeek} assessments were submitted in the last 7 days, and no active urgent cases are listed in the dashboard summary. ${sampleCaution || "The dashboard’s triage and barangay totals provide the wider context for this snapshot."}`;
  }

  const englishReport: CommunityHealthReport = {
    report_period: `Last 7 days (${makeReportPeriod(safeAsOf)})`,
    executive_summary: executiveSummary,
    key_metrics: [
      {
        label: "Assessments, last 7 days",
        value: String(casesThisWeek),
        context: casesThisWeek < 10 ? "Small sample; interpret cautiously" : "Recent community activity",
      },
      {
        label: "Active urgent cases",
        value: String(urgentCount),
        context: urgentCount > 0 ? "Listed for review in the dashboard" : "None currently listed",
      },
      {
        label: "Triage totals",
        value: `${redCount} red · ${yellowCount} yellow · ${greenCount} green`,
        context: "Recorded dashboard totals; not limited to the last 7 days",
      },
      {
        label: "Barangays in summary",
        value: String(summary.barangay_stats.length),
        context: `${barangayTotal} assessments represented in the barangay summary`,
      },
    ],
    urgent_cases_summary: {
      count: urgentCount,
      narrative: urgentNarrative,
      barangays_involved: urgentBarangays,
    },
    barangay_breakdown: barangayBreakdown,
    trend_narrative: trendNarrative,
    top_symptoms_narrative: topSymptomsNarrative,
    top_symptoms: topSymptoms.map((item) => ({
      symptom: item.symptom,
      count: item.count,
      icd10_code: item.icd10_code ?? null,
      icd10_uncoded: item.icd10_uncoded ?? null,
    })),
    recommended_actions: actions,
  };

  if (language === "en") return englishReport;

  const filipinoCaution = casesThisWeek < 10
    ? `Batay ito sa maliit na bilang (${casesThisWeek} pagsusuri sa nakaraang 7 araw), kaya bigyang-kahulugan ang datos nang may pag-iingat.`
    : "";
  const filipinoExecutiveSummary = urgentCount > 0
    ? `${urgentCount} aktibong agarang kaso ang kailangang suriin${priorityBarangay ? `; pinakamataas ang bilang ng agarang kaso sa ${priorityBarangay.barangay}` : ""}. ${casesThisWeek} pagsusuri ang naisumite sa nakaraang 7 araw.${filipinoCaution ? ` ${filipinoCaution}` : ""}`
    : `${casesThisWeek} pagsusuri ang naisumite sa nakaraang 7 araw at walang aktibong agarang kasong nakalista sa buod ng dashboard. ${filipinoCaution || "Nagbibigay ng karagdagang konteksto ang kabuuang triage at barangay para sa buod na ito."}`;
  const filipinoReport: CommunityHealthReport = {
    report_period: `Nakaraang 7 araw (${makeReportPeriod(safeAsOf, "fil-PH")})`,
    executive_summary: filipinoExecutiveSummary,
    key_metrics: [
      {
        label: "Mga pagsusuri sa nakaraang 7 araw",
        value: String(casesThisWeek),
        context: casesThisWeek < 10 ? "Maliit na bilang; bigyang-kahulugan nang may pag-iingat" : "Kamakailang aktibidad ng komunidad",
      },
      {
        label: "Mga aktibong agarang kaso",
        value: String(urgentCount),
        context: urgentCount > 0 ? "Nakalista para suriin sa dashboard" : "Walang kasalukuyang nakalista",
      },
      {
        label: "Kabuuang triage",
        value: `${redCount} pula · ${yellowCount} dilaw · ${greenCount} berde`,
        context: "Kabuuang naitala sa dashboard; hindi lamang sa nakaraang 7 araw",
      },
      {
        label: "Mga barangay sa buod",
        value: String(summary.barangay_stats.length),
        context: `${barangayTotal} pagsusuring kinakatawan sa buod ng barangay`,
      },
    ],
    urgent_cases_summary: {
      count: urgentCount,
      narrative: urgentCount === 0
        ? "Walang aktibong agarang kasong nakalista sa buod ng dashboard."
        : priorityBarangay
          ? `${urgentCount} aktibong agarang kaso ang nakalista. Pinakamataas ang bilang sa ${priorityBarangay.barangay} (${priorityBarangay.urgent}); maaaring magkaiba ang saklaw ng mga bilang sa dashboard.`
          : `${urgentCount} aktibong agarang kaso ang nakalista, ngunit walang tinukoy na lokasyon sa buod ng barangay.`,
      barangays_involved: urgentBarangays,
    },
    barangay_breakdown: notableBarangays.map((item) => ({
      barangay: item.barangay,
      narrative: `${item.total} naitalang pagsusuri sa buod ng dashboard${item.urgent > 0 ? `, ${item.urgent} aktibong agarang kaso` : ""}${item.follow_up > 0 ? `, ${item.follow_up} kasong kailangang i-follow-up` : ""}. ${item.urgent > 0 ? "Unahin ang pagsusuri sa mga aktibong agarang kaso." : item.follow_up > 0 ? "Suriin ang mga kasong kailangang i-follow-up." : "Ito ang may pinakamataas na naitalang bilang ng kaso sa buod ng mga barangay."}`,
    })),
    trend_narrative: currentTrend && previousTrend
      ? `Nagtala ang dashboard ng ${currentTrend.count} pagsusuri para sa ${currentTrend.label.toLowerCase()} at ${previousTrend.count} para sa ${previousTrend.label.toLowerCase()} (${currentTrend.count - previousTrend.count >= 0 ? "+" : ""}${currentTrend.count - previousTrend.count}). Maaaring hindi pa kumpleto ang kasalukuyang linggo.${filipinoCaution ? ` ${filipinoCaution}` : ""}`
      : `Hindi sapat ang datos ng lingguhang trend upang maihambing ang mga panahon.${filipinoCaution ? ` ${filipinoCaution}` : ""}`,
    top_symptoms_narrative: topSymptoms.length > 0
      ? `Ang mga sintomas na pinakamadalas naitala sa dashboard ay ${topSymptoms.map((item) => `${item.symptom} (${item.count}${item.icd10_code ? `, ICD-10 ${item.icd10_code.code}` : ""})`).join(", ")}. Mga sanggunian ito para sa naiulat na sintomas, hindi mga diagnosis; hindi pinatutunayan ng bilang ang sanhi o pagkalat ng sakit.`
      : "Walang datos ng dalas ng sintomas sa dashboard para sa ulat na ito.",
    top_symptoms: topSymptoms.map((item) => ({
      symptom: item.symptom,
      count: item.count,
      icd10_code: item.icd10_code ?? null,
      icd10_uncoded: item.icd10_uncoded ?? null,
    })),
    recommended_actions: [
      ...(priorityBarangay
        ? [`Unahin ang pagsusuri sa ${priorityBarangay.barangay}: nakatala sa dashboard ang ${priorityBarangay.urgent} aktibong agarang kaso roon.`]
        : urgentCount > 0
          ? [`Suriin ang ${urgentCount} aktibong agarang kaso sa mga tala ng pagsusuri; walang tinukoy na lokasyon ng mga ito sa buod ng barangay.`]
          : []),
      ...(followUpPriority
        ? [`Suriin ang ${followUpPriority.follow_up} kasong kailangang i-follow-up sa ${followUpPriority.barangay}.`]
        : []),
      ...(casesThisWeek < 10 && actions.length === 0
        ? ["Sa susunod na pag-refresh ng dashboard, tiyaking suriin kung nagbabago ang maliit na bilang ng mga ulat bago bumuo ng konklusyon."]
        : []),
    ],
  };

  if (language === "fil") return filipinoReport;
  const combine = (english: string, filipino: string) => `${english} / ${filipino}`;
  return {
    ...englishReport,
    report_period: combine(englishReport.report_period, filipinoReport.report_period),
    executive_summary: combine(englishReport.executive_summary, filipinoReport.executive_summary),
    key_metrics: englishReport.key_metrics.map((metric, index) => ({
      label: combine(metric.label, filipinoReport.key_metrics[index].label),
      value: metric.value === filipinoReport.key_metrics[index].value
        ? metric.value
        : combine(metric.value, filipinoReport.key_metrics[index].value),
      context: combine(metric.context, filipinoReport.key_metrics[index].context),
    })),
    urgent_cases_summary: {
      ...englishReport.urgent_cases_summary,
      narrative: combine(englishReport.urgent_cases_summary.narrative, filipinoReport.urgent_cases_summary.narrative),
    },
    barangay_breakdown: englishReport.barangay_breakdown.map((item, index) => ({
      ...item,
      narrative: combine(item.narrative, filipinoReport.barangay_breakdown[index].narrative),
    })),
    trend_narrative: combine(englishReport.trend_narrative, filipinoReport.trend_narrative),
    top_symptoms_narrative: combine(englishReport.top_symptoms_narrative, filipinoReport.top_symptoms_narrative),
    recommended_actions: englishReport.recommended_actions.map((action, index) =>
      combine(action, filipinoReport.recommended_actions[index]),
    ),
  };
}
