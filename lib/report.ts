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
      return '<p style="margin:0; color:#5B5F52;">No data available.</p>';
    }

    return `
      <table style="width:100%; border-collapse:collapse; margin-top:16px; font-size:14px; border:1px solid #D8DED1; background:#fff;">
        <tbody>
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="padding:10px 12px; border-bottom:1px solid #EEF1EA; font-weight:600; color:#182619; width:42%; background:#F7F9F5;">${escapeHtml(label)}</td>
                  <td style="padding:10px 12px; border-bottom:1px solid #EEF1EA; color:#2E3A30;">${escapeHtml(value)}</td>
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
        <section style="margin-top:28px; background:#FBF9F2; border:1px solid #D8DED1; border-radius:14px; padding:20px;">
          <h2 style="margin:0; font-size:20px; color:#182619; font-family:Arial, sans-serif;">${escapeHtml(section.heading)}</h2>
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
          body {
            margin: 0;
            padding: 32px 20px 48px;
            background: #F4F7F1;
            color: #182619;
            font-family: Arial, sans-serif;
          }
          .report-shell {
            max-width: 980px;
            margin: 0 auto;
            background: #fff;
            border: 1px solid #D8DED1;
            border-radius: 18px;
            box-shadow: 0 14px 28px rgba(24, 38, 25, 0.06);
            overflow: hidden;
          }
          .report-header {
            background: linear-gradient(135deg, #1F4A36 0%, #2F6B4F 100%);
            color: white;
            padding: 26px 28px;
          }
          .report-header h1 {
            margin: 0 0 8px;
            font-size: 30px;
            line-height: 1.2;
          }
          .report-header p {
            margin: 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .report-body {
            padding: 28px;
          }
          @media print {
            body { background: white; padding: 0; }
            .report-shell { box-shadow: none; border: none; } 
          }
        </style>
      </head>
      <body>
        <div class="report-shell">
          <div class="report-header">
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(subtitle)} · Generated ${escapeHtml(generatedAt)}</p>
          </div>
          <div class="report-body">
            ${sectionHtml}
          </div>
        </div>
      </body>
    </html>
  `;
}
