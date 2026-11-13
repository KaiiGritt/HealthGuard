export function isPediatricAssessmentInput(inputText: string): boolean {
  const ageMatch = inputText.match(
    /^Assessment for (?:myself,\s*aged|a person\s+aged) (\d{1,3}) (month|months|year|years)\./i,
  );
  if (!ageMatch) return false;

  const age = Number(ageMatch[1]);
  const unit = ageMatch[2].toLowerCase();
  const ageInMonths = unit.startsWith("month") ? age : age * 12;

  return ageInMonths < 18 * 12;
}
