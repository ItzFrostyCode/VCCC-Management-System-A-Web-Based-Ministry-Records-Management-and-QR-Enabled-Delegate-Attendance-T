import { ensureExcelJS, showExportProgress, hideExportProgress } from '../common-export.js';

/**
 * Export Audit Logs to Excel.
 * @param {Array} logs - Array of audit log objects: { actor, action, details, time }
 */
export async function exportAuditLogs(logs = []) {
  showExportProgress('Preparing audit log export…');
  await ensureExcelJS();

  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Activity Logs');

  // ── Column definitions ──────────────────────────────────────────────────
  worksheet.columns = [
    { header: '#',         key: 'no',      width: 6  },
    { header: 'ACTOR',     key: 'actor',   width: 28 },
    { header: 'ACTION',    key: 'action',  width: 30 },
    { header: 'DETAILS',   key: 'details', width: 60 },
    { header: 'TIMESTAMP', key: 'time',    width: 22 },
  ];

  // ── Header row styling ───────────────────────────────────────────────────
  const headerRow = worksheet.getRow(1);
  headerRow.height = 22;
  headerRow.font   = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.eachCell(cell => {
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border    = { bottom: { style: 'medium', color: { argb: 'FFB71C1C' } } };
  });

  // ── Data rows ────────────────────────────────────────────────────────────
  logs.forEach((log, i) => {
    const row = worksheet.addRow({
      no:      i + 1,
      actor:   log.actor   || 'System',
      action:  log.action  || '—',
      details: log.details || '—',
      time:    log.time
        ? new Date(log.time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        : '—',
    });

    row.height = 16;

    // Alternate row shading
    if (i % 2 === 0) {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
      });
    }

    row.eachCell({ includeEmpty: false }, cell => {
      cell.border    = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });

    // Center the # column
    row.getCell('no').alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // ── Download ─────────────────────────────────────────────────────────────
  showExportProgress('Generating file…');
  const buffer   = await workbook.xlsx.writeBuffer();
  const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `VCCC_Activity_Logs_${new Date().toISOString().split('T')[0]}.xlsx`;

  if (typeof saveAs !== 'undefined') {
    saveAs(blob, fileName);
  } else {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }

  showExportProgress('Export complete!');
  hideExportProgress(3000);
}
