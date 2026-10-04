"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AssessmentMode = "self" | "someone";

const AssessmentTargetContext = createContext<AssessmentMode | null>(null);

export function AssessmentTargetProvider({ mode, children }: { mode: AssessmentMode; children: ReactNode }) {
  return <AssessmentTargetContext.Provider value={mode}>{children}</AssessmentTargetContext.Provider>;
}

export function useAssessmentMode() {
  return useContext(AssessmentTargetContext);
}