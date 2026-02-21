import type { Case, Match } from '@/types';

// ─── CSV Export ──────────────────────────────────────────────
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportMatchesToCsv(matches: Match[], caseName: string) {
  const headers = ['Match ID', 'Matched Name', 'Strength %', 'Dataset', 'Status', 'Risk Level', 'Priority', 'Aliases', 'Reason'];
  const rows = matches.map(m => [
    m.id,
    m.matchedName,
    m.strength,
    m.dataset,
    m.status,
    m.riskLevel,
    m.priorityLevel,
    m.aliases.join('; '),
    m.reason,
  ].map(escapeCsv).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `${caseName.replace(/\s+/g, '_')}_matches.csv`, 'text/csv;charset=utf-8;');
}

// ─── PDF Export (generates printable HTML) ───────────────────
function openPrintWindow(html: string, title: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html><head><title>${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; font-size: 12px; line-height: 1.5; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      h2 { font-size: 14px; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
      .meta { color: #666; font-size: 11px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
      th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e5e5; }
      th { background: #f5f5f5; font-weight: 600; }
      .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 500; }
      .high { background: #fee2e2; color: #dc2626; }
      .medium { background: #fef3c7; color: #d97706; }
      .low { background: #dcfce7; color: #16a34a; }
      .section { margin-bottom: 16px; }
      @media print { body { padding: 20px; } }
    </style>
    </head><body>${html}</body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

export function exportCasePdf(caseData: Case, matches: Match[]) {
  const riskClass = caseData.rating === 'High' ? 'high' : caseData.rating === 'Medium' ? 'medium' : 'low';
  const html = `
    <h1>Case Report: ${caseData.name}</h1>
    <p class="meta">
      Case ID: ${caseData.id} &nbsp;|&nbsp; Entity: ${caseData.entityType} &nbsp;|&nbsp;
      Rating: <span class="badge ${riskClass}">${caseData.rating}</span> &nbsp;|&nbsp;
      Assignee: ${caseData.assignee} &nbsp;|&nbsp;
      Generated: ${new Date().toLocaleDateString()}
    </p>

    <h2>Screening Summary</h2>
    <table>
      <tr><th>Total Matches</th><th>Unresolved</th><th>Positive</th><th>Possible</th><th>False</th><th>Unknown</th></tr>
      <tr>
        <td>${matches.length}</td>
        <td>${caseData.unresolvedCount}</td>
        <td>${caseData.positiveCount}</td>
        <td>${caseData.possibleCount}</td>
        <td>${caseData.falseCount}</td>
        <td>${caseData.unknownCount}</td>
      </tr>
    </table>

    <h2>Screening Data</h2>
    <table>
      ${caseData.screeningData.dob ? `<tr><td>Date of Birth</td><td>${caseData.screeningData.dob}</td></tr>` : ''}
      ${caseData.screeningData.gender ? `<tr><td>Gender</td><td>${caseData.screeningData.gender}</td></tr>` : ''}
      ${caseData.screeningData.nationality ? `<tr><td>Nationality</td><td>${caseData.screeningData.nationality}</td></tr>` : ''}
      ${caseData.screeningData.country ? `<tr><td>Country</td><td>${caseData.screeningData.country}</td></tr>` : ''}
      ${caseData.screeningData.idType ? `<tr><td>${caseData.screeningData.idType}</td><td>${caseData.screeningData.idNumber || '—'}</td></tr>` : ''}
    </table>

    <h2>Match Details</h2>
    <table>
      <tr><th>ID</th><th>Name</th><th>Strength</th><th>Dataset</th><th>Status</th><th>Risk</th><th>Priority</th></tr>
      ${matches.map(m => `
        <tr>
          <td>${m.id}</td>
          <td>${m.matchedName}</td>
          <td>${m.strength}%</td>
          <td>${m.dataset}</td>
          <td>${m.status}</td>
          <td><span class="badge ${m.riskLevel.toLowerCase()}">${m.riskLevel}</span></td>
          <td>${m.priorityLevel}</td>
        </tr>
      `).join('')}
    </table>

    <h2>Audit Trail</h2>
    <table>
      <tr><th>Date</th><th>Type</th><th>Author</th><th>Description</th></tr>
      ${caseData.auditTrail.slice(0, 50).map(e => `
        <tr><td>${e.createdAt}</td><td>${e.type}</td><td>${e.author}</td><td>${e.text}</td></tr>
      `).join('')}
    </table>
  `;
  openPrintWindow(html, `Case Report - ${caseData.name}`);
}

export function exportMatchPdf(match: Match, caseName: string) {
  const riskClass = match.riskLevel === 'High' ? 'high' : match.riskLevel === 'Medium' ? 'medium' : 'low';
  const html = `
    <h1>Match Report: ${match.matchedName}</h1>
    <p class="meta">
      Match ID: ${match.id} &nbsp;|&nbsp; Case: ${caseName} &nbsp;|&nbsp;
      Dataset: ${match.dataset} &nbsp;|&nbsp;
      Risk: <span class="badge ${riskClass}">${match.riskLevel}</span> &nbsp;|&nbsp;
      Generated: ${new Date().toLocaleDateString()}
    </p>

    <h2>Match Overview</h2>
    <table>
      <tr><td>Status</td><td>${match.status}</td></tr>
      <tr><td>Strength</td><td>${match.strength}%</td></tr>
      <tr><td>Priority</td><td>${match.priorityLevel}</td></tr>
      <tr><td>Dataset</td><td>${match.dataset}</td></tr>
      <tr><td>Alert Date</td><td>${match.alertDate}</td></tr>
    </table>

    <h2>Why Matched</h2>
    <table>
      <tr><th>Field</th><th>Result</th><th>Detail</th></tr>
      ${match.whyMatched.map(w => `<tr><td>${w.field}</td><td>${w.result}</td><td>${w.detail}</td></tr>`).join('')}
    </table>

    <h2>Key Data</h2>
    <table>
      ${Object.entries(match.recordData.keyData).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
    </table>

    ${match.aliases.length > 0 ? `
    <h2>Aliases</h2>
    <ul>${match.aliases.map(a => `<li>${a}</li>`).join('')}</ul>
    ` : ''}

    ${match.resolutionHistory.length > 0 ? `
    <h2>Resolution History</h2>
    <table>
      <tr><th>Date</th><th>Status</th><th>Risk</th><th>Author</th><th>Reason</th></tr>
      ${match.resolutionHistory.map(r => `
        <tr><td>${r.createdAt}</td><td>${r.status}</td><td>${r.riskLevel}</td><td>${r.author}</td><td>${r.reason}</td></tr>
      `).join('')}
    </table>
    ` : ''}
  `;
  openPrintWindow(html, `Match Report - ${match.matchedName}`);
}
