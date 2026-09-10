import { jsPDF } from "jspdf";

export type ReportRow = [string, string | number | null | undefined];

export type ReportSection = {
  heading: string;
  rows: ReportRow[];
};

export function buildStyledReportHtml({
  title,
  subtitle,
  generatedAt,
  sections,
}: {
  title: string;
  subtitle: string;
  generatedAt: string;
  sections: ReportSection[];
}): string {
  const escapeHtml = (value: string | number | null | undefined) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const makeTable = (rows: ReportRow[]) => {
    if (rows.length === 0) {
      return '<p style="margin:0; color:#5B5F52; font-style:italic;">No data available.</p>';
    }

    return `
      <table style="width:100%; border-collapse:collapse; margin-top:18px; font-size:14px; border:1px solid #D8DED1; background:#fff;">
        <tbody>
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="padding:11px 12px; border-bottom:1px solid #EEF1EA; font-weight:700; color:#182619; width:42%; background:#F7F9F5; letter-spacing:0.02em;">${escapeHtml(label)}</td>
                  <td style="padding:11px 12px; border-bottom:1px solid #EEF1EA; color:#2E3A30;">${escapeHtml(value)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  const sectionHtml = sections
    .map(
      (section) => `
        <section style="margin-top:30px; background:#FBF9F2; border:1px solid #D8DED1; border-radius:12px; padding:18px 20px 12px;">
          <h2 style="margin:0; font-size:18px; color:#182619; font-family:Arial, sans-serif; letter-spacing:0.04em; text-transform:uppercase; border-bottom:1px solid #D8DED1; padding-bottom:10px;">${escapeHtml(section.heading)}</h2>
          ${makeTable(section.rows)}
        </section>
      `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #EEF2EA;
            color: #182619;
            font-family: "Segoe UI", Arial, sans-serif;
          }

          body {
            padding: 20px;
          }

          .report-shell {
            max-width: 980px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #C8D0C4;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 14px 30px rgba(23, 34, 27, 0.08);
          }

          .official-header {
            background: linear-gradient(135deg, #173F2D 0%, #2C5D48 100%);
            color: #ffffff;
            padding: 30px 32px 24px;
            border-bottom: 5px solid #C7B37A;
          }

          .official-header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            margin-bottom: 12px;
          }

          .office-name {
            font-size: 11px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            opacity: 0.9;
            margin-bottom: 10px;
          }

          .official-header h1 {
            margin: 0;
            font-size: 28px;
            line-height: 1.2;
            font-weight: 700;
          }

          .official-header .meta-box {
            min-width: 210px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.18);
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 11px;
            line-height: 1.7;
          }

          .report-body {
            padding: 26px 28px 32px;
          }

          .subtitle-bar {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            padding: 12px 14px;
            margin-bottom: 10px;
            border: 1px solid #D8DED1;
            border-radius: 10px;
            background: #F7F9F5;
            font-size: 12px;
            color: #3A413A;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .report-signoff {
            margin-top: 30px;
            border-top: 1px solid #D8DED1;
            padding-top: 18px;
            display: flex;
            justify-content: space-between;
            gap: 20px;
            font-size: 12px;
            color: #3A413A;
          }

          .signature-block {
            width: 220px;
          }

          .signature-line {
            height: 42px;
            border-bottom: 1px solid #7E857D;
            margin-bottom: 8px;
          }

          @media print {
            body {
              background: white;
              padding: 0;
            }

            .report-shell {
              max-width: none;
              border: none;
              border-radius: 0;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-shell">
          <div class="official-header">
            <div class="official-header-top">
              <div>
                <div class="office-name">Municipal Health Office</div>
                <h1>${escapeHtml(title)}</h1>
              </div>
              <div class="meta-box">
                <div><strong>Report:</strong> ${escapeHtml(subtitle)}</div>
                <div><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
              </div>
            </div>
          </div>

          <div class="report-body">
            <div class="subtitle-bar">
              <span>Official Health Assessment Summary</span>
              <span>Confidential</span>
            </div>

            ${sectionHtml}

            <div class="report-signoff">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div><strong>Prepared by</strong></div>
                <div>Health Data Unit</div>
              </div>
              <div class="signature-block">
                <div class="signature-line"></div>
                <div><strong>Reviewed / Approved</strong></div>
                <div>Municipal Health Officer</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function openReportForPrinting({
  title,
  subtitle,
  generatedAt,
  sections,
}: {
  title: string;
  subtitle: string;
  generatedAt: string;
  sections: ReportSection[];
}) {
  const reportHtml = buildStyledReportHtml({ title, subtitle, generatedAt, sections });

  const printReady = (target: Window | null) => {
    if (!target) return;

    try {
      target.focus();
      target.document.title = title;
      target.print();
    } catch {
      // Ignore browser-level print restrictions; the user will still see the report.
    }
  };

  try {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1200,height=1400");

    if (popup) {
      popup.document.open();
      popup.document.write(reportHtml);
      popup.document.close();

      const triggerPrint = () => {
        setTimeout(() => printReady(popup), 300);
      };

      if (popup.document.readyState === "complete") {
        triggerPrint();
      } else {
        popup.addEventListener("load", triggerPrint, { once: true });
      }

      return true;
    }
  } catch {
    // Fall through to iframe fallback below.
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.setAttribute("aria-hidden", "true");
  iframe.srcdoc = reportHtml;
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      try {
        iframe.remove();
      } catch {
        // No-op when the element is already gone.
      }
    }, 800);
  };

  iframe.onload = () => {
    setTimeout(() => {
      try {
        const printWindow = iframe.contentWindow;
        if (!printWindow) {
          cleanup();
          return;
        }

        printWindow.focus();
        printWindow.print();
      } catch {
        // Some browsers still block programmatic printing, but the user can print via the preview.
      }
      cleanup();
    }, 400);
  };

  return true;
}

export function downloadReport({
  title,
  subtitle,
  generatedAt,
  sections,
  filename,
}: {
  title: string;
  subtitle: string;
  generatedAt: string;
  sections: ReportSection[];
  filename: string;
}) {
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const ensureSpace = (height: number) => {
    if (cursorY + height > pageHeight - margin) {
      document.addPage();
      cursorY = margin;
    }
  };

  document.setFillColor(23, 63, 45);
  document.rect(0, 0, pageWidth, 38, "F");
  document.setFillColor(199, 179, 122);
  document.rect(0, 38, pageWidth, 2, "F");
  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.text("MUNICIPAL HEALTH OFFICE", margin, 16);
  document.setFontSize(21);
  document.text(title, margin, 29);
  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  document.text(`Report: ${subtitle}`, pageWidth - margin, 16, { align: "right" });
  document.text(`Generated: ${generatedAt}`, pageWidth - margin, 22, { align: "right" });

  cursorY = 52;
  document.setFillColor(247, 249, 245);
  document.setDrawColor(216, 222, 209);
  document.roundedRect(margin, cursorY, contentWidth, 10, 2, 2, "FD");
  document.setTextColor(58, 65, 58);
  document.setFontSize(8);
  document.text("OFFICIAL HEALTH ASSESSMENT SUMMARY", margin + 5, cursorY + 6.5);
  document.text("CONFIDENTIAL", pageWidth - margin - 5, cursorY + 6.5, { align: "right" });
  cursorY += 18;

  sections.forEach((section) => {
    const headingHeight = 12;
    ensureSpace(headingHeight + 15);
    document.setFillColor(251, 249, 242);
    document.setDrawColor(216, 222, 209);
    document.roundedRect(margin, cursorY, contentWidth, headingHeight, 2, 2, "FD");
    document.setTextColor(24, 38, 25);
    document.setFont("helvetica", "bold");
    document.setFontSize(11);
    document.text(section.heading.toUpperCase(), margin + 5, cursorY + 7.5);
    cursorY += headingHeight;

    section.rows.forEach(([label, value]) => {
      const valueLines = document.splitTextToSize(String(value ?? ""), contentWidth - 70) as string[];
      const rowHeight = Math.max(9, valueLines.length * 4.5 + 4);
      ensureSpace(rowHeight);
      document.setFillColor(247, 249, 245);
      document.setDrawColor(238, 241, 234);
      document.rect(margin, cursorY, 55, rowHeight, "FD");
      document.setFillColor(255, 255, 255);
      document.rect(margin + 55, cursorY, contentWidth - 55, rowHeight, "FD");
      document.setTextColor(24, 38, 25);
      document.setFont("helvetica", "bold");
      document.setFontSize(8.5);
      document.text(String(label), margin + 4, cursorY + 5.5);
      document.setTextColor(46, 58, 48);
      document.setFont("helvetica", "normal");
      document.text(valueLines, margin + 59, cursorY + 5.5);
      cursorY += rowHeight;
    });
    cursorY += 8;
  });

  ensureSpace(34);
  document.setDrawColor(216, 222, 209);
  document.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 15;
  document.setTextColor(58, 65, 58);
  document.setFontSize(8);
  document.line(margin, cursorY, margin + 62, cursorY);
  document.line(pageWidth - margin - 62, cursorY, pageWidth - margin, cursorY);
  document.setFont("helvetica", "bold");
  document.text("Prepared by", margin, cursorY + 5);
  document.text("Reviewed / Approved", pageWidth - margin - 62, cursorY + 5);
  document.setFont("helvetica", "normal");
  document.text("Health Data Unit", margin, cursorY + 10);
  document.text("Municipal Health Officer", pageWidth - margin - 62, cursorY + 10);

  const pageCount = document.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page);
    document.setTextColor(124, 133, 125);
    document.setFontSize(7);
    document.text(`HealthGuard • Confidential • Page ${page} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
  }

  document.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  return true;
}
