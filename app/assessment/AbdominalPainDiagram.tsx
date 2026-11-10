"use client";

import Image from "next/image";
import { localizedText, useInterfaceLanguage } from "../components/LanguageProvider";

export default function AbdominalPainDiagram() {
  const { language } = useInterfaceLanguage();

  return (
    <figure className="overflow-hidden rounded-2xl border border-[#DCE5D8] bg-white/90 p-3 shadow-[0_6px_18px_rgba(24,38,25,0.05)] sm:p-4">
      <Image
        src="/abdominal%20pain%20quadrants.jpg"
        alt={localizedText(
          language,
          "Diagram of the abdomen divided into nine regions: right and left hypochondriac, epigastric, right and left lumbar, umbilical, right and left iliac, and hypogastric.",
          "Dayagram ng tiyan na hinati sa siyam na bahagi: kanan at kaliwang hypochondriac, epigastric, kanan at kaliwang lumbar, umbilical, kanan at kaliwang iliac, at hypogastric.",
        )}
        width={500}
        height={500}
        sizes="(max-width: 1280px) 100vw, 360px"
        className="mx-auto h-auto max-h-[360px] w-full max-w-[360px] rounded-xl object-contain"
      />
      <figcaption className="mt-3 rounded-xl bg-[#F5F8F3] px-3 py-2.5 text-xs leading-relaxed text-ink-secondary sm:text-sm">
        {localizedText(
          language,
          "Match the medical labels in the diagram to the plain-language areas below. It shows location only and does not diagnose the cause.",
          "Itugma ang mga terminong medikal sa dayagram sa mga payak na pangalan ng bahagi sa ibaba. Lokasyon lamang ang ipinapakita nito at hindi tinutukoy ang sanhi.",
        )}
      </figcaption>
    </figure>
  );
}
