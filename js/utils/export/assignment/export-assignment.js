import { ensureExcelJS, showExportProgress, hideExportProgress } from '../common-export.js';

// Status code → colored ARGB
const STATUS_COLORS = {
  active:      'FF1B5E20', // dark green
  ended:       'FF616161', // grey
  transferred: 'FF0D47A1', // dark blue
  pullout:     'FFB71C1C', // dark red
};

const STATUS_BG = {
  active:      'FFE8F5E9',
  ended:       'FFF5F5F5',
  transferred: 'FFE3F2FD',
  pullout:     'FFFCE4EC',
};

/**
 * Export Assignments list to Excel.
 * @param {Array} assignments - Array of mapped assignment records
 * @param {string} [title]    - Optional worksheet / file title suffix
 */
export async function exportAssignments(assignments = [], title = 'All') {
  showExportProgress('Preparing assignment export…');
  await ensureExcelJS();

  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Assignments');

  // ── Column definitions ──────────────────────────────────────────────────
  worksheet.columns = [
    { header: '#',           key: 'no',         width: 6  },
    { header: 'PASTOR',      key: 'pastor',      width: 30 },
    { header: 'CHURCH',      key: 'church',      width: 32 },
    { header: 'DISTRICT',    key: 'district',    width: 24 },
    { header: 'ROLE',        key: 'role',        width: 20 },
    { header: 'EVENT TYPE',  key: 'event_type',  width: 16 },
    { header: 'STATUS',      key: 'status',      width: 14 },
    { header: 'START DATE',  key: 'start_date',  width: 16 },
    { header: 'END DATE',    key: 'end_date',    width: 16 },
    { header: 'NOTES',       key: 'notes',       width: 40 },
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
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  assignments.forEach((a, i) => {
    const statusCode = (a.status_code || '').toLowerCase();
    const row = worksheet.addRow({
      no:         i + 1,
      pastor:     a.pastor_name   || a.pastors?.full_name   || '—',
      church:     a.church_name   || a.churches?.church_name || '—',
      district:   a.district_name || a.churches?.districts?.district_name || '—',
      role:       a.role_code     || '—',
      event_type: a.event_type    || '—',
      status:     (a.status_code  || '—').toUpperCase(),
      start_date: formatDate(a.start_date),
      end_date:   formatDate(a.end_date),
      notes:      a.notes         || '',
    });

    row.height = 16;

    // Alternate row background
    const bgColor = i % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';

    row.eachCell({ includeEmpty: false }, cell => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border    = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    });

    // Color-code the STATUS cell
    const statusCell = row.getCell('status');
    statusCell.font      = { bold: true, color: { argb: STATUS_COLORS[statusCode] || 'FF333333' } };
    statusCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_BG[statusCode] || 'FFFFFFFF' } };
    statusCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Center # column
    row.getCell('no').alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // ── Download ─────────────────────────────────────────────────────────────
  showExportProgress('Generating file…');
  const buffer   = await workbook.xlsx.writeBuffer();
  const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `VCCC_Assignments_${title}_${new Date().toISOString().split('T')[0]}.xlsx`;

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
